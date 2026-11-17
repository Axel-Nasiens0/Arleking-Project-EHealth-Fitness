import { Component, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle, IonIcon, IonPopover, IonList, IonItem, IonLabel, IonToggle
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ellipsisHorizontalSharp, chevronBackOutline, trophyOutline, moonOutline, sunnyOutline } from 'ionicons/icons';
import * as L from 'leaflet';
import { ArlekingStateService } from '../services/arleking-state.service';

@Component({
  selector: 'app-pasos-detalle',
  templateUrl: './pasos-detalle.page.html',
  styleUrls: ['./pasos-detalle.page.scss'],
  standalone: true,
  imports: [
    CommonModule, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
    IonTitle, IonIcon, IonPopover, IonList, IonItem, IonLabel, IonToggle
  ]
})
export class PasosDetallePage implements OnInit, AfterViewInit {
  private map!: L.Map;
  private router = inject(Router);
  public state = inject(ArlekingStateService);
  protected Math = Math;

  caloriasMeta = 1350;
  tiempoMeta = 130;
  coloresBarras = ['bg-yellow', 'bg-beige', 'bg-brown', 'bg-beige', 'bg-green'];

  constructor() {
    addIcons({ ellipsisHorizontalSharp, chevronBackOutline, trophyOutline, moonOutline, sunnyOutline });
  }

  ngOnInit() {
    this.state.iniciarAcelerometro();
  }

  ngAfterViewInit() {
    this.initSatelliteMapWithGeolocation();
  }

  private initSatelliteMapWithGeolocation() {
    const defaultLat = 21.8469;
    const defaultLng = -102.7188;

    this.map = L.map('real-leaflet-map', { zoomControl: false }).setView([defaultLat, defaultLng], 15);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(this.map);

    setTimeout(() => this.map.invalidateSize(), 300);

    // Usar Leaflet locate() que maneja mejor los permisos en móvil y web
    this.map.locate({ setView: true, maxZoom: 17, enableHighAccuracy: true });

    this.map.on('locationfound', (e: L.LocationEvent) => {
      const userIcon = L.divIcon({
        className: 'custom-gps-marker',
        html: `<div class="gps-pulse"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
      });
      L.marker(e.latlng, { icon: userIcon }).addTo(this.map);
      setTimeout(() => this.map.invalidateSize(), 100);
    });
  }

  get esGoalAlcanzado(): boolean {
    return this.state.pasosActuales() >= this.state.pasosMetaDiaria();
  }

  async irAMetas(popover: IonPopover) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await popover.dismiss();
    this.router.navigateByUrl('/metas');
  }
}