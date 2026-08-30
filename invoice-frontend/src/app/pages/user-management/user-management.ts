import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AlertService } from '../service/alert.service';

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
  deleting = false;
  error = '';
  pendingDeletion: Account | null = null;
  newUser = { userName: '', emailId: '', branchName: '', password: '' };

  constructor(
    private http: HttpClient,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.http.get<Account[]>(this.usersUrl, { headers: this.authHeaders() }).subscribe({
      next: users => {
        this.users = users;
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
    if (this.saving) return;

    this.saving = true;
    this.http.post<Account>(this.usersUrl, this.newUser, { headers: this.authHeaders() }).subscribe({
      next: user => {
        this.users = [{ ...user, _id: user._id }, ...this.users];
        this.newUser = { userName: '', emailId: '', branchName: '', password: '' };
        this.alertService.success('User account created successfully.', 'Account created');
        this.saving = false;
      },
      error: error => {
        this.error = error.error?.message || 'Unable to create user';
        this.saving = false;
      },
    });
  }

  requestDeletion(user: Account): void {
    if (user.role === 'user') this.pendingDeletion = user;
  }

  cancelDeletion(): void {
    if (!this.deleting) this.pendingDeletion = null;
  }

  confirmDeletion(): void {
    const user = this.pendingDeletion;
    if (!user || this.deleting) return;

    this.error = '';
    this.deleting = true;
    this.http.delete<{ message: string }>(`${this.usersUrl}/${user._id}`, { headers: this.authHeaders() }).subscribe({
      next: result => {
        this.users = this.users.filter(account => account._id !== user._id);
        this.pendingDeletion = null;
        this.deleting = false;
        this.alertService.success(result.message, 'Account deleted');
      },
      error: error => {
        this.error = error.error?.message || 'Unable to delete user';
        this.deleting = false;
      },
    });
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token') || ''}` });
  }
}
