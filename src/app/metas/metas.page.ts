import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonIcon
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  footsteps,
  walk,
  flame,
  medal,
  trophy,
  lockClosed,
  chevronBackOutline
} from 'ionicons/icons';
import { ArlekingStateService } from '../services/arleking-state.service';

@Component({
  selector: 'app-metas',
  templateUrl: './metas.page.html',
  styleUrls: ['./metas.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonIcon
  ]
})
export class MetasPage {
  public state = inject(ArlekingStateService);

  constructor() {
    addIcons({
      footsteps,
      walk,
      flame,
      medal,
      trophy,
      lockClosed,
      chevronBackOutline
    });
  }
}