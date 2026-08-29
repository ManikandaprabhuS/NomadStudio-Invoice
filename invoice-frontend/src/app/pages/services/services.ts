import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../service/alert.service';
import { ServiceCatalog, ServiceType } from '../service/service-catalog';

@Component({
  selector: 'app-services',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './services.html',
  styleUrl: './services.css',
})
export class Services implements OnInit {
  services: ServiceType[] = [];
  serviceName = '';
  editingService: ServiceType | null = null;
  loading = true;
  saving = false;

  constructor(
    private serviceCatalog: ServiceCatalog,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.loadServices();
  }

  loadServices(): void {
    this.loading = true;
    this.serviceCatalog.getServices().subscribe({
      next: services => {
        this.services = services;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.alertService.error('Failed to load services');
      }
    });
  }

  addService(): void {
    const name = this.serviceName.trim();
    if (!name || this.saving) return;

    this.saving = true;
    this.serviceCatalog.createService(name).subscribe({
      next: () => {
        this.serviceName = '';
        this.saving = false;
        this.alertService.success('Service added successfully');
        this.loadServices();
      },
      error: error => {
        this.saving = false;
        this.alertService.error(error.error?.message || 'Failed to add service');
      }
    });
  }

  editService(service: ServiceType): void {
    this.editingService = { ...service };
  }

  saveEdit(): void {
    const name = this.editingService?.name.trim();
    if (!this.editingService || !name || this.saving) return;

    this.saving = true;
    this.serviceCatalog.updateService(this.editingService._id, name).subscribe({
      next: () => {
        this.editingService = null;
        this.saving = false;
        this.alertService.success('Service updated successfully');
        this.loadServices();
      },
      error: error => {
        this.saving = false;
        this.alertService.error(error.error?.message || 'Failed to update service');
      }
    });
  }

  cancelEdit(): void {
    this.editingService = null;
  }

  deleteService(service: ServiceType): void {
    if (!confirm(`Are you sure you want to delete "${service.name}"?`)) return;

    this.serviceCatalog.deleteService(service._id).subscribe({
      next: () => {
        this.alertService.success('Service deleted successfully');
        this.loadServices();
      },
      error: () => this.alertService.error('Failed to delete service')
    });
  }
}
