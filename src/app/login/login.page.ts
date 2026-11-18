import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton } from '@ionic/angular';
import { ArlekingStateService } from '../services/arleking-state.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonContent, IonInput, IonButton]
})
export class LoginPage {
  private state = inject(ArlekingStateService);
  private router = inject(Router);

  nombre = '';
  correo = '';
  errorMsg = '';

  private esComputadora(): boolean {
    const anchoEscritorio = window.innerWidth >= 768;
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return anchoEscritorio && !esMovil;
  }

  entrar() {
    if (!this.correo || !this.correo.includes('@')) {
      this.errorMsg = 'Por favor ingresa un correo válido para respaldar tus récords.';
      return;
    }

    this.errorMsg = '';
    this.state.iniciarSesion(this.correo.trim(), this.nombre.trim());

    const destino = this.esComputadora() ? '/grafica' : '/folder';
    this.router.navigateByUrl(destino, { replaceUrl: true });
  }
}