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


  pageSize = 5;
  currentPage = 1;
  totalPages = 1;
  pageNumbers: number[] = [1];


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
    this.totalPages = Math.max(1, Math.ceil(this.filteredClients.length / this.pageSize));
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, index) => index + 1);
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
        (client.phoneNumber && client.phoneNumber.toString().includes(term)) ||
        (client.gstNumber && client.gstNumber.toLowerCase().includes(term))
      );

    }

    this.currentPage = 1;
    this.setupPagination();
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

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePage();
  }

  get showingStart(): number {
    return this.filteredClients.length ? ((this.currentPage - 1) * this.pageSize) + 1 : 0;
  }

  get showingEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredClients.length);
  }

  getClientInitial(client: any): string {
    return String(client?.userName || '?').trim().charAt(0).toUpperCase() || '?';
  }

  trackClient(_index: number, client: any): string {
    return client._id;
  }

  async generateReport() {
    if (!this.filteredClients.length) {
      this.alertService.error('No client records available for this report');
      return;
    }

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const rowPadding = 2;
    const columnWidths = [42, 34, 42, 70, pageWidth - (margin * 2) - 188];
    const headers = ['Client Name', 'Phone', 'GST Number', 'Email', 'Address'];
    let y = 31;

    const drawHeader = () => {
      pdf.setTextColor(54, 36, 24);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(15);
      pdf.text('Client Details Report', margin, 14);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(90, 90, 90);
      pdf.text(`Generated on ${new Date().toLocaleDateString('en-GB')} • ${this.filteredClients.length} record(s)`, margin, 20);
      pdf.setFillColor(151, 99, 61);
      pdf.rect(margin, 24, pageWidth - (margin * 2), 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      let x = margin;
      headers.forEach((header, index) => {
        pdf.text(header, x + rowPadding, 29.5);
        x += columnWidths[index];
      });
      y = 32;
    };

    drawHeader();
    this.filteredClients.forEach((client, rowIndex) => {
      const values = [
        client.userName || '-',
        client.phoneNumber || '-',
        client.gstNumber || '-',
        client.emailId || '-',
        client.address || '-'
      ];
      const wrapped = values.map((value, index) => pdf.splitTextToSize(String(value), columnWidths[index] - (rowPadding * 2)));
      const rowHeight = Math.max(8, Math.max(...wrapped.map(lines => lines.length)) * 4 + 3);

      if (y + rowHeight > pageHeight - 12) {
        pdf.addPage();
        drawHeader();
      }

      pdf.setFillColor(rowIndex % 2 === 0 ? 249 : 255, rowIndex % 2 === 0 ? 246 : 255, rowIndex % 2 === 0 ? 243 : 255);
      pdf.rect(margin, y, pageWidth - (margin * 2), rowHeight, 'F');
      pdf.setTextColor(35, 35, 35);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      let x = margin;
      wrapped.forEach((lines, index) => {
        pdf.text(lines, x + rowPadding, y + 5);
        x += columnWidths[index];
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

    pdf.save(`client-details-report-${new Date().toISOString().slice(0, 10)}.pdf`);
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
