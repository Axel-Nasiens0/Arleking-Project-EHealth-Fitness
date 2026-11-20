import { Component, computed, inject, signal } from '@angular/core';
import type { OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonPopover,
  IonTitle,
  IonToggle,
  IonToolbar
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  chevronBackOutline,
  ellipsisHorizontalOutline,
  ellipsisVertical,
  fingerPrintOutline,
  heart,
  heartOutline,
  logOutOutline,
  moonOutline,
  refreshOutline,
  sunnyOutline,
  trashOutline,
  trophyOutline
} from 'ionicons/icons';

import { CorazonService } from '../services/corazon.service';
import type { RegistroCardiaco } from '../services/corazon.service';
import { ArlekingStateService } from '../services/arleking-state.service';

@Component({
  selector: 'app-corazon',
  templateUrl: './corazon.page.html',
  styleUrls: ['./corazon.page.scss'],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonBackButton,
    IonPopover,
    IonList,
    IonItem,
    IonLabel,
    IonToggle
  ]
})
export class CorazonPage implements OnDestroy {
  public state = inject(ArlekingStateService);
  private router = inject(Router);
  readonly corazonService = inject(CorazonService);

  readonly pantalla = signal<'inicial' | 'midiendo' | 'resultado'>('inicial');
  readonly lpmEnVivo = signal<number>(0);
  readonly progreso = signal<number>(0);
  readonly huellaDetectada = signal<boolean>(false);
  readonly medicionCancelada = signal<boolean>(false);
  readonly tiempoAcumuladoMs = signal<number>(0);
  readonly registroActual = signal<RegistroCardiaco | null>(null);

  readonly lpmFormateado = computed<string>(() => {
    const valor = this.lpmEnVivo();
    return valor > 0 ? valor.toString().padStart(2, '0') : '00';
  });

  readonly segundosRestantes = computed<number>(() => {
    const restanteMs = Math.max(0, this.DURACION_ESCANEO_MS - this.tiempoAcumuladoMs());
    return Math.ceil(restanteMs / 1000);
  });

  readonly posicionIndicadorRango = computed<number>(() => {
    const actual = this.registroActual();
    const valor = actual ? actual.lpm : 72;
    const clamped = Math.min(160, Math.max(40, valor));

    if (clamped <= 60) {
      return ((clamped - 40) / 20) * 33.33;
    }
    if (clamped <= 100) {
      return 33.33 + ((clamped - 60) / 40) * 33.33;
    }
    return 66.66 + ((clamped - 100) / 60) * 33.34;
  });

  private readonly DURACION_ESCANEO_MS = 12000;
  private intervaloEscaneo: ReturnType<typeof setInterval> | null = null;

  constructor() {
    addIcons({
      chevronBackOutline,
      ellipsisHorizontalOutline,
      ellipsisVertical,
      fingerPrintOutline,
      heart,
      heartOutline,
      trashOutline,
      refreshOutline,
      sunnyOutline,
      moonOutline,
      trophyOutline,
      logOutOutline
    });
  }

  ngOnDestroy(): void {
    this.detenerEscaneo();
  }

  iniciarMedicion(): void {
    this.detenerEscaneo();
    this.pantalla.set('midiendo');
    this.lpmEnVivo.set(0);
    this.progreso.set(0);
    this.huellaDetectada.set(false);
    this.medicionCancelada.set(false);
    this.tiempoAcumuladoMs.set(0);

    this.iniciarCronometroEscaneo();
  }

  iniciarHuella(event: Event): void {
    event.preventDefault();
    if (this.pantalla() !== 'midiendo') return;
    this.huellaDetectada.set(true);
    this.medicionCancelada.set(false);

    if ('vibrate' in navigator) {
      navigator.vibrate(45);
    }
  }

  soltarHuella(): void {
    this.huellaDetectada.set(false);
    if (this.tiempoAcumuladoMs() > 0) {
      this.cancelarPorRetiroDeHuella();
    }
  }

  verDetalleHistorial(item: RegistroCardiaco): void {
    this.registroActual.set(item);
    this.pantalla.set('resultado');
  }

  limpiarHistorial(): void {
    this.corazonService.limpiar();
    this.registroActual.set(null);
  }

  volverAlInicio(): void {
    this.detenerEscaneo();
    this.pantalla.set('inicial');
  }

  private cancelarPorRetiroDeHuella(): void {
    this.tiempoAcumuladoMs.set(0);
    this.progreso.set(0);
    this.lpmEnVivo.set(0);
    this.medicionCancelada.set(true);
  }

  private iniciarCronometroEscaneo(): void {
    const pasoMs = 100;
    this.intervaloEscaneo = setInterval(() => {
      if (!this.huellaDetectada()) {
        return;
      }

      const nuevoTiempo = this.tiempoAcumuladoMs() + pasoMs;
      this.tiempoAcumuladoMs.set(nuevoTiempo);
      this.progreso.set(Math.min(100, (nuevoTiempo / this.DURACION_ESCANEO_MS) * 100));

      const lpmActual = this.lpmEnVivo();
      if (lpmActual === 0) {
        this.lpmEnVivo.set(Math.floor(Math.random() * (80 - 70 + 1)) + 70);
      } else if (nuevoTiempo % 600 === 0) {
        const variacion = Math.floor(Math.random() * 5) - 2;
        this.lpmEnVivo.set(Math.min(92, Math.max(64, lpmActual + variacion)));
      }

      if (nuevoTiempo >= this.DURACION_ESCANEO_MS) {
        this.completarMedicion();
      }
    }, pasoMs);
  }

  private completarMedicion(): void {
    const actual = this.lpmEnVivo();
    const lpmFinal = (actual >= 48 && actual <= 165)
      ? actual
      : Math.floor(Math.random() * (84 - 68 + 1)) + 68;

    let estadoRango: 'Bajo' | 'En rango' | 'Elevado' = 'En rango';
    if (lpmFinal < 60) estadoRango = 'Bajo';
    else if (lpmFinal > 100) estadoRango = 'Elevado';

    const ahora = new Date();
    const diaMes = ahora.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
    const horaMin = ahora.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' });

    const nuevoRegistro: RegistroCardiaco = {
      id: Date.now(),
      lpm: lpmFinal,
      fecha: `Hoy, ${horaMin}`,
      fechaCorta: `${diaMes}, ${horaMin}`,
      estado: estadoRango
    };

    if ('vibrate' in navigator) {
      navigator.vibrate(80);
    }

    this.registroActual.set(nuevoRegistro);
    this.corazonService.guardar(nuevoRegistro);

    this.detenerEscaneo();
    this.pantalla.set('resultado');
  }

  private detenerEscaneo(): void {
    if (this.intervaloEscaneo) {
      clearInterval(this.intervaloEscaneo);
      this.intervaloEscaneo = null;
    }
  }

  private quitarFocoActivo(): void {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  async irAMetas(popover: IonPopover): Promise<void> {
    this.quitarFocoActivo();
    await popover.dismiss();
    this.router.navigateByUrl('/metas');
  }

  async cerrarSesion(popover: IonPopover): Promise<void> {
    this.quitarFocoActivo();
    await popover.dismiss();
    this.state.cerrarSesion();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}