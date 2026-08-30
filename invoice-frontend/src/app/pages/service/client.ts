import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Client {

  private apiUrl = `${environment.apiBaseUrl}/api/users`;
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) { }

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

  getAllClients(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  lookupBusinessClient(phoneNumber: string, gstNumber: string): Observable<any> {
    let params = new HttpParams();
    if (phoneNumber.trim()) params = params.set('phoneNumber', phoneNumber.trim());
    if (gstNumber.trim()) params = params.set('gstNumber', gstNumber.trim().toUpperCase());
    return this.http.get<any>(`${this.apiUrl}/lookup`, { headers: this.getHeaders(), params });
  }

  updateClient(id: string, client: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, client, { headers: this.getHeaders() });
  }

  deleteClient(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

}
