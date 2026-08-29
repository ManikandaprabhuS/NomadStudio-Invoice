import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Invoice } from '../service/invoice';

import { InvoiceTemplateComponent } from '../../shared/components/invoice-template/invoice-template.component';
import { AlertService } from '../service/alert.service';
import { QuickAddIncomeRecord, QuickAddIncomeService } from '../service/quick-add-income';

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  imports: [FormsModule, CommonModule, InvoiceTemplateComponent],
  templateUrl: './invoice-list.html',
  styleUrls: ['./invoice-list.css']
})
export class InvoiceList implements OnInit {

  invoices: any[] = [];
  filteredInvoices: any[] = [];
  paginatedInvoices: any[] = [];
  customerInvoices: QuickAddIncomeRecord[] = [];

  selectedInvoice: any = null;
  showPreview = false;
  selectedCustomerInvoice: QuickAddIncomeRecord | null = null;
  showCustomerPreview = false;

  searchTerm = '';
  selectedCount = 0;
  editingInvoice: any = null;

  pageSize = 4;
  currentPage = 1;
  totalPages = 1;

  constructor(
    private invoiceService: Invoice,
    private quickAddIncomeService: QuickAddIncomeService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.loadInvoices();
    this.loadCustomerInvoices();
  }

  loadCustomerInvoices() {
    this.quickAddIncomeService.getIncomes().subscribe({
      next: records => this.customerInvoices = records,
      error: () => this.alertService.error('Failed to load customer invoices')
    });
  }

  loadInvoices() {
    this.invoiceService.getInvoices().then((res: any[]) => {
      this.invoices = res.map(inv => ({ ...inv, selected: false }));
      this.filteredInvoices = [...this.invoices];
      this.calculatePagination();
    });
  }

  onSelectionChange() {
    this.selectedCount = this.invoices.filter(i => i.selected).length;
  }

  toggleSelectAll(event: any) {
    const checked = event.target.checked;
    this.paginatedInvoices.forEach(inv => inv.selected = checked);
    this.onSelectionChange();
  }

