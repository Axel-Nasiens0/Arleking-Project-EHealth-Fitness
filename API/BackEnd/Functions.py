from datetime import datetime
from flask import jsonify
from bson import ObjectId

from pymongo.mongo_client import MongoClient
import BackEnd.GlobalInfo.ResponseMessages as Messages
import BackEnd.GlobalInfo.Keys as ColabsKey

# Conexión a MongoDB Atlas usando Keys.py
if ColabsKey.dbconn is None:
    try:
        mongoConnect = MongoClient(ColabsKey.strConnection, serverSelectionTimeoutMS=5000)
        mongoConnect.admin.command('ping')
        ColabsKey.dbconn = mongoConnect[ColabsKey.strBDConnection]
        print("✅ ¡CONEXIÓN EXITOSA A MONGODB (ARLEKING)!")
    except Exception as err:
        print("❌ ERROR AL CONECTAR CON MONGODB:", err)

# Colecciones exactas de tu base de datos "arleking"
dbUsuarios = ColabsKey.dbconn["usuarios"] if ColabsKey.dbconn is not None else None
dbSueno = ColabsKey.dbconn["sueno"] if ColabsKey.dbconn is not None else None
dbPasos = ColabsKey.dbconn["pasos"] if ColabsKey.dbconn is not None else None


def _limpiar_correo(data: dict) -> str:
    correo = data.get("correo") or data.get("strCorreo") or ""
    return str(correo).strip().lower()


def _limpiar_nombre(data: dict) -> str:
    nombre = data.get("nombre") or data.get("strNombre") or ""
    return str(nombre).strip()


# ==============================================================================
# 1. USUARIOS (SOLO NOMBRE/APODO Y CORREO ELECTRÓNICO)
# ==============================================================================

def fnArlekingGetUsers():
    if dbUsuarios is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        usuarios = []
        for doc in dbUsuarios.find({}):
            doc["_id"] = str(doc["_id"])
            usuarios.append(doc)

        resp = Messages.succ200.copy()
        resp["Respuesta"] = usuarios
        return jsonify(resp), 200
    except Exception as e:
        print("Error en fnArlekingGetUsers:", e)
        return jsonify(Messages.err500), 500


def fnArlekingGetUserByEmail(strCorreo):
    if dbUsuarios is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        correo = str(strCorreo).strip().lower()
        usuario = dbUsuarios.find_one({"correo": correo})
        if not usuario:
            return jsonify({"error": "Usuario no encontrado"}), 404

        usuario["_id"] = str(usuario["_id"])
        return jsonify({"usuario": usuario}), 200
    except Exception as e:
        print("Error en fnArlekingGetUserByEmail:", e)
        return jsonify(Messages.err500), 500


def fnArlekingSyncUser(objData):
    """
    Login / registro sencillo por correo y nombre (o apodo):
    - Si el correo ya existe en 'usuarios', actualiza su nombre/apodo si viene uno nuevo.
    - Si no existe, inserta el nuevo usuario con insert_one.
    """
    if dbUsuarios is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        correo = _limpiar_correo(objData)
        if not correo:
            return jsonify({"error": "El correo electrónico es obligatorio"}), 400

        nombre = _limpiar_nombre(objData) or correo.split("@")[0]
        ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        existente = dbUsuarios.find_one({"correo": correo})

        if existente:
            cambios = {"actualizadoEn": ahora}
            if _limpiar_nombre(objData):
                cambios["nombre"] = nombre

            dbUsuarios.update_one({"_id": existente["_id"]}, {"$set": cambios})
            usuario = dbUsuarios.find_one({"_id": existente["_id"]})
            usuario["_id"] = str(usuario["_id"])
            return jsonify({"mensaje": "Sesión iniciada y usuario actualizado", "usuario": usuario}), 200

        nuevo_usuario = {
            "nombre": nombre,
            "correo": correo,
            "creadoEn": ahora,
            "actualizadoEn": ahora
        }
        resultado = dbUsuarios.insert_one(nuevo_usuario)
        nuevo_usuario["_id"] = str(resultado.inserted_id)
        return jsonify({"mensaje": "Usuario registrado correctamente", "usuario": nuevo_usuario}), 201
    except Exception as e:
        print("Error en fnArlekingSyncUser:", e)
        return jsonify(Messages.err500), 500


# ==============================================================================
# 2. REGISTRO DE SUEÑO (COLECCIÓN "sueno")
# ==============================================================================

