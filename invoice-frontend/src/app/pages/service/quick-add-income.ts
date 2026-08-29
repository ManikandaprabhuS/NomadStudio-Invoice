import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type PaymentMode = 'Online' | 'Cash';

export interface QuickAddIncomeRecord {
  _id: string;
  serviceType: string;
  clientName: string;
  amount: number;
  modeOfPayment: PaymentMode;
  createdAt: string;
}

export interface QuickAddIncomePayload {
  serviceType: string;
  clientName: string;
  amount: number;
  modeOfPayment: PaymentMode;
}

@Injectable({
  providedIn: 'root',
})
export class QuickAddIncomeService {
  private apiUrl = `${environment.apiBaseUrl}/api/quick-add-income`;
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = isPlatformBrowser(this.platformId) ? localStorage.getItem('token') : null;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  createIncome(payload: QuickAddIncomePayload): Observable<QuickAddIncomeRecord> {
    return this.http.post<QuickAddIncomeRecord>(this.apiUrl, payload, { headers: this.getHeaders() });
  }

  getIncomes(): Observable<QuickAddIncomeRecord[]> {
    return this.http.get<QuickAddIncomeRecord[]>(this.apiUrl, { headers: this.getHeaders() });
  }
}
