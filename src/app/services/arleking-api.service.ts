import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SincronizarUsuarioPayload {
  correo: string;
  nombre: string;
  password?: string;
}

export interface UsuarioMongoDoc {
  _id?: string;
  nombre: string;
  correo: string;
  password?: string;
  creadoEn?: string;
  actualizadoEn?: string;
}

export interface RespuestaSyncUsuario {
  mensaje: string;
  usuario: UsuarioMongoDoc;
}

export interface RegistroSuenoPayload {
  correo: string;
  fecha: string;
  diaKey?: string;
  horas: number;
  minutos: number;
  porcentaje: number;
  rango: string;
}

export interface RegistroPasosPayload {
  correo: string;
  fecha: string;
  semanaId: string;
  mesIndex: number;
  anio: number;
  pasos: number;
  calorias?: number;
  tiempoMins: number;
  lpm?: number;
  pasosPorFranja?: number[];
}

@Injectable({
  providedIn: 'root'
})
export class ArlekingApiService {
  private http = inject(HttpClient);
  private readonly baseUrl = 'https://arleking-project-ehealth-fitness.onrender.com/arleking';

  registrarUsuario(payload: SincronizarUsuarioPayload): Observable<RespuestaSyncUsuario> {
    return this.http.post<RespuestaSyncUsuario>(`${this.baseUrl}/users/register`, payload);
  }

  iniciarSesionApi(
    payload: Partial<SincronizarUsuarioPayload> & { password: string }
  ): Observable<RespuestaSyncUsuario> {
    return this.http.post<RespuestaSyncUsuario>(`${this.baseUrl}/users/login`, payload);
  }

  sincronizarUsuario(payload: SincronizarUsuarioPayload): Observable<RespuestaSyncUsuario> {
    return this.http.post<RespuestaSyncUsuario>(`${this.baseUrl}/users/sync`, payload);
  }

  obtenerUsuarioPorCorreo(correo: string): Observable<{ usuario: UsuarioMongoDoc }> {
    const emailEncoded = encodeURIComponent(correo.trim().toLowerCase());
    return this.http.get<{ usuario: UsuarioMongoDoc }>(`${this.baseUrl}/users/email/${emailEncoded}`);
  }

  guardarSueno(payload: RegistroSuenoPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/sueno`, payload);
  }

  obtenerSuenoPorCorreo(correo: string): Observable<{ Respuesta?: unknown[] }> {
    const emailEncoded = encodeURIComponent(correo.trim().toLowerCase());
    return this.http.get<{ Respuesta?: unknown[] }>(`${this.baseUrl}/sueno/${emailEncoded}`);
  }

  guardarPasos(payload: RegistroPasosPayload): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/pasos`, payload);
  }

  obtenerPasosPorCorreo(correo: string): Observable<{ Respuesta?: unknown[] }> {
    const emailEncoded = encodeURIComponent(correo.trim().toLowerCase());
    return this.http.get<{ Respuesta?: unknown[] }>(`${this.baseUrl}/pasos/${emailEncoded}`);
  }
}