import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonMenuButton, 
  IonTitle, 
  IonContent, 
  IonIcon 
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ellipsisVertical, heart, bed, flame, footsteps } from 'ionicons/icons';

@Component({
  selector: 'app-folder',
  templateUrl: './folder.page.html',
  styleUrls: ['./folder.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonMenuButton, 
    IonTitle, 
    IonContent, 
    IonIcon
  ],
})
export class FolderPage {
  private router = inject(Router);

  // Datos reales o simulados del estado actual
  pasosActuales = 3670;
  pasosMeta = 16000;
  caloriasActuales = 400;
  tiempoMins = 67;

  ritmoCardiaco = 79; // LPM
  horasSueno = '7 Hrs';

  constructor() {
    addIcons({ ellipsisVertical, heart, bed, flame, footsteps });
  }

  get esGoalAlcanzado(): boolean {
    return this.pasosActuales >= this.pasosMeta;
  }

  irADetallePasos() {
    this.router.navigateByUrl('/pasos-detalle');
  }
}