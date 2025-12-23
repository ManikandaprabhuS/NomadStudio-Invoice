import { Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { Invoice } from '../service/invoice';
import { CommonModule } from '@angular/common';
import { Client } from '../service/client';
import { firstValueFrom } from 'rxjs/internal/firstValueFrom';
import { FormsModule } from '@angular/forms';
import { error } from 'node:console';
import { Expense } from '../service/expense';
import { Chart, ChartConfiguration, registerables } from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AlertService } from '../service/alert.service';


@Component({
  selector: 'app-overview',
  imports: [CommonModule, FormsModule],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
})
export class Overview implements OnInit {

  // ================= EXISTING =================
  totalClients = 0;
  totalIncome = 0;
  totalReceived = 0;
  totalBalance = 0;
  loading = true;

  expenseAmount: number = 0;
  expenseReason: string = '';

  // Quick Income Form Properties
  incomeServiceType: string = '';
  incomeAmount: number = 0;
  incomeClientName: string = 'Walk-in Customer';

  @ViewChild('incomeChart') incomeChartRef!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;
  allExpenses: any[] = [];

  constructor(
    private invoiceService: Invoice,
    private clientService: Client,
    private expenseService: Expense,
    private cdr: ChangeDetectorRef,
    private alertService: AlertService
  ) { }

  // ================= NEW (FILTER SUPPORT) =================
  selectedFilter: 'today' | 'week' | 'month' | 'year' = 'today';
  chartFilter: 'daily' | 'weekly' | 'monthly' = 'daily';

  fromDate: string | null = null;
  toDate: string | null = null;

  allInvoices: any[] = [];   // backup (DO NOT REMOVE)
  allClients: any[] = [];    // backup for filtering


  // ================= LIFECYCLE =================
  ngOnInit(): void {
    this.loadDashboardData();
  }


  // ================= EXISTING METHOD (UNCHANGED LOGIC) =================
  async loadDashboardData() {
    try {
      // Clients (Observable → Promise)
      const clients: any[] = await firstValueFrom(
        this.clientService.getAllClients()
      );
      const expense: any[] = await firstValueFrom(
        this.expenseService.getExpenses()
      );
      this.allExpenses = expense;

      // Invoices (Promise)
      const invoices: any[] = await this.invoiceService.getInvoices();

      this.allInvoices = invoices; // backup
      this.allClients = clients;   // backup
      this.totalClients=clients.length;


      this.loading = false;
      this.cdr.detectChanges(); // 🔹 FORCE RENDER for canvas
      this.applyPresetFilter(); // 🔹 APPLY DEFAULT FILTER (NOW CHART EXISTS)


    } catch (err) {
      console.error('Failed to load overview data', err);
      this.loading = false;
    }
  }

  // ================= PRESET FILTER (Today / Week / Month / Year) =================
  applyPresetFilter() {
    this.fromDate = null;
    this.toDate = null;

    const now = new Date();
    let startDate = new Date();

    switch (this.selectedFilter) {
      case 'today':
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        break;

      case 'week':
        startDate = this.getStartOfWeek(now);
        break;

      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;

      case 'year':
        // 🔥 FIX: include previous year invoices
        startDate = this.getStartOfFinancialYear(now);
        break;
    }

    // Map selectedFilter to chartFilter
    if (this.selectedFilter === 'today') {
      this.chartFilter = 'daily';
    } else if (this.selectedFilter === 'week') {
      this.chartFilter = 'weekly';
    } else {
      this.chartFilter = 'monthly'; // month or year
    }

    this.filterDashboardData(startDate, now);
    this.updateChart();
  }


  // ================= CUSTOM DATE FILTER (CALENDAR) =================
  applyCustomDateFilter() {
    if (!this.fromDate || !this.toDate) return;

    const from = new Date(this.fromDate);
    const to = new Date(this.toDate);

    // normalize end date (include full day)
    to.setHours(23, 59, 59, 999);

    this.filterDashboardData(from, to);
    // For custom date, defaults to daily or monthly? Let's keep existing chart filter for now
    // or maybe auto-detect range. Leaving as is to minimize complexity.
    this.updateChart();
  }


