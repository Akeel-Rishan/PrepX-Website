const ADMIN_DASHBOARD = '/admin/dashboard';

/** Accept only literal internal admin paths, excluding login and traversal. */
export function getSafeRedirect(redirectTo: unknown): string {
  if (typeof redirectTo !== 'string') return ADMIN_DASHBOARD;
  const pathname = redirectTo.split(/[?#]/, 1)[0];
  if (
    !(pathname === '/admin' || pathname.startsWith('/admin/')) ||
    pathname === '/admin/login' ||
    pathname.startsWith('/admin/login/') ||
    /[\\%\s]/.test(pathname) ||
    /[\u0000-\u001f\u007f]/.test(redirectTo) ||
    pathname.split('/').some((segment) => segment === '.' || segment === '..')
  ) {
    return ADMIN_DASHBOARD;
  }
  return redirectTo;
}
