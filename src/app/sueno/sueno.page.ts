import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonToggle, IonToolbar, IonButtons, IonBackButton, IonPopover, IonItem, IonList, IonIcon, IonLabel, IonTitle } from '@ionic/angular';
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
  imports: [IonList, IonItem, IonToolbar, IonToggle, IonHeader, CommonModule, FormsModule, RouterLink, IonContent, IonButtons, IonBackButton, IonPopover, IonIcon, IonLabel, IonTitle],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './sueno.page.html',
  styleUrls: ['./sueno.page.scss']
})
export class SuenoPage {
  private router = inject(Router);
  private arlekingState = inject(ArlekingStateService);

  viewMode = signal<'dashboard' | 'register'>('dashboard');
  selectedDayKey = 'lunes';

  // Fecha dinámica automática en español
  fechaActual: string = this.obtenerFechaActualFormateada();

  semana = signal<DiaProgreso[]>([
    { key: 'lunes', dia: 'L', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
    { key: 'martes', dia: 'M', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
    { key: 'miercoles', dia: 'M', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
    { key: 'jueves', dia: 'J', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
    { key: 'viernes', dia: 'V', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
    { key: 'sabado', dia: 'S', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false },
    { key: 'domingo', dia: 'D', porcentaje: 0, horas: 0, minutos: 0, rango: '', registrado: false }
  ]);

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

  obtenerFechaActualFormateada(): string {
    const hoy = new Date();
    const dia = hoy.getDate();
    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const mes = meses[hoy.getMonth()];
    const anio = hoy.getFullYear();
    return `${dia} / ${mes} / ${anio}`;
  }

  seleccionarDia(d: DiaProgreso) {
    this.selectedDayKey = d.key;
  }

  getDiaSeleccionado(): DiaProgreso {
    return this.semana().find(d => d.key === this.selectedDayKey) || this.semana()[0];
  }

  abrirRegistro() {
    const diaActual = this.getDiaSeleccionado();
    if (diaActual.registrado) return;

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
    const h = this.tempHoras();
    const m = this.tempMinutos();
    if (h === 0 && m === 0) return;

    const porc = this.tempPorcentaje();
    const rangoStr = `${this.tempHoraInicio()} - ${this.tempHoraFin()}`;

    this.semana.update(list => 
      list.map(d => {
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
      })
    );

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

    const maxMinutes = 10 * 60; // Límite de 10 horas

    const startTotalMins = hStart * 60 + mStart;
    const endTotalMins = hEnd * 60 + mEnd;
    let rawDiffMins = endTotalMins - startTotalMins;
    if (rawDiffMins <= 0) {
      rawDiffMins += 24 * 60;
    }

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

    // BARRERA ANTIRREBOTE: Si ya está en 8+ horas y el cursor cruza bruscamente el eje, lo fijamos en 360
    const horasActuales = this.tempHoras();
    if (horasActuales >= 8 && (deg < 90 || deg > 270)) {
      deg = 360;
    }

    this.actualizarValoresPorAngulo(deg);
  }

  actualizarValoresPorAngulo(deg: number) {
    const maxMinutes = 10 * 60; // 10 horas máximo
    const horasActuales = this.tempHoras();

    let degLimitado = deg;
    if (horasActuales >= 8 && deg < 180) {
      degLimitado = 360;
    } else if (deg > 360 || (horasActuales >= 9 && deg < 270)) {
      degLimitado = 360;
    }

    const gradosFinales = Math.min(Math.max(degLimitado, 0), 360);
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

    // Tope estricto de seguridad a 10 horas 0 minutos
    if (finalHoras >= 10 || gradosFinales >= 360) {
      finalHoras = 10;
      finalMinutos = 0;
    }

    const finalClampedMins = Math.min((finalHoras * 60) + finalMinutos, maxMinutes);
    const finalH = Math.floor(finalClampedMins / 60);
    const finalM = finalClampedMins % 60;

    const porcentaje = Math.min(Math.round((finalClampedMins / maxMinutes) * 100), 100);
    this.tempPorcentaje.set(porcentaje);

    this.tempHoras.set(finalH);
    this.tempMinutos.set(finalM);

    const startMins = 23 * 60; 
    let endMins = (startMins + finalClampedMins) % (24 * 60);

    const endHour24 = Math.floor(endMins / 60);
    const endMin = endMins % 60;

    this.tempHoraInicio.set('11:00 pm');
    this.tempHoraFin.set(this.formatTime12h(endHour24, endMin));
  }

  getCircleDashOffset(): number {
    const circunferencia = 2 * Math.PI * 80;
    if (this.tempHoras() === 0 && this.tempMinutos() === 0) {
      return circunferencia;
    }
    const totalDecimal = this.tempHoras() + (this.tempMinutos() / 60);
    const progress = Math.min(Math.max(totalDecimal / 10, 0), 1);
    return circunferencia - (progress * circunferencia);
  }

  getCircleDashOffsetVal(porcentaje: number): number {
    const circunferencia = 2 * Math.PI * 18;
    return circunferencia - (porcentaje / 100) * circunferencia;
  }
}