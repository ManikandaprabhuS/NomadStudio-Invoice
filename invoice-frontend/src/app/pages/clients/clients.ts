import { Component, OnInit } from '@angular/core';
import { Client } from '../service/client';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../service/alert.service'; // Added import

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.html',
  styleUrl: './clients.css',
})
export class Clients {

  clients: any[] = [];
  loading = true;
  editingClient: any = null;
  paginatedClients: any[] = [];
  searchTerm = '';
  filteredClients: any[] = [];


  pageSize = 10;
  currentPage = 1;
  totalPages = 1;


  constructor(private clientService: Client, private alertService: AlertService) {

  }

  ngOnInit(): void {
    this.fetchClients();
  }

  fetchClients() {
    this.loading = true;
    this.clientService.getAllClients().subscribe({
      next: (data) => {
        this.clients = data;
        this.filteredClients = [...data]; // ✅
        this.setupPagination();
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching clients', err);
        this.loading = false;
      }
    });
  }


  setupPagination() {
    this.totalPages = Math.ceil(this.filteredClients.length / this.pageSize);
    this.currentPage = 1;
    this.updatePage();
  }

  applyFilter() {
    const term = this.searchTerm?.trim().toLowerCase();

    if (!term) {
      this.filteredClients = [...this.clients];
    } else {
      this.filteredClients = this.clients.filter(client =>
        (client.userName && client.userName.toLowerCase().includes(term)) ||
        (client.phoneNumber && client.phoneNumber.toString().includes(term))
      );

    }

    this.currentPage = 1;
    this.setupPagination();
    console.log('Search:', this.searchTerm);
    console.log('Filtered:', this.filteredClients.length);
  }



  updatePage() {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.paginatedClients = this.filteredClients.slice(start, end);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePage();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePage();
    }
  }

  editClient(client: any) {
    this.editingClient = { ...client }; // clone object for editing
  }

  saveEdit() {
    if (!this.editingClient) return;

    this.clientService.updateClient(this.editingClient._id, this.editingClient).subscribe({
      next: () => {
        this.alertService.success('Client updated successfully');
        this.editingClient = null;
        this.fetchClients();
      },
      error: () => {
        this.alertService.error('Failed to update client');
      }
    });
  }

  cancelEdit() {
    this.editingClient = null;
  }

  deleteClient(id: string) {
    if (!confirm('Are you sure you want to delete this client?')) return;

    this.clientService.deleteClient(id).subscribe({
      next: () => {
        this.alertService.success('Client deleted successfully');
        this.fetchClients();
      },
      error: () => {
        this.alertService.error('Failed to delete client');
      }
    });
  }

}
