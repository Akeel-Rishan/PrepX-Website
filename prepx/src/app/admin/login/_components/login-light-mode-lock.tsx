'use client';

import { useLayoutEffect } from 'react';

function prefersDarkMode(): boolean {
  try {
    const savedTheme = localStorage.getItem('prepx-theme');
    return (
      savedTheme === 'dark' ||
      (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    );
  } catch {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
}

/** Keeps the login route light, then restores the user's theme after navigation. */
export function LoginLightModeLock(): null {
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.style.colorScheme = 'light';

    return () => {
      const useDark = prefersDarkMode();
      root.classList.toggle('dark', useDark);
      root.style.colorScheme = useDark ? 'dark' : 'light';
    };
  }, []);

  return null;
}
