import { Component, inject } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';
import { ArlekingStateService } from './services/arleking-state.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  standalone: true,
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  // Al inyectarlo aquí, se inicializa el tema (Modo Claro/Noche) y la sesión al arrancar la app
  private state = inject(ArlekingStateService);

  constructor() {}
}