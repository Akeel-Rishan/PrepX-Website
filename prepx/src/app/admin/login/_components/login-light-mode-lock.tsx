'use client';

import { useLayoutEffect } from 'react';

function shouldUseDarkMode(): boolean {
  const isAdminPage = /^\/admin(?:\/|$)/.test(window.location.pathname);
  if (!isAdminPage) return true;
  try {
    const savedTheme = localStorage.getItem('prepx-theme');
    return savedTheme === 'dark';
  } catch {
    return false;
  }
}

/** Keeps the login route light, then restores the user's theme after navigation. */
export function LoginLightModeLock(): null {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    return () => {
      const useDark = shouldUseDarkMode();
      root.classList.toggle('dark', useDark);
      root.style.colorScheme = useDark ? 'dark' : 'light';
    };
  }, []);

  return null;
}
