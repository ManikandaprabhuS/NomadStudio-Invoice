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
  currentPage: number = 0;


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

    } catch (err) {
      console.error('Failed to load expenses', err);
      this.expenses = [];
      this.filteredExpenses = [];
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
    console.log('Search:', this.searchTerm);
    console.log('Filtered:', this.filteredExpenses.length);
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
        this.applyFilter();
        this.alertService.success('Expense deleted successfully');
      } else {
        this.alertService.error('Failed to delete expense. Please try again.');
      }
    }
  }
}
