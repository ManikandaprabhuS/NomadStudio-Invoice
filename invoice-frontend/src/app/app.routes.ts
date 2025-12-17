import { Routes } from '@angular/router';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MainLayout } from './layout/main-layout/main-layout';
import { CreateInvoice } from './pages/create-invoice/create-invoice';
import { InvoiceList } from './pages/invoice-list/invoice-list';
import { CreateClient } from './pages/create-client/create-client';
import { Clients } from './pages/clients/clients';
import { Overview } from './pages/overview/overview';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: '',  component: MainLayout,
    children: [
      { path: 'dashboard', component: Dashboard , canActivate: [authGuard] },
      // add more pages here later
      { path: 'invoices', component: CreateInvoice , canActivate: [authGuard] },
      { path: 'listinvoices', component: InvoiceList , canActivate: [authGuard]   },
      { path: 'addclient', component: CreateClient , canActivate: [authGuard] },
      { path: 'clients', component: Clients , canActivate: [authGuard] },
      {path:'overview', component:Overview, canActivate: [authGuard]}
    ]
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes), FormsModule, HttpClientModule],
  exports: [RouterModule]
})
export class AppRoutingModule { }
