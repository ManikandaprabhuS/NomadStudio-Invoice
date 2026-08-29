import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  createClient(client: any): Observable<any> {
    return this.http.post(this.apiUrl, client, { headers: this.getHeaders() });
  }

  getAllClients(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  updateClient(id: string, client: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, client, { headers: this.getHeaders() });
  }

  deleteClient(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

}
