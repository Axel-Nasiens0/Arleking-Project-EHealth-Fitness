import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOutline, eyeOffOutline } from 'ionicons/icons';
import { finalize, timeout } from 'rxjs';
import { ArlekingStateService } from '../services/arleking-state.service';
import { ArlekingApiService } from '../services/arleking-api.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonButton, IonIcon]
})
export class LoginPage {
  private state = inject(ArlekingStateService);
  private api = inject(ArlekingApiService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  modo: 'login' | 'registro' = 'login';
  metodoLogin: 'correo' | 'usuario' = 'correo';
  nombre = '';
  correo = '';
  password = '';
  mostrarPassword = false;
  errorMsg = '';
  cargando = false;

  constructor() {
    addIcons({ eyeOutline, eyeOffOutline });
  }

  cambiarModo(nuevoModo: 'login' | 'registro') {
    this.modo = nuevoModo;
    this.password = '';
    this.mostrarPassword = false;
    this.errorMsg = '';
  }

  cambiarMetodoLogin(nuevoMetodo: 'correo' | 'usuario') {
    this.metodoLogin = nuevoMetodo;
    this.errorMsg = '';
  }

  toggleMostrarPassword() {
    this.mostrarPassword = !this.mostrarPassword;
  }

  private esComputadora(): boolean {
    const anchoEscritorio = window.innerWidth >= 768;
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return anchoEscritorio && !esMovil;
  }

  private resolverCorreoParaUsuario(username: string): string {
    const slug = username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '_');
    return `${slug || 'usuario'}@arleking.local`;
  }

  entrar() {
    if (this.cargando) return;

    const correoLimpio = this.correo.trim().toLowerCase();
    const nombreLimpio = this.nombre.trim();
    const passwordLimpia = this.password.trim();

    if (this.modo === 'registro') {
      if (!nombreLimpio) {
        this.errorMsg = 'Por favor ingresa un nombre o apodo para registrar tu perfil.';
        this.cdr.detectChanges();
        return;
      }
      if (!correoLimpio || !correoLimpio.includes('@')) {
        this.errorMsg = 'Por favor ingresa un correo válido para respaldar tus récords.';
        this.cdr.detectChanges();
        return;
      }
    } else {
      if (this.metodoLogin === 'correo') {
        if (!correoLimpio || !correoLimpio.includes('@')) {
          this.errorMsg = 'El usuario o contraseña son incorrectos o el usuario no existe.';
          this.cdr.detectChanges();
          return;
        }
      } else {
        if (!nombreLimpio) {
          this.errorMsg = 'El usuario o contraseña son incorrectos o el usuario no existe.';
          this.cdr.detectChanges();
          return;
        }
      }
    }

    if (!passwordLimpia) {
      this.errorMsg = this.modo === 'registro'
        ? 'Por favor ingresa una contraseña para crear tu cuenta.'
        : 'El usuario o contraseña son incorrectos o el usuario no existe.';
      this.cdr.detectChanges();
      return;
    }

    const correoFallback = this.modo === 'login' && this.metodoLogin === 'usuario'
      ? this.resolverCorreoParaUsuario(nombreLimpio)
      : correoLimpio;

    this.errorMsg = '';
    this.cargando = true;
    this.cdr.detectChanges();

    const peticion$ = this.modo === 'registro'
      ? this.api.registrarUsuario({
          nombre: nombreLimpio,
          correo: correoLimpio,
          password: passwordLimpia
        })
      : this.api.iniciarSesionApi({
          ...(this.metodoLogin === 'correo' ? { correo: correoLimpio } : { nombre: nombreLimpio }),
          password: passwordLimpia
        });

    peticion$
      .pipe(
        timeout(8000),
        finalize(() => {
          this.cargando = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (res) => {
          const usuarioDoc = res?.usuario;
          const correoSesion = (usuarioDoc?.correo || correoFallback).toLowerCase();
          const nombreSesion = usuarioDoc?.nombre || nombreLimpio || correoSesion.split('@')[0];

          this.state.iniciarSesion(correoSesion, nombreSesion, passwordLimpia);
          const destino = this.esComputadora() ? '/grafica' : '/folder';
          this.router.navigateByUrl(destino, { replaceUrl: true });
        },
        error: (err) => {
          console.error('Error en login/registro:', err);
          if (this.modo === 'login') {
            this.errorMsg = 'El usuario o contraseña son incorrectos o el usuario no existe.';
          } else {
            this.errorMsg = err?.error?.error || 'No se pudo crear la cuenta. Verifica los datos e intenta de nuevo.';
          }
          this.cdr.detectChanges();
        }
      });
  }
}