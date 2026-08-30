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
  currentPage = 1;
  readonly pageSize = 4;
  totalPages = 1;
  pageNumbers: number[] = [1];
  paginatedServices: ServiceType[] = [];
  rangeStart = 0;
  rangeEnd = 0;

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
        this.currentPage = 1;
        this.updatePagination();
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

  private updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.services.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, index) => index + 1);
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedServices = this.services.slice(start, start + this.pageSize);
    this.rangeStart = this.services.length ? start + 1 : 0;
    this.rangeEnd = Math.min(start + this.pageSize, this.services.length);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  trackService(_index: number, service: ServiceType): string {
    return service._id;
  }
}
