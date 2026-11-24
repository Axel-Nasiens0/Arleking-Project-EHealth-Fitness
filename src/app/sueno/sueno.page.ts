import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonContent,
  IonHeader,
  IonToggle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonPopover,
  IonItem,
  IonList,
  IonIcon,
  IonLabel,
  IonTitle
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  ellipsisHorizontalSharp,
  chevronBackOutline,
  trophyOutline,
  moonOutline,
  sunnyOutline,
  bedOutline
} from 'ionicons/icons';
import { ArlekingStateService } from '../services/arleking-state.service';

interface DiaProgreso {
  key: string;
  dia: string;
  porcentaje: number;
  horas: number;
  minutos: number;
  rango: string;
  registrado: boolean;
}

@Component({
  selector: 'app-sueno',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonList,
    IonItem,
    IonToolbar,
    IonToggle,
    IonHeader,
    IonContent,
    IonButtons,
    IonBackButton,
    IonPopover,
    IonIcon,
    IonLabel,
    IonTitle
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sueno.page.html',
  styleUrls: ['./sueno.page.scss']
})
export class SuenoPage {
  private router = inject(Router);
  public state = inject(ArlekingStateService);

  viewMode = signal<'dashboard' | 'register'>('dashboard');

  hoyIndex: number = this.obtenerIndiceDiaHoy();
  selectedDayKey = this.obtenerClaveDiaHoy();
  fechaActual: string = this.formatearFecha();

  semana = signal<DiaProgreso[]>(this.cargarSemanaLocal());

  tempHoras = signal<number>(0);
  tempMinutos = signal<number>(0);
  tempPorcentaje = signal<number>(0);
  tempHoraInicio = signal<string>('');
  tempHoraFin = signal<string>('');
  warningMessage = signal<string>('');

  showManualInputs = signal<boolean>(false);
  manualHoraInicio = '23:00';
  manualHoraFin = '07:00';

  isDragging = false;

  constructor() {
    addIcons({
      ellipsisHorizontalSharp,
      chevronBackOutline,
      trophyOutline,
      moonOutline,
      sunnyOutline,
      bedOutline
    });
  }

  private obtenerIndiceDiaHoy(): number {
    const jsDay = new Date().getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  }

  private obtenerClaveDiaHoy(): string {
    const claves = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    return claves[this.obtenerIndiceDiaHoy()];
  }

  private obtenerFechaDeDiaSemana(key: string): Date {
    const claves = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
    const targetIdx = claves.indexOf(key);
    const hoy = new Date();
    const diffDias = targetIdx - this.hoyIndex;
    const fechaObjetivo = new Date(hoy);
    fechaObjetivo.setDate(hoy.getDate() + diffDias);
    return fechaObjetivo;
  }

