import { Component, OnInit } from '@angular/core';
import { Expense } from '../service/expense';
import { CommonModule } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { AlertService } from '../service/alert.service';

@Component({
  selector: 'app-expense-list',
  imports: [CommonModule, FormsModule],
  templateUrl: './expense-list.html',
  styleUrl: './expense-list.css',
})
export class ExpenseList implements OnInit {

  expenses: any[] = [];
  loading = true;
  searchTerm = '';
  filteredExpenses: any[] = [];
  currentPage = 1;
  readonly pageSize = 5;
  totalAmount = 0;
  thisMonthAmount = 0;
  averageExpense = 0;
  totalPages = 1;
  pageNumbers: number[] = [1];
  paginatedExpenses: any[] = [];
  rangeStart = 0;
  rangeEnd = 0;


  constructor(private expenseService: Expense, private alertService: AlertService) { }

  async ngOnInit() {
    await this.loadExpenses();
  }

  async loadExpenses() {
    this.loading = true;

    try {
      const res = this.expenseService.getExpenses();

      // ✅ Supports both Promise & Observable
      this.expenses = Array.isArray(res)
        ? res
        : await firstValueFrom(res);
      this.filteredExpenses = [...this.expenses];
      this.currentPage = 1;
      this.updateSummary();
      this.updatePagination();

    } catch (err) {
      console.error('Failed to load expenses', err);
      this.expenses = [];
      this.filteredExpenses = [];
      this.updateSummary();
      this.updatePagination();
    } finally {
      this.loading = false;
    }
  }

  applyFilter() {
    const term = this.searchTerm?.trim().toLowerCase();

    if (!term) {
      this.filteredExpenses = [...this.expenses];
    } else {
      this.filteredExpenses = this.expenses.filter(expense =>
        (expense.reason && expense.reason.toLowerCase().includes(term)) ||
        (expense.amount && expense.amount.toString().includes(term))
      );
    }

    this.currentPage = 1;
    this.updatePagination();
  }

  private updateSummary(): void {
    const now = new Date();
    this.totalAmount = this.expenses.reduce(
      (total, expense) => total + (Number(expense.amount) || 0),
      0
    );
    this.thisMonthAmount = this.expenses.reduce((total, expense) => {
      const date = new Date(expense.createdAt);
      const isCurrentMonth = !Number.isNaN(date.getTime())
        && date.getMonth() === now.getMonth()
        && date.getFullYear() === now.getFullYear();
      return isCurrentMonth ? total + (Number(expense.amount) || 0) : total;
    }, 0);
    this.averageExpense = this.expenses.length ? this.totalAmount / this.expenses.length : 0;
  }

  private updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.filteredExpenses.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, index) => index + 1);
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedExpenses = this.filteredExpenses.slice(start, start + this.pageSize);
    this.rangeStart = this.filteredExpenses.length ? start + 1 : 0;
    this.rangeEnd = Math.min(start + this.pageSize, this.filteredExpenses.length);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  trackExpense(_index: number, expense: any): string {
    return expense._id;
  }

  // ✅ NEW: Delete expense method
  async deleteExpense(expenseId: string) {
    if (!confirm('Are you sure you want to delete this expense?')) {
      return;
    }
    try {
      // Call your delete API with error handling
      const response = await firstValueFrom(
        this.expenseService.deleteExpense(expenseId)
      );

      console.log('Delete response:', response); // Check what backend returns

      // Remove from local arrays
      this.expenses = this.expenses.filter(e => e._id !== expenseId);
      this.updateSummary();
      this.applyFilter(); // Refresh filtered list

      this.alertService.success('Expense deleted successfully');

    } catch (err: any) {
      console.error('Delete error details:', err);
      console.error('Error status:', err.status);
      console.error('Error message:', err.message);

      // Check if it's actually deleted despite the error
      if (err.status === 200 || err.status === 204) {
        // Sometimes DELETE returns 204 No Content which can be treated as error
        this.expenses = this.expenses.filter(e => e._id !== expenseId);
        this.updateSummary();
        this.applyFilter();
        this.alertService.success('Expense deleted successfully');
      } else {
        this.alertService.error('Failed to delete expense. Please try again.');
      }
    }
  }
}