  updateChart() {
    const { start, end, formatLabel, increment } = this.getChartData(this.chartFilter);

    // 1. Generate chronologically sorted labels
    const labels: string[] = [];
    let current = new Date(start);
    // Safety break
    let loops = 0;
    while (current <= end && loops < 1000) {
      labels.push(formatLabel(current));
      increment(current);
      loops++;
    }

    // 2. Aggregate data
    const groupedIncome = this.groupByPeriod(this.allInvoices, formatLabel);
    const groupedExpense = this.groupByPeriod(this.allExpenses, formatLabel);

    // 3. Map sorted labels to data
    const incomeData = labels.map(label => groupedIncome[label] || 0);
    const expenseData = labels.map(label => groupedExpense[label] || 0);

    this.renderChart(labels, incomeData, expenseData);
  }

  getChartData(period: 'daily' | 'weekly' | 'monthly') {
    const end = new Date();
    let start = new Date();
    let formatLabel: (d: Date) => string = (d) => '';
    let increment: (d: Date) => void = (d) => { };


    if (period === 'daily') {
      // Last 7 days
      start.setDate(end.getDate() - 6);
      formatLabel = (d) => d.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      increment = (d) => d.setDate(d.getDate() + 1);
    } else if (period === 'weekly') {
      // Last 4 weeks
      start.setDate(end.getDate() - 28);
      formatLabel = (d) => `Week ${this.getWeekNumber(d)}`;
      increment = (d) => d.setDate(d.getDate() + 7);
    } else {
      // Last 6 months
      start.setMonth(end.getMonth() - 5);
      start.setDate(1);
      formatLabel = (d) => d.toLocaleString('default', { month: 'short', year: 'numeric' });
      increment = (d) => d.setMonth(d.getMonth() + 1);
    }

    // Align start of week if needed? keeping simple for now

    return { start, end, formatLabel, increment };
  }

  getWeekNumber(d: Date): number {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  }

