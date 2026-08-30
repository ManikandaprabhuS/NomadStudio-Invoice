import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(component => component.Login),
  },
  {
    path: '',
    loadComponent: () => import('./layout/main-layout/main-layout').then(component => component.MainLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard/dashboard').then(component => component.Dashboard),
        canActivate: [authGuard],
      },
      {
        path: 'invoices',
        loadComponent: () => import('./pages/create-invoice/create-invoice').then(component => component.CreateInvoice),
        data: { invoiceType: 'Business' },
        canActivate: [authGuard],
      },
      {
        path: 'customer-invoice',
        loadComponent: () => import('./pages/create-invoice/create-invoice').then(component => component.CreateInvoice),
        data: { invoiceType: 'Customer' },
        canActivate: [authGuard],
      },
      {
        path: 'listinvoices',
        loadComponent: () => import('./pages/invoice-list/invoice-list').then(component => component.InvoiceList),
        canActivate: [authGuard],
      },
      {
        path: 'clients',
        loadComponent: () => import('./pages/clients/clients').then(component => component.Clients),
        canActivate: [authGuard],
      },
      {
        path: 'overview',
        loadComponent: () => import('./pages/overview/overview').then(component => component.Overview),
        canActivate: [authGuard],
      },
      {
        path: 'expense',
        loadComponent: () => import('./pages/expense-list/expense-list').then(component => component.ExpenseList),
        canActivate: [authGuard],
      },
      {
        path: 'services',
        loadComponent: () => import('./pages/services/services').then(component => component.Services),
        canActivate: [authGuard],
      },
      {
        path: 'users',
        loadComponent: () => import('./pages/user-management/user-management').then(component => component.UserManagement),
        canActivate: [authGuard, adminGuard],
      },
      {
        path: 'support',
        loadComponent: () => import('./pages/support/support').then(component => component.Support),
        canActivate: [authGuard],
      },
    ],
  },
];
