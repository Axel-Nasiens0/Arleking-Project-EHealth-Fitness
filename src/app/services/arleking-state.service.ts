import { Injectable, signal, computed, effect } from '@angular/core';
import { Motion } from '@capacitor/motion';

export interface MetaLogro {
  id: string;
  titulo: string;
  descripcion: string;
  pasosRequeridos: number;
  desbloqueada: boolean;
  icono: string;
}

export interface DiaSemanaRegistro {
  dia: string;
  pasos: number;
  goal: boolean;
}

export interface RegistroDiarioDB {
  fecha: string;        // 'YYYY-MM-DD'
  semanaId: string;     // 'YYYY-Www'
  mesIndex: number;     // 0 - 11
  anio: number;         // ej. 2026
  calorias: number;
  pasos: number;
  tiempoMins: number;
  lpm: number;
  horasSueno: number;
  rangoSueno?: string;
}

export interface UsuarioArleking {
  correo: string;
  nombre: string;
  pasosHistoricos: number;
  pasosHoy: number;
  tiempoHoy: number;
  metaDiaria: number;
  pasosPorFranja: number[]; // [06:00, 10:00, 14:00, 18:00, 22:00]
  semana: DiaSemanaRegistro[];
  ultimaFechaISO?: string;
  ultimaSemanaId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ArlekingStateService {
  usuario = signal<UsuarioArleking | null>(this.cargarUsuarioLocal());
  estaAutenticado = computed(() => this.usuario() !== null);

  // Todo inicia en 0 hasta que haya actividad real
  pasosActuales = signal<number>(0);
  pasosHistoricos = signal<number>(0);
  pasosMetaDiaria = signal<number>(6000);
  tiempoActivoMins = signal<number>(0);
  pasosPorFranja = signal<number[]>([0, 0, 0, 0, 0]);
  diasSemana = signal<DiaSemanaRegistro[]>(this.crearSemanaVacia());

  // Cálculos automáticos
  distanciaKm = computed(() => Number(((this.pasosActuales() * 0.75) / 1000).toFixed(2)));
  caloriasActuales = computed(() => Math.round(this.pasosActuales() * 0.04));

  // Métricas complementarias
  ritmoCardiaco = signal<number | null>(null);
  horasSueno = signal<number>(0);
  horasSuenoMeta = 8;

  // Modo Noche persistente
  modoNoche = signal<boolean>(localStorage.getItem('arleking_dark_mode') === 'true');

  // Metas desbloqueables
  metas = computed<MetaLogro[]>(() => {
    const total = this.pasosHistoricos();
    return [
      { id: 'm1', titulo: 'Primeros Pasos', descripcion: 'Alcanza 1,000 pasos acumulados', pasosRequeridos: 1000, desbloqueada: total >= 1000, icono: 'footsteps' },
      { id: 'm2', titulo: 'Caminante Constante', descripcion: 'Alcanza 5,000 pasos acumulados', pasosRequeridos: 5000, desbloqueada: total >= 5000, icono: 'walk' },
      { id: 'm3', titulo: 'Atleta Urbano', descripcion: 'Alcanza 10,000 pasos acumulados', pasosRequeridos: 10000, desbloqueada: total >= 10000, icono: 'flame' },
      { id: 'm4', titulo: 'Medio Maratón', descripcion: 'Alcanza 20,000 pasos acumulados', pasosRequeridos: 20000, desbloqueada: total >= 20000, icono: 'medal' },
      { id: 'm5', titulo: 'Leyenda Arleking', descripcion: 'Alcanza 50,000 pasos acumulados', pasosRequeridos: 50000, desbloqueada: total >= 50000, icono: 'trophy' },
    ];
  });

  private umbralPico = 11.8;
  private ultimoPasoTimestamp = 0;
  private acelerometroActivo = false;

  constructor() {
    const user = this.usuario();
    if (user) {
      this.restaurarDatosEnSignals(user);
    }

    this.aplicarTema(this.modoNoche());
    effect(() => {
      this.aplicarTema(this.modoNoche());
    });
  }

  private aplicarTema(dark: boolean) {
    localStorage.setItem('arleking_dark_mode', String(dark));
    if (dark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  // ==================== UTILIDADES DE FECHA Y SEMANA ====================

  obtenerFechaISO(fecha: Date = new Date()): string {
    const y = fecha.getFullYear();
    const m = String(fecha.getMonth() + 1).padStart(2, '0');
    const d = String(fecha.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  obtenerSemanaId(fecha: Date = new Date()): string {
    const temp = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
    const dayNum = temp.getUTCDay() || 7;
    temp.setUTCDate(temp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((temp.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return `${temp.getUTCFullYear()}-W${weekNo < 10 ? '0' + weekNo : weekNo}`;
  }

  // ==================== HISTORIAL UNIFICADO PARA GRÁFICAS Y BD ====================

  obtenerHistorialDB(): RegistroDiarioDB[] {
    const correo = this.usuario()?.correo || 'default';
    const raw = localStorage.getItem(`arleking_historial_${correo}`);
    return raw ? JSON.parse(raw) : [];
  }

  guardarMetricaEnHistorial(fecha: Date, datosParciales: Partial<RegistroDiarioDB>) {
    const correo = this.usuario()?.correo || 'default';
    const fechaStr = this.obtenerFechaISO(fecha);
    const historial = this.obtenerHistorialDB();
    const idx = historial.findIndex(r => r.fecha === fechaStr);

    if (idx >= 0) {
      historial[idx] = { ...historial[idx], ...datosParciales };
    } else {
      historial.push({
        fecha: fechaStr,
        semanaId: this.obtenerSemanaId(fecha),
        mesIndex: fecha.getMonth(),
        anio: fecha.getFullYear(),
        calorias: 0,
        pasos: 0,
        tiempoMins: 0,
        lpm: 0,
        horasSueno: 0,
        ...datosParciales
      });
    }

    localStorage.setItem(`arleking_historial_${correo}`, JSON.stringify(historial));
  }

  // ==================== RESTAURACIÓN Y REINICIO POR CAMBIO DE DÍA/SEMANA ====================

  private crearSemanaVacia(): DiaSemanaRegistro[] {
    return [
      { dia: 'L', pasos: 0, goal: false },
      { dia: 'M', pasos: 0, goal: false },
      { dia: 'M', pasos: 0, goal: false },
      { dia: 'J', pasos: 0, goal: false },
      { dia: 'V', pasos: 0, goal: false },
      { dia: 'S', pasos: 0, goal: false },
      { dia: 'D', pasos: 0, goal: false }
    ];
  }

  private restaurarDatosEnSignals(user: UsuarioArleking) {
    const hoyISO = this.obtenerFechaISO();
    const semanaActualId = this.obtenerSemanaId();
    const esMismoDia = user.ultimaFechaISO === hoyISO;
    const esMismaSemana = user.ultimaSemanaId === semanaActualId;

    this.pasosHistoricos.set(user.pasosHistoricos || 0);
   const metaValida = (!user.metaDiaria || user.metaDiaria === 16000) ? 6000 : user.metaDiaria;
    this.pasosMetaDiaria.set(metaValida);

    this.pasosActuales.set(esMismoDia ? (user.pasosHoy || 0) : 0);
    this.tiempoActivoMins.set(esMismoDia ? (user.tiempoHoy || 0) : 0);
    this.pasosPorFranja.set(esMismoDia && user.pasosPorFranja ? user.pasosPorFranja : [0, 0, 0, 0, 0]);

    this.diasSemana.set(esMismaSemana && user.semana ? user.semana : this.crearSemanaVacia());

    this.sincronizarSuenoDeHoy(user.correo, semanaActualId);
  }

  private sincronizarSuenoDeHoy(correo: string, semanaId: string) {
    const rawSueno = localStorage.getItem(`arleking_sueno_${correo}_${semanaId}`);
    if (!rawSueno) {
      this.horasSueno.set(0);
      return;
    }

    const jsDay = new Date().getDay();
    const hoyIdx = jsDay === 0 ? 6 : jsDay - 1;
    const semanaSueno = JSON.parse(rawSueno);
    const diaHoy = semanaSueno[hoyIdx];

    if (diaHoy && diaHoy.registrado) {
      const totalHoras = Number((diaHoy.horas + diaHoy.minutos / 60).toFixed(1));
      this.horasSueno.set(totalHoras);
    } else {
      this.horasSueno.set(0);
    }
  }

  // ==================== ACELERÓMETRO Y REGISTRO DE PASOS ====================

  async iniciarAcelerometro() {
    if (this.acelerometroActivo) return;

    try {
      if (typeof (DeviceMotionEvent as any)?.requestPermission === 'function') {
        const estado = await (DeviceMotionEvent as any).requestPermission();
        if (estado !== 'granted') return;
      }

      await Motion.addListener('accel', (event) => {
        const { x, y, z } = event.accelerationIncludingGravity;
        const magnitud = Math.sqrt(x * x + y * y + z * z);
        const ahora = Date.now();

        if (magnitud > this.umbralPico && (ahora - this.ultimoPasoTimestamp) > 300) {
          this.ultimoPasoTimestamp = ahora;
          this.registrarNuevoPaso();
        }
      });

      this.acelerometroActivo = true;
    } catch (error) {
      console.warn('Acelerómetro esperando dispositivo móvil:', error);
    }
  }

  private registrarNuevoPaso() {
    const hoy = new Date();
    const semanaActualId = this.obtenerSemanaId(hoy);

    if (this.usuario()?.ultimaSemanaId && this.usuario()?.ultimaSemanaId !== semanaActualId) {
      this.diasSemana.set(this.crearSemanaVacia());
    }
    if (this.usuario()?.ultimaFechaISO && this.usuario()?.ultimaFechaISO !== this.obtenerFechaISO(hoy)) {
      this.pasosActuales.set(0);
      this.tiempoActivoMins.set(0);
      this.pasosPorFranja.set([0, 0, 0, 0, 0]);
    }

    this.pasosActuales.update(p => p + 1);
    this.pasosHistoricos.update(h => h + 1);

    if (this.pasosActuales() % 100 === 0) {
      this.tiempoActivoMins.update(t => t + 1);
    }

    const hora = hoy.getHours();
    const indiceFranja = hora < 9 ? 0 : hora < 13 ? 1 : hora < 17 ? 2 : hora < 21 ? 3 : 4;
    this.pasosPorFranja.update(arr => {
      const copia = [...arr];
      copia[indiceFranja] += 1;
      return copia;
    });

    const diaJavaScript = hoy.getDay();
    const indiceDia = diaJavaScript === 0 ? 6 : diaJavaScript - 1;
    this.diasSemana.update(sem => {
      const copia = [...sem];
      copia[indiceDia] = {
        ...copia[indiceDia],
        pasos: this.pasosActuales(),
        goal: this.pasosActuales() >= this.pasosMetaDiaria()
      };
      return copia;
    });

    this.guardarMetricaEnHistorial(hoy, {
      pasos: this.pasosActuales(),
      calorias: this.caloriasActuales(),
      tiempoMins: this.tiempoActivoMins()
    });

    this.guardarProgresoLocal();
  }

  // ==================== REGISTRO MANUAL / SENSORES EXTERNOS ====================

  registrarRitmoCardiaco(lpm: number) {
    this.ritmoCardiaco.set(lpm);
    this.guardarMetricaEnHistorial(new Date(), { lpm });
    this.guardarProgresoLocal();
  }

  sincronizarActividadHoy() {
    this.guardarMetricaEnHistorial(new Date(), {
      pasos: this.pasosActuales(),
      calorias: this.caloriasActuales(),
      tiempoMins: this.tiempoActivoMins(),
      lpm: this.ritmoCardiaco() ?? 0
    });
    this.guardarProgresoLocal();
  }

  // ==================== SESIÓN Y PERSISTENCIA ====================

  iniciarSesion(correo: string, nombre: string) {
    const correoNorm = correo.toLowerCase();
    const respaldoPrevio = localStorage.getItem(`arleking_backup_${correoNorm}`);
    let datosUsuario: UsuarioArleking;

    if (respaldoPrevio) {
      datosUsuario = JSON.parse(respaldoPrevio);
    } else {
      datosUsuario = {
        correo: correoNorm,
        nombre: nombre || correoNorm.split('@')[0],
        pasosHistoricos: 0,
        pasosHoy: 0,
        tiempoHoy: 0,
        metaDiaria: 6000,
        pasosPorFranja: [0, 0, 0, 0, 0],
        semana: this.crearSemanaVacia(),
        ultimaFechaISO: this.obtenerFechaISO(),
        ultimaSemanaId: this.obtenerSemanaId()
      };
    }

    this.usuario.set(datosUsuario);
    this.restaurarDatosEnSignals(datosUsuario);
    this.guardarProgresoLocal();
  }

  cerrarSesion() {
    this.guardarProgresoLocal();
    localStorage.removeItem('arleking_active_session');
    this.usuario.set(null);
  }

  private cargarUsuarioLocal(): UsuarioArleking | null {
    const raw = localStorage.getItem('arleking_active_session');
    return raw ? JSON.parse(raw) : null;
  }

  private guardarProgresoLocal() {
    const current = this.usuario();
    if (!current) return;

    const actualizado: UsuarioArleking = {
      ...current,
      pasosHoy: this.pasosActuales(),
      pasosHistoricos: this.pasosHistoricos(),
      tiempoHoy: this.tiempoActivoMins(),
      pasosPorFranja: this.pasosPorFranja(),
      semana: this.diasSemana(),
      ultimaFechaISO: this.obtenerFechaISO(),
      ultimaSemanaId: this.obtenerSemanaId()
    };

    this.usuario.set(actualizado);
    localStorage.setItem('arleking_active_session', JSON.stringify(actualizado));
    localStorage.setItem(`arleking_backup_${current.correo}`, JSON.stringify(actualizado));
  }

  setModoNoche(valor: boolean) {
    this.modoNoche.set(valor);
  }
}