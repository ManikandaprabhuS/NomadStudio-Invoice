import { Injectable, signal } from '@angular/core';

export interface Alert {
    id: number;
    type: 'success' | 'error';
    title: string;
    message: string;
}

@Injectable({
    providedIn: 'root'
})
export class AlertService {
    private alerts = signal<Alert[]>([]);
    readonly alerts$ = this.alerts.asReadonly();
    private counter = 0;

    success(message: string, title: string = 'Success') {
        this.addAlert('success', title, message);
    }

    error(message: string, title: string = 'Error') {
        this.addAlert('error', title, message);
    }

    private addAlert(type: 'success' | 'error', title: string, message: string) {
        const id = this.counter++;
        const newAlert: Alert = { id, type, title, message };

        this.alerts.update(current => [...current, newAlert]);

        // Auto dismiss after 4 seconds
        setTimeout(() => {
            this.removeAlert(id);
        }, 4000);
    }

    removeAlert(id: number) {
        this.alerts.update(current => current.filter(alert => alert.id !== id));
    }
}
