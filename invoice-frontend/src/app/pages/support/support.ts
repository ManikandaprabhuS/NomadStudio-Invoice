import { Component } from '@angular/core';

@Component({
  selector: 'app-support',
  standalone: true,
  templateUrl: './support.html',
  styleUrl: './support.css',
})
export class Support {
  readonly whatsAppNumber = '+91 94861338235';
  readonly whatsAppUrl = 'https://wa.me/9194861338235';
  readonly supportEmail = 'manikandaprabhusiva@gmail.com';
  readonly emailUrl = `mailto:${this.supportEmail}`;
}
