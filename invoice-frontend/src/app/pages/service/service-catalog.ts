import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ServiceType {
  _id: string;
  name: string;
}

@Injectable({
  providedIn: 'root',
})
export class ServiceCatalog {
  private apiUrl = `${environment.apiBaseUrl}/api/services`;
  private platformId = inject(PLATFORM_ID);

  constructor(private http: HttpClient) { }

  private getHeaders(): HttpHeaders {
    const token = isPlatformBrowser(this.platformId) ? localStorage.getItem('token') : null;
    let headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  getServices(): Observable<ServiceType[]> {
    return this.http.get<ServiceType[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  createService(name: string): Observable<ServiceType> {
    return this.http.post<ServiceType>(this.apiUrl, { name }, { headers: this.getHeaders() });
  }

  updateService(id: string, name: string): Observable<ServiceType> {
    return this.http.put<ServiceType>(`${this.apiUrl}/${id}`, { name }, { headers: this.getHeaders() });
  }

  deleteService(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
