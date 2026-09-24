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
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          const previousCookies = supabaseResponse.cookies.getAll();
          supabaseResponse = NextResponse.next({ request });
          previousCookies.forEach((cookie) => supabaseResponse.cookies.set(cookie));
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const { pathname, search } = request.nextUrl;
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');

  function redirectWithCookies(url: URL): NextResponse {
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
    return response;
  }

  if (isAdminRoute) {
    const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';
    let isAdmin = false;

    if (user && !error) {
      const { data: profile, error: profileError } = await supabase
        .from('admin_profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      isAdmin = !profileError && !!profile;
    }

    if (!isAdmin && !isLoginPage) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirectTo', pathname + search);
      return redirectWithCookies(loginUrl);
    }

    if (isAdmin && isLoginPage) {
      const destination = getSafeRedirect(request.nextUrl.searchParams.get('redirectTo'));
      return redirectWithCookies(new URL(destination, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Always protect admin routes, including paths with file extensions.
    '/admin/:path*',
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - Files with extensions (svg, png, jpg, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
