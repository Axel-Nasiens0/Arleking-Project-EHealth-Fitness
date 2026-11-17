import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';
import { ArlekingStateService } from '../services/arleking-state.service';

@Component({
  selector: 'app-splash-screen',
  templateUrl: './splash-screen.page.html',
  styleUrls: ['./splash-screen.page.scss'],
  standalone: true,
  imports: [IonContent, IonSpinner, CommonModule],
})
export class SplashScreenPage implements OnInit {
  private router = inject(Router);
  private state = inject(ArlekingStateService);

  ngOnInit() {
    setTimeout(() => {
      // Si ya inició sesión antes en este teléfono, entra directo a /folder; si no, va a /login
      const destino = this.state.estaAutenticado() ? '/folder' : '/login';
      this.router.navigateByUrl(destino, { replaceUrl: true });
    }, 3000);
  }
}