import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class Expense {

  private baseUrl='http://localhost:5000/api/expenses';
  private platformId = inject(PLATFORM_ID);
  
  private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }
  private getHeaders(): HttpHeaders {
    const token = this.getToken();
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  constructor(private http:HttpClient) {}

  addExpense(playload: { amount: number; reason: string; }) {
    return this.http.post(`${this.baseUrl}`, playload);
  }

  getExpenses() {
    return this.http.get<any[]>(`${this.baseUrl}`);
  }

    deleteExpense(id: string): Observable<any> {
      return this.http.delete(`${this.baseUrl}/${id}`, { headers: this.getHeaders() });
    }
}
