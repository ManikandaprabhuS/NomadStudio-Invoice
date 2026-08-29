import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const platform = inject(PLATFORM_ID);

  if (isPlatformBrowser(platform)) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (localStorage.getItem('token') && user.role === 'admin') return true;
    } catch (_err) {
      // Invalid locally stored data is treated as an unauthenticated session.
    }
  }

  router.navigate(['/overview']);
  return false;
};
