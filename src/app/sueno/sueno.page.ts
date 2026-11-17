import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';

@Component({
  selector: 'app-sueno',
  templateUrl: './sueno.page.html',
  styleUrls: ['./sueno.page.scss'],
  imports: [IonContent, IonHeader, IonTitle, IonToolbar, CommonModule, FormsModule],
})
export class SuenoPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
