import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';

interface Account {
  _id: string;
  userName: string;
  emailId: string;
  branchName?: string;
  role: 'admin' | 'user';
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.html',
  styleUrl: './user-management.css',
})
export class UserManagement implements OnInit {
  private readonly usersUrl = `${environment.apiBaseUrl}/auth/users`;

  users: Account[] = [];
  loading = true;
  saving = false;
  error = '';
  success = '';
  newUser = { userName: '', emailId: '', branchName: '', password: '' };
  showPassword = false;
  currentPage = 1;
  readonly pageSize = 5;
  totalPages = 1;
  pageNumbers: number[] = [1];
  paginatedUsers: Account[] = [];
  rangeStart = 0;
  rangeEnd = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<Account[]>(this.usersUrl, { headers: this.authHeaders() }).subscribe({
      next: users => {
        this.users = users;
        this.currentPage = 1;
        this.updatePagination();
        this.loading = false;
      },
      error: error => {
        this.error = error.error?.message || 'Unable to load users';
        this.loading = false;
      },
    });
  }

  createUser(): void {
    this.error = '';
    this.success = '';
    if (this.saving) return;

    this.saving = true;
    this.http.post<Account>(this.usersUrl, this.newUser, { headers: this.authHeaders() }).subscribe({
      next: user => {
        this.users = [user, ...this.users];
        this.currentPage = 1;
        this.updatePagination();
        this.newUser = { userName: '', emailId: '', branchName: '', password: '' };
        this.success = 'User account created.';
        this.saving = false;
      },
      error: error => {
        this.error = error.error?.message || 'Unable to create user';
        this.saving = false;
      },
    });
  }

  deleteUser(user: Account): void {
    if (user.role !== 'user' || !confirm(`Delete the account for ${user.userName}?`)) return;

    this.error = '';
    this.success = '';
    this.http.delete<{ message: string }>(`${this.usersUrl}/${user._id}`, { headers: this.authHeaders() }).subscribe({
      next: result => {
        this.users = this.users.filter(account => account._id !== user._id);
        this.updatePagination();
        this.success = result.message;
      },
      error: error => {
        this.error = error.error?.message || 'Unable to delete user';
      },
    });
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  private updatePagination(): void {
    this.totalPages = Math.max(1, Math.ceil(this.users.length / this.pageSize));
    this.currentPage = Math.min(this.currentPage, this.totalPages);
    this.pageNumbers = Array.from({ length: this.totalPages }, (_, index) => index + 1);
    const start = (this.currentPage - 1) * this.pageSize;
    this.paginatedUsers = this.users.slice(start, start + this.pageSize);
    this.rangeStart = this.users.length ? start + 1 : 0;
    this.rangeEnd = Math.min(start + this.pageSize, this.users.length);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.updatePagination();
  }

  trackUser(_index: number, user: Account): string {
    return user._id;
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
  }
}
