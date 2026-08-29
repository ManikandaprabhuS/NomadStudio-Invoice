import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private authUrl = `${environment.apiBaseUrl}/auth`;
  userName = '';
  password = '';
  emailId = '';
  otp = '';
  newPassword = '';
  showError = false;
  mode: 'login' | 'forgot' | 'reset' = 'login';

  constructor(private http: HttpClient, private router: Router) { }

  login() {
    this.showError = false;
    if (!this.userName || !this.password) {
      this.showError = true;
      return;
    }
    this.http.post<any>(`${this.authUrl}/login`, {
      userName: this.userName.trim(),
      password: this.password

    }).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('user', JSON.stringify(res.user));
        this.router.navigate(['/overview']);
      },
      error: (err) => {
        alert(
          err.status === 0
            ? 'Unable to connect to the login server. Please try again shortly.'
            : err.error?.message || 'Invalid username or password'
        );
      }
    });
  }

  forgotPassword() {
    if (!this.emailId) {
      alert('Please enter your email address');
      return;
    }
    this.http.post<any>(`${this.authUrl}/forgot-password`, {
      emailId: this.emailId
    }).subscribe({
      next: (res) => {
        alert(res.message);
        this.mode = 'reset';
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to send OTP');
      }
    });
  }

  resetPassword() {
    if (!this.emailId || !this.otp || !this.newPassword) {
      alert('Please fill in all fields');
      return;
    }
    this.http.post<any>(`${this.authUrl}/reset-password`, {
      emailId: this.emailId,
      otp: this.otp,
      newPassword: this.newPassword
    }).subscribe({
      next: (res) => {
        alert(res.message);
        this.mode = 'login';
      },
      error: (err) => {
        alert(err.error?.message || 'Reset failed');
      }
    });
  }

  changeMode(newMode: 'login' | 'forgot' | 'reset') {
    this.mode = newMode;
    this.showError = false;
  }
}