  private crearSemanaInicial(): DiaProgreso[] {
    return [
      { key: 'lunes', dia: 'L', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
      { key: 'martes', dia: 'M', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
      { key: 'miercoles', dia: 'M', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
      { key: 'jueves', dia: 'J', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
      { key: 'viernes', dia: 'V', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
      { key: 'sabado', dia: 'S', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
      { key: 'domingo', dia: 'D', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false }
    ];
  }

  private cargarSemanaLocal(): DiaProgreso[] {
    const correo = this.state.usuario()?.correo || 'default';
    const semanaId = this.state.obtenerSemanaId();
    const raw = localStorage.getItem(`arleking_sueno_${correo}_${semanaId}`);
    const lista: DiaProgreso[] = raw ? JSON.parse(raw) : this.crearSemanaInicial();

    // Sincronizar el valor de hoy con el estado global y el historial si ya estaba registrado
    const hoyItem = lista.find(d => d.key === this.obtenerClaveDiaHoy());
    if (hoyItem && hoyItem.registrado) {
      const totalHorasDecimal = Number((hoyItem.horas + hoyItem.minutos / 60).toFixed(1));
      this.state.horasSueno.set(totalHorasDecimal);
    }

    return lista;
  }

  private guardarSemanaLocal(lista: DiaProgreso[]) {
    const correo = this.state.usuario()?.correo || 'default';
    const semanaId = this.state.obtenerSemanaId();
    localStorage.setItem(`arleking_sueno_${correo}_${semanaId}`, JSON.stringify(lista));
  }

  formatearFecha(fecha: Date = new Date()): string {
    const dia = fecha.getDate();
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    return `${dia} / ${meses[fecha.getMonth()]} / ${fecha.getFullYear()}`;
  }

  esDiaFuturo(index: number): boolean {
    return index > this.hoyIndex;
  }

  esDiaFuturoPorClave(key: string): boolean {
    const index = this.semana().findIndex(d => d.key === key);
    return index > this.hoyIndex;
  }

  esDiaPasado(index: number): boolean {
    return index < this.hoyIndex;
  }

  esDiaHoy(key: string): boolean {
    return key === this.obtenerClaveDiaHoy();
  }

  seleccionarDia(d: DiaProgreso, index: number) {
    if (this.esDiaFuturo(index)) {
      return;
    }
    this.selectedDayKey = d.key;
    const fechaDelDia = this.obtenerFechaDeDiaSemana(d.key);
    this.fechaActual = this.formatearFecha(fechaDelDia);
  }

  getDiaSeleccionado(): DiaProgreso {
    return this.semana().find(d => d.key === this.selectedDayKey) || this.semana()[0];
  }

  abrirRegistro() {
    const diaActual = this.getDiaSeleccionado();
    if (this.esDiaFuturoPorClave(diaActual.key) || diaActual.registrado) {
      return;
    }

    this.tempHoras.set(7);
    this.tempMinutos.set(0);
    this.tempPorcentaje.set(70);
    this.tempHoraInicio.set('11:00 pm');
    this.tempHoraFin.set('06:00 am');
    this.warningMessage.set('');
    this.showManualInputs.set(false);
    this.viewMode.set('register');
  }

  cancelarRegistro() {
    this.viewMode.set('dashboard');
  }

  guardarRegistro() {
    if (this.esDiaFuturoPorClave(this.selectedDayKey)) return;

    const h = this.tempHoras();
    const m = this.tempMinutos();
    if (h === 0 && m === 0) return;

    const porc = this.tempPorcentaje();
    const rangoStr = `${this.tempHoraInicio()} - ${this.tempHoraFin()}`;
    const totalHorasDecimal = Number((h + m / 60).toFixed(1));

    const nuevaSemana = this.semana().map(d => {
      if (d.key === this.selectedDayKey) {
        return {
          ...d,
          porcentaje: porc,
          horas: h,
          minutos: m,
          rango: rangoStr,
          registrado: true
        };
      }
      return d;
    });

    this.semana.set(nuevaSemana);
    this.guardarSemanaLocal(nuevaSemana);

    // Guardar en el historial unificado (para gráficas Día / Mes / Año y BD)
    const fechaDelRegistro = this.obtenerFechaDeDiaSemana(this.selectedDayKey);
    this.state.guardarMetricaEnHistorial(fechaDelRegistro, {
      horasSueno: totalHorasDecimal,
      rangoSueno: rangoStr
    });

    // Sincronizar con el Dashboard principal (folder) si se registró el día de hoy
    if (this.esDiaHoy(this.selectedDayKey)) {
      this.state.horasSueno.set(totalHorasDecimal);
    }

    this.viewMode.set('dashboard');
  }

  toggleManualInputs(event: Event) {
    event.stopPropagation();
    this.showManualInputs.update(v => !v);
  }

  aplicarHorasManuales() {
    if (!this.manualHoraInicio || !this.manualHoraFin) return;

    const [hStart, mStart] = this.manualHoraInicio.split(':').map(Number);
    const [hEnd, mEnd] = this.manualHoraFin.split(':').map(Number);
    const maxMinutes = 10 * 60;

    const startTotalMins = hStart * 60 + mStart;
    const endTotalMins = hEnd * 60 + mEnd;
    let rawDiffMins = endTotalMins - startTotalMins;
    if (rawDiffMins <= 0) rawDiffMins += 24 * 60;

    if (rawDiffMins > maxMinutes) {
      this.warningMessage.set('No es saludable. Se recomienda descansar de 7 a 9 horas.');
    } else {
      this.warningMessage.set('');
    }

    const clampedDiffMins = Math.min(Math.max(rawDiffMins, 0), maxMinutes);
    const finalHrs = Math.floor(clampedDiffMins / 60);
    const finalMins = clampedDiffMins % 60;

    this.tempHoras.set(finalHrs);
    this.tempMinutos.set(finalMins);
    this.tempPorcentaje.set(Math.min(Math.round((clampedDiffMins / maxMinutes) * 100), 100));

    const adjustedEndTotalMins = (startTotalMins + clampedDiffMins) % (24 * 60);
    const eH = Math.floor(adjustedEndTotalMins / 60);
    const eM = adjustedEndTotalMins % 60;

    this.tempHoraInicio.set(this.formatTime12h(hStart, mStart));
    this.tempHoraFin.set(this.formatTime12h(eH, eM));
    this.showManualInputs.set(false);
  }

  formatTime12h(h: number, m: number): string {
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h === 0 ? 12 : (h > 12 ? h - 12 : h);
    const mStr = m < 10 ? `0${m}` : `${m}`;
    return `${h12}:${mStr} ${ampm}`;
  }

  startDrag(event: PointerEvent) {
    if (this.showManualInputs()) return;
    this.isDragging = true;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.calcularAnguloDesdePointer(event);
  }

  onDrag(event: PointerEvent) {
    if (!this.isDragging) return;
    this.calcularAnguloDesdePointer(event);
  }

  stopDrag() {
    this.isDragging = false;
  }

  calcularAnguloDesdePointer(event: PointerEvent) {
    const target = event.currentTarget as HTMLElement;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const x = event.clientX - centerX;
    const y = event.clientY - centerY;

    let rad = Math.atan2(y, x) + Math.PI / 2;
    if (rad < 0) rad += 2 * Math.PI;

    let deg = rad * (180 / Math.PI);

    this.actualizarValoresPorAngulo(deg);
  }

  actualizarValoresPorAngulo(deg: number) {
    const maxMinutes = 10 * 60;
    const horasPrevias = this.tempHoras();

    // FILTRO DE TOPE SUAVE:
    // Si el usuario ya estaba en 10 horas y da un tirón brusco cruzando el origen (0°/360°),
    // determinamos si está intentando rebasar hacia adelante o regresar.
    let degAjustado = deg;
    if (horasHorasCercaDelTope(horasPrevias, deg)) {
      if (deg < 90 && horasPrevias >= 9) {
        degAjustado = 360; // Se mantiene al tope de 10 horas si sigue empujando hacia adelante
      }
    }

    const gradosFinales = Math.min(Math.max(degAjustado, 0), 360);
    const rawTotalMinutes = Math.round((gradosFinales / 360) * maxMinutes);

    if (rawTotalMinutes >= maxMinutes || gradosFinales >= 360) {
      this.warningMessage.set('No es saludable. Se recomienda descansar de 7 a 9 horas.');
    } else {
      this.warningMessage.set('');
    }

    const totalMinutes = Math.min(Math.max(rawTotalMinutes, 0), maxMinutes);
    const horas = Math.floor(totalMinutes / 60);
    const minutos = Math.round((totalMinutes % 60) / 15) * 15;

    let finalHoras = minutos === 60 ? horas + 1 : horas;
    let finalMinutos = minutos === 60 ? 0 : minutos;

    if (finalHoras >= 10 || gradosFinales >= 360) {
      finalHoras = 10;
      finalMinutos = 0;
    }

    const finalClampedMins = Math.min((finalHoras * 60) + finalMinutos, maxMinutes);
    const finalH = Math.floor(finalClampedMins / 60);
    const finalM = finalClampedMins % 60;

    this.tempPorcentaje.set(Math.min(Math.round((finalClampedMins / maxMinutes) * 100), 100));
    this.tempHoras.set(finalH);
    this.tempMinutos.set(finalM);

    const startMins = 23 * 60;
    const endMins = (startMins + finalClampedMins) % (24 * 60);
    this.tempHoraInicio.set('11:00 pm');
    this.tempHoraFin.set(this.formatTime12h(Math.floor(endMins / 60), endMins % 60));
  }

  getCircleDashOffset(): number {
    const circunferencia = 2 * Math.PI * 80;
    if (this.tempHoras() === 0 && this.tempMinutos() === 0) return circunferencia;
    const totalDecimal = this.tempHoras() + (this.tempMinutos() / 60);
    const progress = Math.min(Math.max(totalDecimal / 10, 0), 1);
    return circunferencia - (progress * circunferencia);
  }

  getCircleDashOffsetVal(porcentaje: number): number {
    const circunferencia = 2 * Math.PI * 18;
    return circunferencia - (porcentaje / 100) * circunferencia;
  }

  async irAMetas(popover: IonPopover) {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    await popover.dismiss();
    this.router.navigateByUrl('/metas');
  }
}

// Función auxiliar para validar si está al límite superior
function horasHorasCercaDelTope(horasPrevias: number, deg: number): boolean {
  return horasPrevias >= 9 && (deg < 30 || deg > 330);
}