import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Invoice } from '../service/invoice';

import { InvoiceTemplateComponent } from '../../shared/components/invoice-template/invoice-template.component';
import { AlertService } from '../service/alert.service';
import { QuickAddIncomeRecord, QuickAddIncomeService } from '../service/quick-add-income';
import { jsPDF } from 'jspdf';

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
  filteredCustomerInvoices: QuickAddIncomeRecord[] = [];

  selectedInvoice: any = null;
  showPreview = false;
  selectedCustomerInvoice: QuickAddIncomeRecord | null = null;
  showCustomerPreview = false;

  searchTerm = '';
  customerPaymentFilter: '' | 'Online' | 'Cash' = '';
  customerDateFilter = '';
  showCustomerFilters = false;
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
      next: records => {
        this.customerInvoices = records;
        this.applyCustomerFilter();
      },
      error: () => this.alertService.error('Failed to load customer invoices')
    });
  }

  loadInvoices() {
    this.invoiceService.getInvoices().then((res: any[]) => {
      this.invoices = res.map(inv => ({
        ...inv,
        balanceAmount: this.calculateBalance(inv),
        selected: false
      }));
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
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredInvoices = this.invoices.filter(inv =>
      String(inv.userName || '').toLowerCase().includes(term) ||
      String(inv.phoneNumber || '').toLowerCase().includes(term) ||
      String(inv._id || '').toLowerCase().includes(term)
    );
    this.calculatePagination();
  }

  applyCustomerFilter() {
    this.filteredCustomerInvoices = this.customerInvoices.filter(invoice => {
      const matchesPayment = !this.customerPaymentFilter ||
        invoice.modeOfPayment === this.customerPaymentFilter;
      const matchesDate = !this.customerDateFilter ||
        this.formatLocalDateKey(invoice.createdAt) === this.customerDateFilter;
      return matchesPayment && matchesDate;
    });
  }

  clearCustomerFilters() {
    this.customerPaymentFilter = '';
    this.customerDateFilter = '';
    this.applyCustomerFilter();
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

  private formatCsvDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }

  private formatLocalDateKey(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  generateCustomerReport() {
    if (!this.filteredCustomerInvoices.length) {
      this.alertService.error('No customer invoices available for this report');
      return;
    }

    this.downloadTableReport(
      'Customer Invoice Report',
      ['ID', 'Customer', 'Service', 'Amount', 'Payment', 'Date'],
      this.filteredCustomerInvoices.map(invoice => [
        invoice._id,
        invoice.clientName,
        invoice.serviceType,
        `INR ${Number(invoice.amount || 0).toFixed(2)}`,
        invoice.modeOfPayment,
        this.formatCsvDate(invoice.createdAt)
      ]),
      'customer-invoice-report'
    );
  }

  generateBusinessReport() {
    if (!this.filteredInvoices.length) {
      this.alertService.error('No business invoices available for this report');
      return;
    }

    this.downloadTableReport(
      'Business Invoice Report',
      ['ID', 'Client', 'Phone', 'Total', 'Paid', 'Balance', 'Date'],
      this.filteredInvoices.map(invoice => [
        invoice._id,
        invoice.userName,
        invoice.phoneNumber,
        `INR ${Number(invoice.totalAmount || 0).toFixed(2)}`,
        `INR ${Number(invoice.receivedAmount || 0).toFixed(2)}`,
        `INR ${this.calculateBalance(invoice).toFixed(2)}`,
        this.formatCsvDate(invoice.createdAt)
      ]),
      'business-invoice-report'
    );
  }

  private downloadTableReport(title: string, headers: string[], rows: any[][], filename: string) {
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const tableWidth = pageWidth - (margin * 2);
    const columnWidth = tableWidth / headers.length;
    const rowHeight = 8;
    let y = 32;

    const drawHeader = () => {
      pdf.setTextColor(54, 36, 24);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.text(title, margin, 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(90, 90, 90);
      pdf.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, margin, 20);
      pdf.setFillColor(151, 99, 61);
      pdf.rect(margin, 24, tableWidth, rowHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      headers.forEach((header, index) => pdf.text(header, margin + (index * columnWidth) + 2, 29.5));
      y = 32;
    };

    drawHeader();
    rows.forEach((row, rowIndex) => {
      if (y + rowHeight > pageHeight - 12) {
        pdf.addPage();
        drawHeader();
      }

      pdf.setFillColor(rowIndex % 2 === 0 ? 249 : 255, rowIndex % 2 === 0 ? 246 : 255, rowIndex % 2 === 0 ? 243 : 255);
      pdf.rect(margin, y, tableWidth, rowHeight, 'F');
      pdf.setTextColor(35, 35, 35);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      row.forEach((value, columnIndex) => {
        const text = pdf.splitTextToSize(String(value ?? ''), columnWidth - 4)[0] || '';
        pdf.text(text, margin + (columnIndex * columnWidth) + 2, y + 5.5);
      });
      y += rowHeight;
    });

    const pageCount = pdf.getNumberOfPages();
    for (let page = 1; page <= pageCount; page++) {
      pdf.setPage(page);
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(8);
      pdf.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 5, { align: 'right' });
    }

    pdf.save(`${filename}-${new Date().toISOString().slice(0, 10)}.pdf`);
  }

  calculateBalance(invoice: any): number {
    return Number(invoice?.totalAmount || 0) - Number(invoice?.receivedAmount || 0);
  }

  getDisplayedBalance(invoice: any): number {
    return this.editingInvoice?._id === invoice._id
      ? this.calculateBalance(this.editingInvoice)
      : this.calculateBalance(invoice);
  }

  /* ---------- EDIT / DELETE ---------- */
  editInvoice(invoice: any) {
    this.editingInvoice = { ...invoice, balanceAmount: this.calculateBalance(invoice) };
  }

  updateEditingBalance() {
    if (this.editingInvoice) {
      this.editingInvoice.balanceAmount = this.calculateBalance(this.editingInvoice);
    }
  }

  saveEdit() {
    if (!this.editingInvoice) return;

    this.updateEditingBalance();

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
