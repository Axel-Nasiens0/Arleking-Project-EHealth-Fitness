from flask import Flask, jsonify, request
from flask_cors import CORS

import BackEnd.Functions as CallMethod
import BackEnd.GlobalInfo.ResponseMessages as Messages

app = Flask(__name__)
CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"]
)

@app.route('/', methods=['GET'])
def index():
    return jsonify({"status": "OK", "app": "ARLEKING API"}), 200

@app.route('/test-db', methods=['GET'])
def test_db():
    try:
        if CallMethod.dbUsuarios is None:
            return jsonify({"status": "Error", "mensaje": "Sin conexión a MongoDB"}), 503
        total_usuarios = CallMethod.dbUsuarios.count_documents({})
        return jsonify({
            "status": "OK",
            "mensaje": "Conexión a MongoDB activa",
            "total_usuarios": total_usuarios
        }), 200
    except Exception as e:
        return jsonify({"status": "Error", "mensaje": str(e)}), 500

# ---------------- 1. RUTAS DE USUARIOS ----------------

@app.route('/arleking/users', methods=['GET'])
def arleking_get_users():
    try:
        return CallMethod.fnArlekingGetUsers()
    except Exception as e:
        print("Error en arleking_get_users:", e)
        return jsonify(Messages.err500), 500

@app.route('/arleking/users/register', methods=['POST'])
def arleking_register_user():
    try:
        return CallMethod.fnArlekingRegisterUser(request.get_json(silent=True) or {})
    except Exception as e:
        print("Error en arleking_register_user:", e)
        return jsonify(Messages.err500), 500

@app.route('/arleking/users/login', methods=['POST'])
def arleking_login_user():
    try:
        return CallMethod.fnArlekingLoginUser(request.get_json(silent=True) or {})
    except Exception as e:
        print("Error en arleking_login_user:", e)
        return jsonify(Messages.err500), 500

@app.route('/arleking/users/sync', methods=['POST'])
def arleking_sync_user():
    try:
        return CallMethod.fnArlekingSyncUser(request.get_json(silent=True) or {})
    except Exception as e:
        print("Error en arleking_sync_user:", e)
        return jsonify(Messages.err500), 500

@app.route('/arleking/users/email/<strCorreo>', methods=['GET'])
def arleking_get_user_by_email(strCorreo):
    try:
        return CallMethod.fnArlekingGetUserByEmail(strCorreo)
    except Exception as e:
        print("Error en arleking_get_user_by_email:", e)
        return jsonify(Messages.err500), 500

# ---------------- 2. RUTAS DE SUEÑO ----------------

@app.route('/arleking/sueno/<strCorreo>', methods=['GET'])
def arleking_get_sueno(strCorreo):
    try:
        return CallMethod.fnGetSuenoByEmail(strCorreo)
    except Exception as e:
        print("Error en arleking_get_sueno:", e)
        return jsonify(Messages.err500), 500

@app.route('/arleking/sueno', methods=['POST'])
def arleking_post_sueno():
    try:
        return CallMethod.fnUpsertSueno(request.get_json(silent=True) or {})
    except Exception as e:
        print("Error en arleking_post_sueno:", e)
        return jsonify(Messages.err500), 500

# ---------------- 3. RUTAS DE PASOS ----------------

@app.route('/arleking/pasos/<strCorreo>', methods=['GET'])
def arleking_get_pasos(strCorreo):
    try:
        return CallMethod.fnGetPasosByEmail(strCorreo)
    except Exception as e:
        print("Error en arleking_get_pasos:", e)
        return jsonify(Messages.err500), 500

@app.route('/arleking/pasos', methods=['POST'])
def arleking_post_pasos():
    try:
        return CallMethod.fnUpsertPasos(request.get_json(silent=True) or {})
    except Exception as e:
        print("Error en arleking_post_pasos:", e)
        return jsonify(Messages.err500), 500

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=True, threaded=True)