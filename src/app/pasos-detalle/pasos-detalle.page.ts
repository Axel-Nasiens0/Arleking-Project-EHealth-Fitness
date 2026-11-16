import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonContent, 
  IonHeader, 
  IonToolbar, 
  IonButtons, 
  IonBackButton, 
  IonTitle, 
  IonIcon 
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { ellipsisHorizontalSharp, chevronBackOutline } from 'ionicons/icons';
import * as L from 'leaflet';

interface LecturaHoraria {
  hora: string;
  pasos: number;
  colorClass: string;
}

@Component({
  selector: 'app-pasos-detalle',
  templateUrl: './pasos-detalle.page.html',
  styleUrls: ['./pasos-detalle.page.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    IonContent, 
    IonHeader, 
    IonToolbar, 
    IonButtons, 
    IonBackButton, 
    IonTitle, 
    IonIcon
  ]
})
export class PasosDetallePage implements OnInit, AfterViewInit {
  private map!: L.Map;

  diasSemana = [
    { dia: 'L', goal: false },
    { dia: 'M', goal: false },
    { dia: 'M', goal: true },
    { dia: 'J', goal: true },
    { dia: 'V', goal: false },
    { dia: 'S', goal: false },
    { dia: 'D', goal: true }
  ];

  pasosActuales = 6150;
  pasosMeta = 16000;
  caloriasActuales = 398;
  caloriasMeta = 1350;
  tiempoActual = 99;
  tiempoMeta = 130;
  distanciaRecorrida = 4.7;

  distribucionHorarios: LecturaHoraria[] = [
    { hora: '06:00', pasos: 2507, colorClass: 'bg-yellow' },
    { hora: '10:00', pasos: 357, colorClass: 'bg-beige' },
    { hora: '02:00', pasos: 3298, colorClass: 'bg-brown' },
    { hora: '12:00', pasos: 132, colorClass: 'bg-beige' },
    { hora: '20:00', pasos: 100, colorClass: 'bg-green' }
  ];

  constructor() {
    addIcons({ ellipsisHorizontalSharp, chevronBackOutline });
  }

  ngOnInit() {}

  ngAfterViewInit() {
    this.initSatelliteMapWithGeolocation();
  }

  private initSatelliteMapWithGeolocation() {
    // Coordenadas por defecto (mientras obtiene la ubicación GPS real)
    const defaultLat = 21.8469;
    const defaultLng = -102.7188;

    // Inicializar mapa centrado en coordenadas iniciales
    this.map = L.map('real-leaflet-map', {
      zoomControl: false
    }).setView([defaultLat, defaultLng], 16);

    // 1. Capa de Imagen Satelital Esri World Imagery
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    }).addTo(this.map);

    // 2. Corregir el bug visual de renderizado al cargar la página en Ionic
    setTimeout(() => {
      this.map.invalidateSize();
    }, 300);

    // 3. Obtener ubicación en tiempo real del dispositivo
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;

          // Centrar el mapa satelital en la ubicación exacta del usuario
          this.map.setView([userLat, userLng], 17);

          // Marcador personalizado para la posición actual
          const userIcon = L.divIcon({
            className: 'custom-gps-marker',
            html: `<div class="gps-pulse"></div>`,
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          });

          L.marker([userLat, userLng], { icon: userIcon }).addTo(this.map);

          // Forzar reajuste visual una vez centrado
          setTimeout(() => {
            this.map.invalidateSize();
          }, 100);
        },
        (error) => {
          console.warn('No se pudo obtener la ubicación GPS, usando ubicación predeterminada:', error);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }

  get esGoalAlcanzado(): boolean {
    return this.pasosActuales >= this.pasosMeta && 
           this.caloriasActuales >= this.caloriasMeta && 
           this.tiempoActual >= this.tiempoMeta;
  }
}