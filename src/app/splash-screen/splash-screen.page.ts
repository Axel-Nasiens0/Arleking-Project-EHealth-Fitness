import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonContent, IonSpinner } from '@ionic/angular';

@Component({
  selector: 'app-splash-screen',
  templateUrl: './splash-screen.page.html',
  styleUrls: ['./splash-screen.page.scss'],
  imports: [IonContent, IonSpinner, CommonModule],
})
export class SplashScreenPage implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    // Redirige a la pantalla principal después de 3 segundos
    setTimeout(() => {
      this.router.navigateByUrl('/folder', { replaceUrl: true });
    }, 3000);
  }
}