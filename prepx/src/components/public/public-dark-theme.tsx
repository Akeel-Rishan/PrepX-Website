'use client';

import { useLayoutEffect } from 'react';

/** Keep public routes dark during client navigation without changing the admin preference. */
export function PublicDarkTheme(): null {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.style.colorScheme = 'dark';

    return () => {
      let adminDark = false;
      try {
        adminDark = localStorage.getItem('prepx-theme') === 'dark';
      } catch {
        // Admin uses its light default when storage is unavailable.
      }
      root.classList.toggle('dark', adminDark);
      root.style.colorScheme = adminDark ? 'dark' : 'light';
    };
  }, []);

  return null;
}
