import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { getSafeRedirect } from '@/lib/auth/redirect';
import type { Database } from '@/types/database';

export async function middleware(request: NextRequest): Promise<NextResponse> {
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
  const { data, error } = await supabase.auth.getClaims();
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
  // Public pages and static assets need no admin session work. Actions still
  // authorize independently; all admin paths (including extensions) are covered.
  matcher: ['/admin/:path*'],
};
