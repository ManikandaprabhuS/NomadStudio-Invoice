import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Invoice } from '../service/invoice';
import { CommonModule } from '@angular/common';
import { AlertService } from '../service/alert.service';
import { ServiceCatalog, ServiceType } from '../service/service-catalog';
import { Client } from '../service/client';

@Component({
  selector: 'app-create-invoice',
  standalone: true,                // ✅ REQUIRED
  imports: [CommonModule, FormsModule],
  templateUrl: './create-invoice.html',
  styleUrl: './create-invoice.css',
})
export class CreateInvoice implements OnInit {

  serviceTypes: ServiceType[] = [];
  businessClients: any[] = [];
  clientsLoaded = false;
  clientLookupMessage = '';

  invoice = {
    userName: '',
    phoneNumber: '',
    gstNumber: '',
    emailId: '',
    services: [
      {
        serviceType: '',
        quantity: 1,
        pricePerUnit: 0,
        amountCharged: 0,
        notes: ''
      }
    ],
    subTotal: 0,
    cgstAmount: 0,
    sgstAmount: 0,
    roundOff: 0,
    totalAmount: 0,
    receivedAmount: 0,
    balanceAmount: 0,
    generalNotes: '',
    ownerDetails: {
      companyName: 'Nomad Studio Pvt Ltd',
      ownerName: 'Suriya',
      phoneNumber: '8015534983, 7598204583',
      emailId: 'nomadstudioodc@gmail.com',
      gstNumber: '33KXVPS2471D1ZX',
      address: 'Dharapuram Road, Oddanchatram-624619, Tamil Nadu',
    }
  };

  constructor(
    private invoiceService: Invoice,
    private router: Router,
    private alertService: AlertService,
    private serviceCatalog: ServiceCatalog,
    private clientService: Client
  ) { }

  ngOnInit(): void {
    this.serviceCatalog.getServices().subscribe({
      next: services => this.serviceTypes = services,
      error: () => this.alertService.error('Failed to load services')
    });
    this.clientService.getAllClients().subscribe({
      next: clients => {
        this.businessClients = clients;
        this.clientsLoaded = true;
        this.scheduleClientLookup();
      },
      error: () => {
        this.clientsLoaded = true;
        this.businessClients = [];
      }
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
      s.amountCharged = this.roundCurrency(
        (Number(s.quantity) || 0) * (Number(s.pricePerUnit) || 0)
      );
    });

    this.invoice.subTotal = this.roundCurrency(this.invoice.services.reduce(
      (sum, s) => sum + s.amountCharged,
      0
    ));
    this.invoice.cgstAmount = this.roundCurrency(this.invoice.subTotal * 0.09);
    this.invoice.sgstAmount = this.roundCurrency(this.invoice.subTotal * 0.09);
    const totalBeforeRoundOff = this.roundCurrency(
      this.invoice.subTotal + this.invoice.cgstAmount + this.invoice.sgstAmount
    );
    this.invoice.totalAmount = this.roundFinalAmount(totalBeforeRoundOff);
    this.invoice.roundOff = this.roundCurrency(this.invoice.totalAmount - totalBeforeRoundOff);

    this.invoice.balanceAmount = this.roundCurrency(
      this.invoice.totalAmount - (Number(this.invoice.receivedAmount) || 0)
    );
  }

  scheduleClientLookup() {
    this.clientLookupMessage = '';
    const phoneNumber = this.normalizePhone(this.invoice.phoneNumber);
    const gstNumber = this.invoice.gstNumber.trim().toUpperCase();
    if (phoneNumber.length < 10 && gstNumber.length < 15) return;

    const client = this.businessClients.find(item =>
      (phoneNumber.length >= 10 && this.normalizePhone(item.phoneNumber) === phoneNumber) ||
      (gstNumber.length === 15 && String(item.gstNumber || '').trim().toUpperCase() === gstNumber)
    );

    if (client) {
      this.invoice.userName = client.userName || '';
      this.invoice.phoneNumber = client.phoneNumber || this.invoice.phoneNumber;
      this.invoice.gstNumber = client.gstNumber || this.invoice.gstNumber;
      this.invoice.emailId = client.emailId || '';
      this.clientLookupMessage = 'Existing client details loaded.';
    } else if (this.clientsLoaded) {
      this.clientLookupMessage = 'No matching client found. This client will be saved when the invoice is created.';
    }
  }

  private normalizePhone(value: unknown): string {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }

  private roundCurrency(value: number): number {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
  }

  private roundFinalAmount(value: number): number {
    const wholeAmount = Math.floor(value);
    const decimalAmount = this.roundCurrency(value - wholeAmount);
    return decimalAmount <= 0.5 ? wholeAmount : wholeAmount + 1;
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

    if (!this.invoice.gstNumber || this.invoice.gstNumber.trim() === '') {
      this.alertService.error('Please enter GST number');
      return;
    }

    if (!this.invoice.emailId || this.invoice.emailId.trim() === '') {
      this.alertService.error('Please enter client email ID');
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
    this.invoice.gstNumber = this.invoice.gstNumber.trim().toUpperCase();
    this.invoice.emailId = this.invoice.emailId.trim();
    this.recalculate();
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
    this.invoice.gstNumber = '';
    this.invoice.emailId = '';
    this.invoice.services = [
      {
        serviceType: '',
        quantity: 1,
        pricePerUnit: 0,
        amountCharged: 0,
        notes: ''
      }
    ];
    this.invoice.subTotal = 0;
    this.invoice.cgstAmount = 0;
    this.invoice.sgstAmount = 0;
    this.invoice.roundOff = 0;
    this.invoice.totalAmount = 0;
    this.invoice.receivedAmount = 0;
    this.invoice.balanceAmount = 0;
    this.invoice.generalNotes = '';
    this.clientLookupMessage = '';
  }

  goToList() {
    this.router.navigate(['/listinvoices']);
  }
}
