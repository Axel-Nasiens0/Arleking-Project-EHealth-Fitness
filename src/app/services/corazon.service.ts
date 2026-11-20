import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ArlekingStateService } from './arleking-state.service';

export interface RegistroCardiaco {
    id: number;
    lpm: number;
    fecha: string;
    fechaCorta: string;
    estado: 'Bajo' | 'En rango' | 'Elevado';
}

@Injectable({
    providedIn: 'root'
})
export class CorazonService {
    private state = inject(ArlekingStateService);
    private readonly MAX_REGISTROS = 15;

    readonly historial = signal<RegistroCardiaco[]>([]);

    readonly ultimoLpm = computed<number | null>(() => {
        const lista = this.historial();
        return lista.length > 0 ? lista[0].lpm : null;
    });

    constructor() {
        // Recarga automáticamente el historial cardíaco cuando cambia el usuario logueado
        effect(() => {
        const correo = this.state.usuario()?.correo || 'default';
        const lista = this.cargarDesdeStorage(correo);
        this.historial.set(lista);

        // Si hoy ya tiene una medición registrada, sincroniza el signal global
        if (lista.length > 0 && lista[0].fecha.startsWith('Hoy')) {
            this.state.ritmoCardiaco.set(lista[0].lpm);
        } else {
            this.state.ritmoCardiaco.set(null);
        }
        }, { allowSignalWrites: true });
    }

    private getStorageKey(): string {
        const correo = this.state.usuario()?.correo || 'default';
        return `arleking_historial_cardiaco_${correo}`;
    }

    guardar(registro: RegistroCardiaco): void {
        this.historial.update(lista => [registro, ...lista].slice(0, this.MAX_REGISTROS));
        this.persistir();

        // Sincroniza con ArlekingStateService y con las gráficas (Día / Mes / Año)
        this.state.registrarRitmoCardiaco(registro.lpm);
    }

    limpiar(): void {
        this.historial.set([]);
        localStorage.removeItem(this.getStorageKey());
        this.state.ritmoCardiaco.set(null);
    }

    private persistir(): void {
        localStorage.setItem(this.getStorageKey(), JSON.stringify(this.historial()));
    }

    private cargarDesdeStorage(correo: string): RegistroCardiaco[] {
        const raw = localStorage.getItem(`arleking_historial_cardiaco_${correo}`);
        if (!raw) return [];
        try {
        return JSON.parse(raw) as RegistroCardiaco[];
        } catch {
        return [];
        }
    }
}