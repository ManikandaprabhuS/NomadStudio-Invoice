import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  userName = 'NomadStudio';
  password = '';
  showError = false;

  constructor(private http: HttpClient, private router: Router) { }

  login() {
    this.showError = false;
    if (!this.userName || !this.password) {
      this.showError = true;
      return;
    }
    console.log('Logging in with', this.userName, this.password);
    this.http.post<any>('http://localhost:5000/auth/login', {
      userName: this.userName,
      password: this.password

    }).subscribe({
      next: (res) => {
        localStorage.setItem('token', res.token);
        console.log('Response data:', res);
        this.router.navigate(['/overview']);
      },
      error: () => {
        alert('Invalid password or Server Error');
      }
    });
  }
}