def fnGetSuenoByEmail(strCorreo):
    if dbSueno is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        correo = str(strCorreo).strip().lower()
        registros = list(dbSueno.find({"correo": correo}).sort("fecha", -1))
        for reg in registros:
            reg["_id"] = str(reg["_id"])

        resp = Messages.succ200.copy()
        resp["Respuesta"] = registros
        return jsonify(resp), 200
    except Exception as e:
        print("Error en fnGetSuenoByEmail:", e)
        return jsonify(Messages.err500), 500


def fnUpsertSueno(objData):
    if dbSueno is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        correo = _limpiar_correo(objData)
        fecha = str(objData.get("fecha", "")).strip()
        if not correo or not fecha:
            return jsonify({"error": "Faltan correo o fecha"}), 400

        horas = min(max(int(objData.get("horas", 0)), 0), 10)
        minutos = min(max(int(objData.get("minutos", 0)), 0), 59)
        ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        datos_sueno = {
            "correo": correo,
            "fecha": fecha,
            "diaKey": str(objData.get("diaKey", "")),
            "horas": horas,
            "minutos": minutos,
            "porcentaje": int(objData.get("porcentaje", 0)),
            "rango": str(objData.get("rango", "")),
            "actualizadoEn": ahora
        }

        existente = dbSueno.find_one({"correo": correo, "fecha": fecha})
        if existente:
            dbSueno.update_one({"_id": existente["_id"]}, {"$set": datos_sueno})
            doc = dbSueno.find_one({"_id": existente["_id"]})
        else:
            datos_sueno["creadoEn"] = ahora
            res = dbSueno.insert_one(datos_sueno)
            doc = dbSueno.find_one({"_id": res.inserted_id})

        doc["_id"] = str(doc["_id"])
        return jsonify({"mensaje": "Registro de sueño guardado", "registro": doc}), 201
    except Exception as e:
        print("Error en fnUpsertSueno:", e)
        return jsonify(Messages.err500), 500


# ==============================================================================
# 3. REGISTRO DE PASOS (COLECCIÓN "pasos")
# ==============================================================================

def fnGetPasosByEmail(strCorreo):
    if dbPasos is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        correo = str(strCorreo).strip().lower()
        registros = list(dbPasos.find({"correo": correo}).sort("fecha", -1))
        for reg in registros:
            reg["_id"] = str(reg["_id"])

        resp = Messages.succ200.copy()
        resp["Respuesta"] = registros
        return jsonify(resp), 200
    except Exception as e:
        print("Error en fnGetPasosByEmail:", e)
        return jsonify(Messages.err500), 500


def fnUpsertPasos(objData):
    if dbPasos is None:
        return jsonify({"error": "Sin conexión a MongoDB"}), 503
    try:
        correo = _limpiar_correo(objData)
        fecha = str(objData.get("fecha", "")).strip()
        if not correo or not fecha:
            return jsonify({"error": "Faltan correo o fecha"}), 400

        pasos = max(int(objData.get("pasos", 0)), 0)
        calorias = objData.get("calorias")
        if calorias is None:
            calorias = round(pasos * 0.04)

        franjas = objData.get("pasosPorFranja")
        if not isinstance(franjas, list) or len(franjas) != 5:
            franjas = [0, 0, 0, 0, 0]

        ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        datos_pasos = {
            "correo": correo,
            "fecha": fecha,
            "semanaId": str(objData.get("semanaId", "")),
            "mesIndex": int(objData.get("mesIndex", datetime.now().month - 1)),
            "anio": int(objData.get("anio", datetime.now().year)),
            "pasos": pasos,
            "calorias": int(calorias),
            "tiempoMins": max(int(objData.get("tiempoMins", 0)), 0),
            "lpm": int(objData.get("lpm", 0)),
            "pasosPorFranja": [int(x) for x in franjas],
            "actualizadoEn": ahora
        }

        existente = dbPasos.find_one({"correo": correo, "fecha": fecha})
        if existente:
            dbPasos.update_one({"_id": existente["_id"]}, {"$set": datos_pasos})
            doc = dbPasos.find_one({"_id": existente["_id"]})
        else:
            datos_pasos["creadoEn"] = ahora
            res = dbPasos.insert_one(datos_pasos)
            doc = dbPasos.find_one({"_id": res.inserted_id})

        doc["_id"] = str(doc["_id"])
        return jsonify({"mensaje": "Registro de pasos guardado", "registro": doc}), 201
    except Exception as e:
        print("Error en fnUpsertPasos:", e)
        return jsonify(Messages.err500), 500