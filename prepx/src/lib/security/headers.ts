/** Edge-compatible response policy. Never inspect or rewrite request bodies. */
export function securityHeaders(
  pathname: string,
  nonce: string,
  origin: string,
  env: NodeJS.ProcessEnv = process.env
): Record<string, string> {
  const development = env.NODE_ENV === 'development' && env.VERCEL !== '1';
  const connections = ["'self'"];
  try {
    const supabase = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '');
    if (supabase.protocol === 'https:' || (development && supabase.protocol === 'http:')) {
      connections.push(supabase.origin);
    }
  } catch { /* Invalid configuration grants no external connection permission. */ }
  if (development) {
    const local = new URL(origin);
    connections.push(`${local.protocol === 'https:' ? 'wss:' : 'ws:'}//${local.host}`);
  }
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "frame-src 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ''}`,
    "script-src-attr 'none'",
    `connect-src ${connections.join(' ')}`,
  ].join('; ');
  const headers: Record<string, string> = {
    'Content-Security-Policy': csp,
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    // Nonce-bearing HTML must never be shared or reused across requests.
    'Cache-Control': 'private, no-store',
  };
  if (/^\/(?:admin|results|api)(?:\/|$)/.test(pathname)) {
    headers['X-Robots-Tag'] = 'noindex, nofollow, noarchive';
  }
  if (/^\/api\/health\/?$/.test(pathname)) {
    headers['Cache-Control'] = 'no-store, no-cache, must-revalidate';
    headers.Pragma = 'no-cache';
  }
  // Trust deployment configuration, never a caller's forwarded-proto header.
  if (env.NODE_ENV === 'production' && (env.VERCEL === '1' || env.SECURITY_HTTPS_ONLY === 'true')) {
    headers['Strict-Transport-Security'] = `max-age=31536000${env.SECURITY_HSTS_INCLUDE_SUBDOMAINS === 'true' ? '; includeSubDomains' : ''}`;
  }
  return headers;
}
