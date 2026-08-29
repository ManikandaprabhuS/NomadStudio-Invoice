import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar {

  @Output() close = new EventEmitter<void>();
constructor(private router: Router) {}

  get isAdmin(): boolean {
    if (typeof localStorage === 'undefined') return false;

    try {
      return JSON.parse(localStorage.getItem('user') || '{}').role === 'admin';
    } catch (_err) {
      return false;
    }
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}

