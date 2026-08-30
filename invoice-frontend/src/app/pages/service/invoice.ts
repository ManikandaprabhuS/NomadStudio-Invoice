import { isPlatformBrowser } from '@angular/common';
import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Invoice {

  private apiUrl = `${environment.apiBaseUrl}/api/invoices`;
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
    }).then(async res => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Failed to update invoice');
      return body;
    });
  }

  deleteInvoice(id: string) {
    const token = this.getToken();

    return fetch(`${this.apiUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }).then(async res => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Failed to delete invoice');
      return body;
    });
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
    }).then(async res => {
      const body = await res.json();
      if (!res.ok) throw new Error(body.message || 'Failed to create invoice');
      return body;
    });
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
