import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonIcon,
  IonPopover,
  IonList,
  IonItem,
  IonLabel,
  IonToggle
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  ellipsisVertical,
  moonOutline,
  sunnyOutline,
  trophyOutline,
  logOutOutline,
  flameOutline,
  footstepsOutline,
  timeOutline,
  heartOutline,
  bedOutline,
  phonePortraitOutline
} from 'ionicons/icons';
import { ArlekingStateService, RegistroDiarioDB } from '../services/arleking-state.service';

export type PeriodoGrafico = 'dia' | 'mes' | 'anio';

export interface MetricaChart {
  id: string;
  titulo: string;
  unidad: string;
  valorActual: string;
  color: string;
  bgSoft: string;
  icono: string;
  etiquetas: string[];
  valores: number[];
  maxVal: number;
}

@Component({
  selector: 'app-grafica',
  templateUrl: './grafica.page.html',
  styleUrls: ['./grafica.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonIcon,
    IonPopover,
    IonList,
    IonItem,
    IonLabel,
    IonToggle
  ]
})
export class GraficaPage {
  private router = inject(Router);
  public state = inject(ArlekingStateService);

  periodo = signal<PeriodoGrafico>('dia');

  constructor() {
    addIcons({
      ellipsisVertical,
      moonOutline,
      sunnyOutline,
      trophyOutline,
      logOutOutline,
      flameOutline,
      footstepsOutline,
      timeOutline,
      heartOutline,
      bedOutline,
      phonePortraitOutline
    });
  }

  cambiarPeriodo(nuevo: PeriodoGrafico) {
    this.periodo.set(nuevo);
  }

  // Consolida el historial de BD + todos los días registrados en el módulo de sueño de la semana actual + métricas de hoy
  private obtenerRegistrosConsolidados(): RegistroDiarioDB[] {
    const hoy = new Date();
    const fechaHoy = this.state.obtenerFechaISO(hoy);
    const correo = this.state.usuario()?.correo || 'default';
    const semanaId = this.state.obtenerSemanaId(hoy);

    const historial = [...this.state.obtenerHistorialDB()];

    // 1. Sincronizar todos los días de la semana actual guardados en sueno.page
    const rawSueno = localStorage.getItem(`arleking_sueno_${correo}_${semanaId}`);
    if (rawSueno) {
      const semanaSueno = JSON.parse(rawSueno);
      const jsDay = hoy.getDay();
      const hoyIdx = jsDay === 0 ? 6 : jsDay - 1;

      semanaSueno.forEach((diaItem: any, idx: number) => {
        if (diaItem && diaItem.registrado) {
          const fechaDia = new Date(hoy);
          fechaDia.setDate(hoy.getDate() + (idx - hoyIdx));
          const fechaDiaISO = this.state.obtenerFechaISO(fechaDia);
          const horasDecimal = Number((diaItem.horas + diaItem.minutos / 60).toFixed(2));

          const regExistenteIdx = historial.findIndex(r => r.fecha === fechaDiaISO);
          if (regExistenteIdx >= 0) {
            historial[regExistenteIdx] = {
              ...historial[regExistenteIdx],
              horasSueno: horasDecimal
            };
          } else {
            historial.push({
              fecha: fechaDiaISO,
              semanaId: this.state.obtenerSemanaId(fechaDia),
              mesIndex: fechaDia.getMonth(),
              anio: fechaDia.getFullYear(),
              calorias: 0,
              pasos: 0,
              tiempoMins: 0,
              lpm: 0,
              horasSueno: horasDecimal
            });
          }
        }
      });
    }

    // 2. Consolidar los signals activos del día de hoy
    const calsHoy = this.state.caloriasActuales();
    const pasosHoy = this.state.pasosActuales();
    const minsHoy = this.state.tiempoActivoMins();
    const lpmHoy = this.state.ritmoCardiaco() ?? 0;
    const suenoHoySignal = this.state.horasSueno();

    const idxHoy = historial.findIndex(r => r.fecha === fechaHoy);
    if (idxHoy >= 0) {
      historial[idxHoy] = {
        ...historial[idxHoy],
        calorias: Math.max(historial[idxHoy].calorias, calsHoy),
        pasos: Math.max(historial[idxHoy].pasos, pasosHoy),
        tiempoMins: Math.max(historial[idxHoy].tiempoMins, minsHoy),
        lpm: lpmHoy > 0 ? lpmHoy : historial[idxHoy].lpm,
        horasSueno: suenoHoySignal > 0 ? Math.max(historial[idxHoy].horasSueno, suenoHoySignal) : historial[idxHoy].horasSueno
      };
    } else if (calsHoy > 0 || pasosHoy > 0 || minsHoy > 0 || lpmHoy > 0 || suenoHoySignal > 0) {
      historial.push({
        fecha: fechaHoy,
        semanaId,
        mesIndex: hoy.getMonth(),
        anio: hoy.getFullYear(),
        calorias: calsHoy,
        pasos: pasosHoy,
        tiempoMins: minsHoy,
        lpm: lpmHoy,
        horasSueno: suenoHoySignal
      });
    }

    return historial;
  }

