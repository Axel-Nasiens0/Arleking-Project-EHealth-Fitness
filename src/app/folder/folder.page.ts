import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonTitle,
  IonContent,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonToggle
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ellipsisVertical, trophyOutline, moonOutline, sunnyOutline, logOutOutline } from 'ionicons/icons';
import { ArlekingStateService } from '../services/arleking-state.service';

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
    IonTitle,
    IonContent,
    IonIcon,
    IonPopover,
    IonList,
    IonItem,
    IonLabel,
    IonToggle
  ],
})
export class FolderPage implements OnInit {
  private router = inject(Router);
  public state = inject(ArlekingStateService);

  constructor() {
    addIcons({ ellipsisVertical, trophyOutline, moonOutline, sunnyOutline, logOutOutline });
  }

  ngOnInit() {
    this.state.iniciarAcelerometro();
  }

  get esGoalAlcanzado(): boolean {
    return this.state.pasosActuales() >= this.state.pasosMetaDiaria();
  }

  private quitarFocoActivo() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  irADetallePasos() {
    this.quitarFocoActivo();
    this.router.navigateByUrl('/pasos-detalle');
  }

  async irAMetas(popover: IonPopover) {
    this.quitarFocoActivo();
    await popover.dismiss();
    this.router.navigateByUrl('/metas');
  }

  irASueno() {
    this.quitarFocoActivo();
    this.router.navigateByUrl('/sueno');
  }

  async cerrarSesion(popover: IonPopover) {
    this.quitarFocoActivo();
    await popover.dismiss();
    this.state.cerrarSesion();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}