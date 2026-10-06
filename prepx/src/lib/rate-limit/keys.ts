import 'server-only';
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { normalizeSearchIdentifier } from '@/lib/public-search';
import type { RateLimitConfig } from '@/lib/rate-limit/config';

export function normalizeClientIp(input: string): string | null {
  let ip = input.trim();
  if (ip.startsWith('[') && ip.endsWith(']')) ip = ip.slice(1, -1);
  // Zone IDs, ports and lists are not public client IP addresses.
  if (ip.includes('%')) return null;
  const version = isIP(ip);
  if (version === 4) return ip;
  if (version !== 6) return null;
  const canonical = new URL(`http://[${ip}]/`).hostname.slice(1, -1);
  // Collapse IPv4-mapped IPv6 aliases into the same bucket as IPv4.
  const mapped = /^::ffff:([0-9a-f]+):([0-9a-f]+)$/.exec(canonical);
  if (mapped) {
    const high = parseInt(mapped[1], 16);
    const low = parseInt(mapped[2], 16);
    return [high >> 8, high & 255, low >> 8, low & 255].join('.');
  }
  return canonical;
}

export function resolveClientIp(headers: Headers, config: RateLimitConfig): string {
  if (config.proxy === 'none') return config.production ? 'unknown' : 'local';
  if (config.proxy === 'vercel') {
    // Trust only when VERCEL=1 was verified from server environment configuration.
    // Vercel overwrites these headers. Prefer its platform-specific value.
    const value =
      headers.get('x-vercel-forwarded-for') ??
      headers.get('x-forwarded-for') ??
      headers.get('x-real-ip');
    return value ? (normalizeClientIp(value) ?? 'unknown') : 'unknown';
  }

  // Explicit opt-in: the origin must be reachable only through the configured
  // proxies, which append one XFF address per hop and overwrite X-Real-IP.
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded !== null) {
    const chain = forwarded.split(',');
    if (chain.length < config.trustedProxyHops) return 'unknown';
    return normalizeClientIp(chain[chain.length - config.trustedProxyHops]) ?? 'unknown';
  }
  const realIp = headers.get('x-real-ip');
  return realIp ? (normalizeClientIp(realIp) ?? 'unknown') : 'unknown';
}

function digest(secret: string, type: string, value: string): string {
  return createHmac('sha256', secret).update(`${type}\0${value}`).digest('hex');
}

export function ipRateLimitKey(ip: string, secret: string): string {
  return `results:v1:ip:${digest(secret, 'ip', ip)}`;
}

/** Invalid identifier strings still receive a bucket; validation owns validity. */
export function identifierRateLimitKey(body: unknown, secret: string): string | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  for (const [field, type] of [
    ['indexNumber', 'index'],
    ['nicNumber', 'nic'],
  ] as const) {
    if (Object.hasOwn(input, field) && typeof input[field] === 'string') {
      const value = normalizeSearchIdentifier(input[field]);
      if (value) return `results:v1:identifier:${type}:${digest(secret, type, value)}`;
    }
  }
  return null;
}
