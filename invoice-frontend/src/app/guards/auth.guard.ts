import { CanActivateFn, Router } from '@angular/router';
import { inject,PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const platform = inject(PLATFORM_ID);

  if (isPlatformBrowser(platform)){
    const token = localStorage.getItem('token');
    if (token){
        return true;
    }
    router.navigate(['/login']);
    return false;
  }
  router.navigate(['/login']);
  return true;
};