  applyFilter() {
    const term = this.searchTerm.toLowerCase();
    this.filteredInvoices = this.invoices.filter(inv =>
      inv.userName.toLowerCase().includes(term) ||
      inv.phoneNumber.includes(term)
    );
    this.calculatePagination();
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.filteredInvoices.length / this.pageSize);
    this.currentPage = 1;
    this.updatePage();
  }

  updatePage() {
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedInvoices = this.filteredInvoices.slice(start, start + this.pageSize);
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePage();
    }
  }
  printInvoice(){
    window.print();
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePage();
    }
  }

  /* ---------- PREVIEW ---------- */
  openPreview() {
    const selected = this.invoices.find(i => i.selected);
    if (!selected) {
      this.alertService.error('Select one invoice');
      return;
    }
    this.selectedInvoice = selected;
    this.showPreview = true;
  }

  closePreview() {
    this.showPreview = false;
  }

  viewBusinessInvoice(invoice: any) {
    this.selectedInvoice = invoice;
    this.showPreview = true;
  }

  viewCustomerInvoice(invoice: QuickAddIncomeRecord) {
    this.selectedCustomerInvoice = invoice;
    this.showCustomerPreview = true;
  }

  closeCustomerPreview() {
    this.showCustomerPreview = false;
    this.selectedCustomerInvoice = null;
  }

  /* ---------- PDF DOWNLOAD (FIXED FOR COMPLETE CONTENT) ---------- */
  async downloadPdf() {
    await new Promise(r => setTimeout(r, 300));

    const element = document.getElementById('invoice-pdf');
    if (!element) return;

    const html2pdf = (await import('html2pdf.js')).default;

    // Optimized options for complete content capture
    const options = {
      margin: 10, // 10mm margin
      filename: `Invoice-${this.selectedInvoice._id}.pdf`,
      image: {
        type: 'jpeg',
        quality: 0.98
      },
      html2canvas: {
        scale: 2,
        useCORS: true,
        logging: true
      },
      jsPDF: {
        unit: 'mm',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    const worker = html2pdf().set(options as any).from(element);

    worker.toPdf().get('pdf').then((pdf: any) => {
      const totalPages = pdf.internal.getNumberOfPages();

      // Add page numbers if multiple pages
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(9);
        pdf.setTextColor(128);
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pdf.internal.pageSize.getWidth() / 2,
          pdf.internal.pageSize.getHeight() - 5,
          { align: 'center' }
        );
      }

      worker.save();
    });
  }

  /* ---------- CSV EXPORT ---------- */
  exportCsv() {
    const selected = this.invoices.filter(i => i.selected);
    if (!selected.length) {
      this.alertService.error('No invoices selected');
      return;
    }

    const headers = ['Client Name', 'Phone', 'Invoice No', 'Date', 'Items (Name - Notes)', 'Total Amount', 'Received', 'Balance'];

    const rows = selected.map(inv => {
      // Format Date properly YYYY-MM-DD
      const dateObj = new Date(inv.createdAt);
      const dateStr = !isNaN(dateObj.getTime()) ? dateObj.toISOString().split('T')[0] : '';

      // Format Items: "ItemName (Notes) xQty"
      const itemsStr = inv.services.map((s: any) =>
        `${s.serviceType} ${s.notes ? '(' + s.notes + ')' : ''} x${s.quantity}`
      ).join('; ');

      return [
        inv.userName,
        inv.phoneNumber,
        inv._id,
        dateStr,
        itemsStr,
        inv.totalAmount,
        inv.receivedAmount,
        inv.balanceAmount
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'invoices_export.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  exportCustomerCsv() {
    if (!this.customerInvoices.length) {
      this.alertService.error('No customer invoices to export');
      return;
    }

    const rows = this.customerInvoices.map(income => [
      income._id,
      income.clientName,
      income.serviceType,
      income.amount,
      income.modeOfPayment,
      this.formatCsvDate(income.createdAt)
    ]);

    this.downloadCsv(
      'customer_invoices.csv',
      ['ID', 'Customer Name', 'Service Type', 'Amount', 'Payment Mode', 'Date'],
      rows
    );
  }

  exportBusinessCsv() {
    if (!this.filteredInvoices.length) {
      this.alertService.error('No business invoices to export');
      return;
    }

    const rows = this.filteredInvoices.map(inv => [
      inv._id,
      inv.userName,
      inv.phoneNumber,
      (inv.services || []).map((service: any) => service.serviceType).join('; '),
      inv.totalAmount,
      inv.receivedAmount,
      inv.balanceAmount,
      this.formatCsvDate(inv.createdAt)
    ]);

    this.downloadCsv(
      'business_invoices.csv',
      ['ID', 'Client Name', 'Phone', 'Services', 'Total Amount', 'Received Amount', 'Balance Amount', 'Date'],
      rows
    );
  }

  private formatCsvDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private downloadCsv(filename: string, headers: string[], rows: any[][]) {
    const escapeValue = (value: any) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csvContent = [
      headers.map(escapeValue).join(','),
      ...rows.map(row => row.map(escapeValue).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /* ---------- EDIT / DELETE ---------- */
  editInvoice(invoice: any) {
    this.editingInvoice = { ...invoice };
  }

  saveEdit() {
    if (!this.editingInvoice) return;

    this.invoiceService.updateInvoice(this.editingInvoice._id, this.editingInvoice).then(() => {
      this.alertService.success('Invoice updated successfully');
      this.editingInvoice = null;
      this.loadInvoices();
    }).catch(err => {
      console.error('Update failed', err);
      this.alertService.error('Failed to update invoice');
    });
  }

  cancelEdit() {
    this.editingInvoice = null;
  }

  deleteInvoice(id: string) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;

    this.invoiceService.deleteInvoice(id).then(() => {
      this.alertService.success('Invoice deleted successfully');
      this.loadInvoices();
    }).catch(err => {
      console.error('Delete failed', err);
      this.alertService.error('Failed to delete invoice');
    });
  }
}
