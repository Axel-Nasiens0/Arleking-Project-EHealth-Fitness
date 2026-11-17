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

export interface UsuarioArleking {
    correo: string;
    nombre: string;
    pasosHistoricos: number;
    pasosHoy: number;
    tiempoHoy: number;
    metaDiaria: number;
    pasosPorFranja: number[]; // [06:00, 10:00, 14:00, 18:00, 22:00]
    semana: DiaSemanaRegistro[];
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
    pasosMetaDiaria = signal<number>(16000);
    tiempoActivoMins = signal<number>(0);
    pasosPorFranja = signal<number[]>([0, 0, 0, 0, 0]);
    diasSemana = signal<DiaSemanaRegistro[]>(this.crearSemanaVacia());

    // Cálculos automáticos
    distanciaKm = computed(() => Number(((this.pasosActuales() * 0.75) / 1000).toFixed(2)));
    caloriasActuales = computed(() => Math.round(this.pasosActuales() * 0.04));

    // Datos pendientes de compañeros (en 0 / vacíos por ahora)
    ritmoCardiaco = signal<number | null>(null);
    horasSueno = signal<number>(0); // 0 Hrs hasta que se integre el módulo
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

        // Aplica inmediatamente al iniciar y cada vez que cambia
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
        this.pasosActuales.set(user.pasosHoy || 0);
        this.pasosHistoricos.set(user.pasosHistoricos || 0);
        this.tiempoActivoMins.set(user.tiempoHoy || 0);
        this.pasosMetaDiaria.set(user.metaDiaria || 16000);
        this.pasosPorFranja.set(user.pasosPorFranja || [0, 0, 0, 0, 0]);
        this.diasSemana.set(user.semana || this.crearSemanaVacia());
    }

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
        this.pasosActuales.update(p => p + 1);
        this.pasosHistoricos.update(h => h + 1);

        if (this.pasosActuales() % 100 === 0) {
        this.tiempoActivoMins.update(t => t + 1);
        }

        // Actualizar franja horaria actual
        const hora = new Date().getHours();
        const indiceFranja = hora < 9 ? 0 : hora < 13 ? 1 : hora < 17 ? 2 : hora < 21 ? 3 : 4;
        this.pasosPorFranja.update(arr => {
        const copia = [...arr];
        copia[indiceFranja] += 1;
        return copia;
        });

        // Actualizar día actual de la semana (0 = Lunes ... 6 = Domingo)
        const diaJavaScript = new Date().getDay();
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

        this.guardarProgresoLocal();
    }

    iniciarSesion(correo: string, nombre: string) {
        const respaldoPrevio = localStorage.getItem(`arleking_backup_${correo.toLowerCase()}`);
        let datosUsuario: UsuarioArleking;

        if (respaldoPrevio) {
        datosUsuario = JSON.parse(respaldoPrevio);
        } else {
        datosUsuario = {
            correo: correo.toLowerCase(),
            nombre: nombre || correo.split('@')[0],
            pasosHistoricos: 0,
            pasosHoy: 0,
            tiempoHoy: 0,
            metaDiaria: 16000,
            pasosPorFranja: [0, 0, 0, 0, 0],
            semana: this.crearSemanaVacia()
        };
        }

        this.usuario.set(datosUsuario);
        this.restaurarDatosEnSignals(datosUsuario);
        localStorage.setItem('arleking_active_session', JSON.stringify(datosUsuario));
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
        semana: this.diasSemana()
        };

        localStorage.setItem('arleking_active_session', JSON.stringify(actualizado));
        localStorage.setItem(`arleking_backup_${current.correo}`, JSON.stringify(actualizado));
    }

    setModoNoche(valor: boolean) {
        this.modoNoche.set(valor);
    }
}