  graficas = computed<MetricaChart[]>(() => {
    const p = this.periodo();
    const hoy = new Date();
    const fechaHoy = this.state.obtenerFechaISO(hoy);
    const registros = this.obtenerRegistrosConsolidados();

    // ================= VISTA: DÍA (Por horas reales) =================
    if (p === 'dia') {
      const etiquetasHoras = ['04h', '08h', '12h', '16h', '20h', '23h'];
      const regHoy = registros.find(r => r.fecha === fechaHoy);

      const cals = regHoy?.calorias ?? 0;
      const pasos = regHoy?.pasos ?? 0;
      const mins = regHoy?.tiempoMins ?? 0;
      const lpm = regHoy?.lpm ?? 0;
      const sueno = Number((regHoy?.horasSueno ?? 0).toFixed(1));

      const horaActual = hoy.getHours();
      const slotActual = Math.min(Math.floor(horaActual / 4), 5);

      const distribuirActividad = (total: number): number[] => {
        const arr = [0, 0, 0, 0, 0, 0];
        if (total > 0) arr[slotActual] = total;
        return arr;
      };

      const valoresSueno = [0, sueno, 0, 0, 0, 0];

      return [
        {
          id: 'cals',
          titulo: 'Calorías Quemadas',
          unidad: 'kcal',
          valorActual: `${cals} kcal`,
          color: '#E91E63',
          bgSoft: 'rgba(233, 30, 99, 0.14)',
          icono: 'flame-outline',
          etiquetas: etiquetasHoras,
          valores: distribuirActividad(cals),
          maxVal: Math.max(500, cals)
        },
        {
          id: 'pasos',
          titulo: 'Pasos Realizados',
          unidad: 'pasos',
          valorActual: `${pasos.toLocaleString()} pasos`,
          color: '#26C6DA',
          bgSoft: 'rgba(38, 198, 218, 0.14)',
          icono: 'footsteps-outline',
          etiquetas: etiquetasHoras,
          valores: distribuirActividad(pasos),
          maxVal: Math.max(this.state.pasosMetaDiaria(), pasos)
        },
        {
          id: 'tiempo',
          titulo: 'Tiempo Activo',
          unidad: 'mins',
          valorActual: `${mins} mins`,
          color: '#7E57C2',
          bgSoft: 'rgba(126, 87, 194, 0.14)',
          icono: 'time-outline',
          etiquetas: etiquetasHoras,
          valores: distribuirActividad(mins),
          maxVal: Math.max(60, mins)
        },
        {
          id: 'lpm',
          titulo: 'Ritmo Cardíaco (LPM)',
          unidad: 'LPM',
          valorActual: lpm > 0 ? `${lpm} LPM` : '0 LPM',
          color: '#D4AF37',
          bgSoft: 'rgba(212, 175, 55, 0.16)',
          icono: 'heart-outline',
          etiquetas: etiquetasHoras,
          valores: distribuirActividad(lpm),
          maxVal: Math.max(120, lpm)
        },
        {
          id: 'sueno',
          titulo: 'Horas de Sueño',
          unidad: 'hrs',
          valorActual: `${sueno} hrs`,
          color: '#D94E34',
          bgSoft: 'rgba(217, 78, 52, 0.14)',
          icono: 'bed-outline',
          etiquetas: etiquetasHoras,
          valores: valoresSueno,
          maxVal: 10
        }
      ];
    }

    // ================= VISTA: MES (Total acumulado por semana del mes actual) =================
    if (p === 'mes') {
      const etiquetasSemanas = ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'];
      const mesActual = hoy.getMonth();
      const anioActual = hoy.getFullYear();

      const regsMes = registros.filter(r => r.mesIndex === mesActual && r.anio === anioActual);

      const calsSem = [0, 0, 0, 0];
      const pasosSem = [0, 0, 0, 0];
      const minsSem = [0, 0, 0, 0];
      const suenoSem = [0, 0, 0, 0];
      const lpmSuma = [0, 0, 0, 0];
      const lpmConteo = [0, 0, 0, 0];

      for (const r of regsMes) {
        const diaDelMes = Number(r.fecha.split('-')[2]);
        const semIdx = Math.min(Math.floor((diaDelMes - 1) / 7), 3);

        calsSem[semIdx] += r.calorias;
        pasosSem[semIdx] += r.pasos;
        minsSem[semIdx] += r.tiempoMins;
        suenoSem[semIdx] = Number((suenoSem[semIdx] + r.horasSueno).toFixed(2));

        if (r.lpm > 0) {
          lpmSuma[semIdx] += r.lpm;
          lpmConteo[semIdx]++;
        }
      }

      const lpmSem = lpmSuma.map((s, i) => (lpmConteo[i] > 0 ? Math.round(s / lpmConteo[i]) : 0));

      const totalCalsMes = calsSem.reduce((a, b) => a + b, 0);
      const totalPasosMes = pasosSem.reduce((a, b) => a + b, 0);
      const totalMinsMes = minsSem.reduce((a, b) => a + b, 0);
      const totalSuenoMes = Number(suenoSem.reduce((a, b) => a + b, 0).toFixed(1));

      const diasConLpm = lpmConteo.reduce((a, b) => a + b, 0);
      const promLpmMes = diasConLpm > 0 ? Math.round(lpmSuma.reduce((a, b) => a + b, 0) / diasConLpm) : 0;

      return [
        {
          id: 'cals',
          titulo: 'Calorías Quemadas',
          unidad: 'kcal',
          valorActual: `${totalCalsMes.toLocaleString()} kcal`,
          color: '#E91E63',
          bgSoft: 'rgba(233, 30, 99, 0.14)',
          icono: 'flame-outline',
          etiquetas: etiquetasSemanas,
          valores: calsSem,
          maxVal: Math.max(500, ...calsSem)
        },
        {
          id: 'pasos',
          titulo: 'Pasos Realizados',
          unidad: 'pasos',
          valorActual: `${totalPasosMes.toLocaleString()} pasos`,
          color: '#26C6DA',
          bgSoft: 'rgba(38, 198, 218, 0.14)',
          icono: 'footsteps-outline',
          etiquetas: etiquetasSemanas,
          valores: pasosSem,
          maxVal: Math.max(this.state.pasosMetaDiaria(), ...pasosSem)
        },
        {
          id: 'tiempo',
          titulo: 'Tiempo Activo',
          unidad: 'mins',
          valorActual: `${totalMinsMes} mins`,
          color: '#7E57C2',
          bgSoft: 'rgba(126, 87, 194, 0.14)',
          icono: 'time-outline',
          etiquetas: etiquetasSemanas,
          valores: minsSem,
          maxVal: Math.max(60, ...minsSem)
        },
        {
          id: 'lpm',
          titulo: 'Ritmo Cardíaco Promedio',
          unidad: 'LPM',
          valorActual: `${promLpmMes} LPM`,
          color: '#D4AF37',
          bgSoft: 'rgba(212, 175, 55, 0.16)',
          icono: 'heart-outline',
          etiquetas: etiquetasSemanas,
          valores: lpmSem,
          maxVal: Math.max(120, ...lpmSem)
        },
        {
          id: 'sueno',
          titulo: 'Horas de Sueño',
          unidad: 'hrs',
          valorActual: `${totalSuenoMes} hrs`,
          color: '#D94E34',
          bgSoft: 'rgba(217, 78, 52, 0.14)',
          icono: 'bed-outline',
          etiquetas: etiquetasSemanas,
          valores: suenoSem.map(v => Number(v.toFixed(1))),
          maxVal: Math.max(56, ...suenoSem) // Meta semanal: 7 días * 8h = 56h
        }
      ];
    }

    // ================= VISTA: AÑO (Total acumulado por mes del año actual) =================
    const etiquetasMeses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const anioActual = hoy.getFullYear();
    const regsAnio = registros.filter(r => r.anio === anioActual);

    const calsMes = new Array(12).fill(0);
    const pasosMes = new Array(12).fill(0);
    const minsMes = new Array(12).fill(0);
    const suenoMes = new Array(12).fill(0);
    const lpmSumaMes = new Array(12).fill(0);
    const lpmConteoMes = new Array(12).fill(0);

    for (const r of regsAnio) {
      const m = r.mesIndex;
      calsMes[m] += r.calorias;
      pasosMes[m] += r.pasos;
      minsMes[m] += r.tiempoMins;
      suenoMes[m] = Number((suenoMes[m] + r.horasSueno).toFixed(2));

      if (r.lpm > 0) {
        lpmSumaMes[m] += r.lpm;
        lpmConteoMes[m]++;
      }
    }

    const lpmAnio = lpmSumaMes.map((s, i) => (lpmConteoMes[i] > 0 ? Math.round(s / lpmConteoMes[i]) : 0));

    const totalCalsAnio = calsMes.reduce((a, b) => a + b, 0);
    const totalPasosAnio = pasosMes.reduce((a, b) => a + b, 0);
    const totalMinsAnio = minsMes.reduce((a, b) => a + b, 0);
    const totalSuenoAnio = Number(suenoMes.reduce((a, b) => a + b, 0).toFixed(1));

    const totalDiasLpm = lpmConteoMes.reduce((a, b) => a + b, 0);
    const promLpmAnio = totalDiasLpm > 0 ? Math.round(lpmSumaMes.reduce((a, b) => a + b, 0) / totalDiasLpm) : 0;

    return [
      {
        id: 'cals',
        titulo: 'Calorías Quemadas',
        unidad: 'kcal',
        valorActual: `${totalCalsAnio.toLocaleString()} kcal`,
        color: '#E91E63',
        bgSoft: 'rgba(233, 30, 99, 0.14)',
        icono: 'flame-outline',
        etiquetas: etiquetasMeses,
        valores: calsMes,
        maxVal: Math.max(500, ...calsMes)
      },
      {
        id: 'pasos',
        titulo: 'Pasos Realizados',
        unidad: 'pasos',
        valorActual: `${totalPasosAnio.toLocaleString()} pasos`,
        color: '#26C6DA',
        bgSoft: 'rgba(38, 198, 218, 0.14)',
        icono: 'footsteps-outline',
        etiquetas: etiquetasMeses,
        valores: pasosMes,
        maxVal: Math.max(this.state.pasosMetaDiaria(), ...pasosMes)
      },
      {
        id: 'tiempo',
        titulo: 'Tiempo Activo',
        unidad: 'mins',
        valorActual: `${totalMinsAnio} mins`,
        color: '#7E57C2',
        bgSoft: 'rgba(126, 87, 194, 0.14)',
        icono: 'time-outline',
        etiquetas: etiquetasMeses,
        valores: minsMes,
        maxVal: Math.max(60, ...minsMes)
      },
      {
        id: 'lpm',
        titulo: 'Ritmo Cardíaco Promedio',
        unidad: 'LPM',
        valorActual: `${promLpmAnio} LPM`,
        color: '#D4AF37',
        bgSoft: 'rgba(212, 175, 55, 0.16)',
        icono: 'heart-outline',
        etiquetas: etiquetasMeses,
        valores: lpmAnio,
        maxVal: Math.max(120, ...lpmAnio)
      },
      {
        id: 'sueno',
        titulo: 'Horas de Sueño',
        unidad: 'hrs',
        valorActual: `${totalSuenoAnio} hrs`,
        color: '#D94E34',
        bgSoft: 'rgba(217, 78, 52, 0.14)',
        icono: 'bed-outline',
        etiquetas: etiquetasMeses,
        valores: suenoMes.map(v => Number(v.toFixed(1))),
        maxVal: Math.max(240, ...suenoMes) // Meta mensual: 30 días * 8h = 240h
      }
    ];
  });

  calcularAlturaPorcentaje(valor: number, max: number): number {
    if (max <= 0 || valor <= 0) return 4;
    return Math.min(Math.max(Math.round((valor / max) * 100), 6), 100);
  }

  private quitarFocoActivo() {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }

  irAVistaMovil(popover: IonPopover) {
    this.quitarFocoActivo();
    popover.dismiss();
    this.router.navigateByUrl('/folder');
  }

  async irAMetas(popover: IonPopover) {
    this.quitarFocoActivo();
    await popover.dismiss();
    this.router.navigateByUrl('/metas');
  }

  async cerrarSesion(popover: IonPopover) {
    this.quitarFocoActivo();
    await popover.dismiss();
    this.state.cerrarSesion();
    this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}