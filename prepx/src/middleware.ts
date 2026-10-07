import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getSafeRedirect } from '@/lib/auth/redirect';
import { isInvalidRefreshTokenError } from '@/lib/auth/session-errors';
import type { Database } from '@/types/database';
import { securityHeaders } from '@/lib/security/headers';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
  const headers = securityHeaders(request.nextUrl.pathname, nonce, request.nextUrl.origin);
  // Overwrite untrusted incoming values. Next uses this request CSP to nonce
  // framework scripts; the root layout uses x-nonce for the fixed theme script.
  request.headers.set('x-nonce', nonce);
  request.headers.set('Content-Security-Policy', headers['Content-Security-Policy']);
  const admin = /^\/admin(?:\/|$)/.test(request.nextUrl.pathname);
  const response = admin
    ? await adminSessionMiddleware(request).catch(() => NextResponse.json(
      { error: 'SERVER_ERROR', message: 'Something went wrong. Please try again.' },
      { status: 500 }
    ))
    : NextResponse.next({ request: { headers: request.headers } });
  for (const [name, value] of Object.entries(headers)) response.headers.set(name, value);
  return response;
}

async function adminSessionMiddleware(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({ request });
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previousCookies = supabaseResponse.cookies.getAll();
          supabaseResponse = NextResponse.next({ request });
          previousCookies.forEach((cookie) => supabaseResponse.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
          Object.entries(headersToSet).forEach(([name, value]) =>
            supabaseResponse.headers.set(name, value)
          );
        },
      },
    }
  );

  // Verify the signature against cached public keys; this also refreshes expired
  // sessions. Never authorize from an unverified getSession() result.
  const { data, error } = await supabase.auth.getClaims().catch((error: unknown) => {
    if (isInvalidRefreshTokenError(error)) return { data: null, error };
    throw error;
  });
  if (isInvalidRefreshTokenError(error)) {
    // Expire only this project's session (including chunked cookies). Keep
    // unrelated cookies and transient network failures untouched.
    const projectRef = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split('.')[0];
    const sessionCookie = `sb-${projectRef}-auth-token`;
    const staleCookies = request.cookies.getAll().filter(({ name }) =>
      name === sessionCookie ||
      (name.startsWith(`${sessionCookie}.`) && /^\d+$/.test(name.slice(sessionCookie.length + 1)))
    );
    staleCookies.forEach(({ name }) => request.cookies.delete(name));
    const previousCookies = supabaseResponse.cookies.getAll();
    supabaseResponse = NextResponse.next({ request });
    previousCookies.forEach((cookie) => supabaseResponse.cookies.set(cookie));
    staleCookies.forEach(({ name }) =>
      supabaseResponse.cookies.set(name, '', { path: '/', maxAge: 0 })
    );
    supabaseResponse.headers.set('Cache-Control', 'private, no-store');
    supabaseResponse.headers.set('Pragma', 'no-cache');
    supabaseResponse.headers.set('Expires', '0');
  }
  const userId = data?.claims.sub;
  const { pathname, search } = request.nextUrl;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  function redirectWithCookies(url: URL): NextResponse {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    for (const name of ['cache-control', 'expires', 'pragma']) {
      const value = supabaseResponse.headers.get(name);
      if (value) response.headers.set(name, value);
    }
    return response;
  }

  if (isAdminRoute) {
    const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';
    const isAuthenticated = Boolean(userId && !error);

    if (!isAuthenticated && !isLoginPage) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname + search);
      return redirectWithCookies(loginUrl);
    }

    // Protected pages verify the admin profile in their shared server layout.
    // Only the login route needs this lookup here to redirect an existing admin.
    if (userId && !error && isLoginPage) {
      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      if (!profileError && profile) {
        const destination = getSafeRedirect(request.nextUrl.searchParams.get('redirectTo'));
        return redirectWithCookies(new URL(destination, request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  // Admin/API paths always match, even with extensions. Static assets need no
  // nonce or session work. Public pages only receive security response headers.
  matcher: ['/admin/:path*', '/api/:path*', '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2|csv|xlsx)$).*)'],
};
