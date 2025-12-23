import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Invoice {

  private apiUrl = 'http://localhost:5000/api/invoices';
  private platformId = inject(PLATFORM_ID);

  updateInvoice(id: string, updatedData: any) {
    const token = this.getToken();

    return fetch(`${this.apiUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(updatedData)
    }).then(res => res.json());
  }

  deleteInvoice(id: string) {
    const token = this.getToken();

    return fetch(`${this.apiUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }).then(res => res.json());
  }

   private getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem('token');
    }
    return null;
  }

 createInvoice(invoice: any) {
    const token = this.getToken();

    return fetch(this.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(invoice)
    }).then(res => res.json());
  }

  getInvoices() {
    const token = this.getToken();

    return fetch(this.apiUrl, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }).then(res => res.json());
  }

}
