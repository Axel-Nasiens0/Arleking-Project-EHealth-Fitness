import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PasosDetallePage } from './pasos-detalle.page';

describe('PasosDetallePage', () => {
  let component: PasosDetallePage;
  let fixture: ComponentFixture<PasosDetallePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PasosDetallePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
