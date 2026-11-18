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

  private esComputadora(): boolean {
    const anchoEscritorio = window.innerWidth >= 768;
    const esMovil = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    return anchoEscritorio && !esMovil;
  }

  ngOnInit() {
    setTimeout(() => {
      if (this.state.estaAutenticado()) {
        const destino = this.esComputadora() ? '/grafica' : '/folder';
        this.router.navigateByUrl(destino, { replaceUrl: true });
      } else {
        this.router.navigateByUrl('/login', { replaceUrl: true });
      }
    }, 3000);
  }
}