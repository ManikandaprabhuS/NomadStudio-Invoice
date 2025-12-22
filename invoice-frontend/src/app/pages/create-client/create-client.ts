import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Client } from '../service/client';
import { AlertService } from '../service/alert.service';

@Component({
  selector: 'app-create-client',
  standalone: true,                // ✅ REQUIRED
  imports: [CommonModule, FormsModule],
  templateUrl: './create-client.html',
  styleUrl: './create-client.css',
})
export class CreateClient {

  client = {
    userName: '',
    phoneNumber: '',
    emailId: '',
    address: ''
  };
  loading = false;

  constructor(private clientService: Client, private router: Router, private alertService: AlertService) { }

  saveClient() {
    this.loading = true;
    this.clientService.createClient(this.client).subscribe({
      next: () => {
        this.alertService.success('Client saved successfully');
        this.loading = false;
        this.resetClient();  // if you have a method to clear the form
      },
      error: () => {
        this.alertService.error('Failed to save client');
        this.loading = false;
      }
    });
  }

  resetClient() {
    this.client = {
      userName: '',
      phoneNumber: '',
      emailId: '',
      address: ''
    };
  }

  viewAllClients() {
    // Navigate to the clients list page
    this.router.navigate(['/clients']); // adjust path as per your routing
  }

}
