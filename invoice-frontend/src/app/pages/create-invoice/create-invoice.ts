import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
export class CreateInvoice implements OnInit, OnDestroy {

  serviceTypes: ServiceType[] = [];
  clientLookupMessage = '';
  private clientLookupTimer?: ReturnType<typeof setTimeout>;
  private clientLookupRequestId = 0;
  invoiceType: 'Business' | 'Customer' = 'Business';

  invoice = {
    userName: '',
    phoneNumber: '',
    gstNumber: '',
    emailId: '',
    address: '',
    invoiceType: 'Business',
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
    modeOfPayment: '',
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
    private clientService: Client,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.invoiceType = this.route.snapshot.data['invoiceType'] === 'Customer' ? 'Customer' : 'Business';
    this.invoice.invoiceType = this.invoiceType;
    if (!this.isBusinessInvoice) this.invoice.gstNumber = '';
    this.serviceCatalog.getServices().subscribe({
      next: services => this.serviceTypes = services,
      error: () => this.alertService.error('Failed to load services')
    });
  }

  ngOnDestroy(): void {
    if (this.clientLookupTimer) clearTimeout(this.clientLookupTimer);
  }

  get isBusinessInvoice(): boolean {
    return this.invoiceType === 'Business';
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
    if (this.clientLookupTimer) clearTimeout(this.clientLookupTimer);
    this.clientLookupMessage = '';
    const phoneNumber = this.normalizePhone(this.invoice.phoneNumber);
    const gstNumber = this.isBusinessInvoice ? this.invoice.gstNumber.trim().toUpperCase() : '';
    if (phoneNumber.length < 10 && gstNumber.length < 15) return;

    const requestId = ++this.clientLookupRequestId;
    this.clientLookupTimer = setTimeout(() => {
      this.clientService.lookupBusinessClient(this.invoice.phoneNumber, gstNumber).subscribe({
        next: client => {
          if (requestId !== this.clientLookupRequestId) return;
          this.invoice.userName = client.userName || '';
          this.invoice.phoneNumber = client.phoneNumber || this.invoice.phoneNumber;
          this.invoice.gstNumber = this.isBusinessInvoice
            ? client.gstNumber || this.invoice.gstNumber
            : '';
          this.invoice.emailId = client.emailId || '';
          this.invoice.address = client.address || '';
          this.clientLookupMessage = 'Existing client details loaded.';
        },
        error: error => {
          if (requestId !== this.clientLookupRequestId) return;
          this.clientLookupMessage = error.status === 404
            ? 'No matching client found. Enter the details manually; they will be saved with this invoice.'
            : 'Client lookup failed. You can still enter the client details manually.';
        }
      });
    }, 300);
  }

  trackInvoiceService(_index: number, service: object): object {
    return service;
  }

  trackServiceType(_index: number, service: ServiceType): string {
    return service._id;
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

    if (this.isBusinessInvoice && (!this.invoice.gstNumber || this.invoice.gstNumber.trim() === '')) {
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
    if (!this.invoice.modeOfPayment) {
      this.alertService.error('Please select a payment mode');
      return;
    }
    this.invoice.gstNumber = this.isBusinessInvoice
      ? this.invoice.gstNumber.trim().toUpperCase()
      : '';
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
    this.invoice.invoiceType = this.invoiceType;
    this.invoice.emailId = '';
    this.invoice.address = '';
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
    this.invoice.modeOfPayment = '';
    this.invoice.balanceAmount = 0;
    this.invoice.generalNotes = '';
    this.clientLookupMessage = '';
  }

  goToList() {
    this.router.navigate(['/listinvoices']);
  }
}
