import { NextResponse } from 'next/server';
import { readRateLimitConfig } from '@/lib/rate-limit/config';
import type { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
const headers = {
  'Cache-Control': 'no-store, no-cache, must-revalidate',
  Pragma: 'no-cache',
  'X-Content-Type-Options': 'nosniff',
};

/** Liveness plus local production configuration validation; never contacts providers. */
export async function GET(request: Request): Promise<Response> {
  void request; // Intentionally do not inspect headers, cookies or caller data.
  let status: 'ok' | 'unavailable' = 'ok';
  try {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
      const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '');
      if (url.protocol !== 'https:' || url.username || url.password ||
          !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
          !process.env.SUPABASE_SECRET_KEY?.trim()) {
        throw new Error('Invalid application configuration.');
      }
      readRateLimitConfig();
    }
  } catch {
    // Fixed-message server logging only: upstream errors may contain credentials.
    console.error('[Health] Production configuration unavailable.');
    status = 'unavailable';
  }
  return NextResponse.json(
    { status, service: 'prepx', timestamp: new Date().toISOString() },
    { status: status === 'ok' ? 200 : 503, headers }
  );
}

async function methodNotAllowed(): Promise<Response> {
  return NextResponse.json<ApiResponse>(
    { success: false, error: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' },
    { status: 405, headers: { ...headers, Allow: 'GET' } }
  );
}
export { methodNotAllowed as POST, methodNotAllowed as PUT, methodNotAllowed as PATCH,
  methodNotAllowed as DELETE, methodNotAllowed as OPTIONS, methodNotAllowed as HEAD };