  renderChart(labels: string[], income: number[], expense: number[]) {
    if (this.chart) {
      this.chart.destroy();
    }

    // Register plugin locally just for this chart or globally? 
    // Let's register strictly for this chart via plugins array if possible, 
    // or just assume global registration if we did Chart.register. 
    // Chart.js 3+ supports local plugins array in config.

    // We need to register it globally or passed in plugins array of chart constructor? 
    // Actually passing it in 'plugins' array of the config object (not options.plugins) is the local way.

    const ctx = this.incomeChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    Chart.register(ChartDataLabels); // Register globally to be safe and easy

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Income',
            data: income,
            backgroundColor: '#10B981', // Emerald Green
            borderColor: '#10B981',
            borderWidth: 1,
            borderRadius: 8,
            barPercentage: 0.6,
          },
          {
            label: 'Expense',
            data: expense,
            backgroundColor: '#EF4444', // Coral Red
            borderColor: '#EF4444',
            borderWidth: 1,
            borderRadius: 8,
            barPercentage: 0.6,
          }
        ]
      },
      options: {
        responsive: true,


        plugins: {
          legend: { position: 'top' },
          datalabels: {
            anchor: 'end',
            align: 'top',
            formatter: (value) => {
              if (!value) return '';
              return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
            },
            font: {
              weight: 600,
              family: "'Inter', sans-serif",
              size: 11
            },
            color: '#6B7280'
          },
          tooltip: {
            enabled: false // 🔹 Disable tooltips
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f0f0f0' },
            ticks: {
              callback: function (value, index, values) {
                return '₹' + value;
              }
            }
          }
        }
      }
    });
  }

  groupByPeriod(data: any[], formatLabel: (d: Date) => string) {
    const result: Record<string, number> = {};

    data.forEach(item => {
      const date = new Date(item.createdAt || item.expenseDate); // Handle invoice or expense date
      // We don't filter by date here strictly because we just want to create the map keys
      // effectively, but valid check is good for performance

      const key = formatLabel(date);
      const amount = item.totalAmount || item.amount || 0;
      result[key] = (result[key] || 0) + amount;
    });

    return result;
  }


  // ================= DATE HELPERS (ADDED) =================
  getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay(); // 0 (Sun) → 6 (Sat)
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff));
  }

  getStartOfFinancialYear(date: Date): Date {
    // Financial year starts April 1 (India)
    const year = date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
    return new Date(year, 3, 1);
  }

  // ================= COMMON FILTER METHOD =================

  filterDashboardData(from: Date, to: Date) {
    // 1. Filter Invoices
    const filteredInvoices = this.allInvoices.filter((inv: any) => {
      const created = new Date(inv.createdAt);
      return created >= from && created <= to;
    });

    this.totalIncome = filteredInvoices.reduce(
      (sum: number, i: any) => sum + (i.totalAmount || 0),
      0
    );

    this.totalReceived = filteredInvoices.reduce(
      (sum: number, i: any) => sum + (i.receivedAmount || 0),
      0
    );

    this.totalBalance = filteredInvoices.reduce(
      (sum: number, i: any) => sum + (i.balanceAmount || 0),
      0
    );

  
  }

  addExpense() {
    // Validate Expense Amount
    if (!this.expenseAmount || this.expenseAmount <= 0) {
      this.alertService.error('Please enter a valid expense amount');
      return;
    }

    // Validate Reason
    if (!this.expenseReason || this.expenseReason.trim() === '') {
      this.alertService.error('Please enter a reason for the expense');
      return;
    }
    console.log('Adding expense:', this.expenseAmount, this.expenseReason);
    if (!this.expenseAmount || this.expenseAmount <= 0) {
      this.alertService.error('Please enter a valid expense amount.');
      return;
    }
    const playload = {
      amount: this.expenseAmount,
      reason: this.expenseReason
    };

    this.expenseService.addExpense(playload).subscribe({
      next: () => {
        this.alertService.success('Expense added successfully.');
        this.expenseAmount = 0;
        this.expenseReason = '';

        this.loadDashboardData();
      },
      error: (err) => {
        console.error('Failed to add expense', err);
        this.alertService.error('Failed to add expense. Please try again.');
      }
    });

  }

  addQuickIncome(){
    if (!this.incomeServiceType || !this.incomeAmount || this.incomeAmount <= 0) {
      this.alertService.error('Please fill all required fields');
      return;
    }

    // Create invoice object matching YOUR EXACT schema
  const quickInvoice = {
    userName: this.incomeClientName || 'Walk-in Customer',
    phoneNumber: '0000000000',
    services: [
      {
        serviceType: this.incomeServiceType,
        quantity: 1,
        pricePerUnit: this.incomeAmount,        // ✅ Changed from 'price'
        amountCharged: this.incomeAmount,       // ✅ Added this field
        notes: 'Quick income entry'
      }
    ],
    totalAmount: this.incomeAmount,
    receivedAmount: this.incomeAmount,
    balanceAmount: 0,
    ownerDetails: {                              // ✅ Added owner details
      companyName: "Nomad Studio Pvt Ltd",
      ownerName: "Suriya",
      phoneNumber: "+91 1234567890",
      address: "Dharapuram Road, Oddanchatram-624619, Tamil Nadu"
    }
  };
    console.log('💰 Adding quick income:', quickInvoice);
      this.invoiceService.createInvoice(quickInvoice)
      .then((response) => {
        console.log('✅ Income added:', response);
        this.alertService.success('Income added successfully!');
        
        // Reset form
        this.resetIncomeForm();
        
        // Reload invoices to show updated data
        this.loadDashboardData();
      })
      .catch((err) => {
        console.error('❌ Failed to add income:', err);
        this.alertService.error('Failed to add income');
      });

    }
  resetIncomeForm() {
    this.incomeServiceType = '';
    this.incomeAmount = 0;
    this.incomeClientName = 'Walk-in Customer';
  }
}
