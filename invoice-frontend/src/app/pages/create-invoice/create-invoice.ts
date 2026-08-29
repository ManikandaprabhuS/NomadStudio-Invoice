import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Invoice } from '../service/invoice';
import { CommonModule } from '@angular/common';
import { AlertService } from '../service/alert.service';
import { ServiceCatalog, ServiceType } from '../service/service-catalog';

@Component({
  selector: 'app-create-invoice',
  standalone: true,                // ✅ REQUIRED
  imports: [CommonModule, FormsModule],
  templateUrl: './create-invoice.html',
  styleUrl: './create-invoice.css',
})
export class CreateInvoice implements OnInit {

  serviceTypes: ServiceType[] = [];

  invoice = {
    userName: '',
    phoneNumber: '',
    services: [
      {
        serviceType: '',
        quantity: 1,
        pricePerUnit: 0,
        amountCharged: 0,
        notes: ''
      }
    ],
    totalAmount: 0,
    receivedAmount: 0,
    balanceAmount: 0,
    generalNotes: '',
    ownerDetails: {
      companyName: 'Nomad Studio Pvt Ltd',
      ownerName: 'Suriya',
      phoneNumber: '+91 1234567890',
      address: 'Dharapuram Road, Oddanchatram-624619, Tamil Nadu',
    }
  };

  constructor(
    private invoiceService: Invoice,
    private router: Router,
    private alertService: AlertService,
    private serviceCatalog: ServiceCatalog
  ) { }

  ngOnInit(): void {
    this.serviceCatalog.getServices().subscribe({
      next: services => this.serviceTypes = services,
      error: () => this.alertService.error('Failed to load services')
    });
  }

  addService() {
    this.invoice.services.push({
      serviceType: '',
      quantity: 1,
      pricePerUnit: 0,
      amountCharged: 0,
      notes: ''
    });
  }

  removeService(index: number) {
    this.invoice.services.splice(index, 1);
    this.recalculate();
  }

  recalculate() {
    // service-wise calculation
    this.invoice.services.forEach(s => {
      s.amountCharged =
        (Number(s.quantity) || 0) * (Number(s.pricePerUnit) || 0);
    });

    // total
    this.invoice.totalAmount = this.invoice.services.reduce(
      (sum, s) => sum + s.amountCharged,
      0
    );

    // balance
    this.invoice.balanceAmount =
      this.invoice.totalAmount - (Number(this.invoice.receivedAmount) || 0);
  }

  saveInvoice() {
    // Validate Client Name
    if (!this.invoice.userName || this.invoice.userName.trim() === '') {
      this.alertService.error('Please enter client name');
      return;
    }

    // Validate Phone Number
    if (!this.invoice.phoneNumber || this.invoice.phoneNumber.trim() === '') {
      this.alertService.error('Please enter phone number');
      return;
    }

    // Validate at least one service exists
    if (!this.invoice.services || this.invoice.services.length === 0) {
      this.alertService.error('Please add at least one item to the invoice');
      return;
    }

    // Validate each service has required fields
    for (let i = 0; i < this.invoice.services.length; i++) {
      const service = this.invoice.services[i];

      if (!service.serviceType || service.serviceType === '') {
        this.alertService.error(`Please select a service type for item ${i + 1}`);
        return;
      }

      if (!service.quantity || service.quantity <= 0) {
        this.alertService.error(`Please enter a valid quantity for item ${i + 1}`);
        return;
      }

      if (!service.pricePerUnit || service.pricePerUnit <= 0) {
        this.alertService.error(`Please enter a valid price per unit for item ${i + 1}`);
        return;
      }
    }

    // Validate Received Amount
    if (this.invoice.receivedAmount === null || this.invoice.receivedAmount === undefined || this.invoice.receivedAmount < 0) {
      this.alertService.error('Please enter a valid received amount');
      return;
    }
    this.invoiceService.createInvoice(this.invoice)
      .then(() => {
        this.alertService.success('Invoice saved successfully');
      })
      .catch(() => {
        this.alertService.error('Failed to save invoice');
      });
  }

  clearInvoice() {
    this.invoice.userName = '';
    this.invoice.phoneNumber = '';
    this.invoice.services = [
      {
        serviceType: '',
        quantity: 1,
        pricePerUnit: 0,
        amountCharged: 0,
        notes: ''
      }
    ];
    this.invoice.totalAmount = 0;
    this.invoice.receivedAmount = 0;
    this.invoice.balanceAmount = 0;
    this.invoice.generalNotes = '';
  }

  goToList() {
    this.router.navigate(['/listinvoices']);
  }
}
