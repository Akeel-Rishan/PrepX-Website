import 'server-only';

import { createHmac } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readRateLimitConfig } from '@/lib/rate-limit/config';
import { MemoryRateLimitStore } from '@/lib/rate-limit/memory-store';
import { createResultSearchLimiter } from '@/lib/rate-limit/result-search';
import type { RateLimitDecision as ResultSearchRateLimitDecision } from '@/lib/rate-limit/types';
import { UpstashRateLimitStore } from '@/lib/rate-limit/upstash-store';
import type { Database } from '@/types/database';

const DEFAULT_WINDOW_SECONDS = 10 * 60;
const DEFAULT_MAX_ATTEMPTS = 10;
const MAX_MEMORY_BUCKETS = 10_000;

interface MemoryBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
  source: 'database' | 'memory';
}

const memoryBuckets = new Map<string, MemoryBucket>();
let resultSearchLimiter: ReturnType<typeof createResultSearchLimiter> | undefined;

/** Distributed, IP-and-identifier limiter used by the public result endpoint. */
export async function checkResultSearchRateLimit(
  headers: Headers,
  body: unknown
): Promise<ResultSearchRateLimitDecision> {
  if (!resultSearchLimiter) {
    try {
      const config = readRateLimitConfig();
      const store =
        config.provider === 'upstash'
          ? new UpstashRateLimitStore(config.redisUrl, config.redisToken, config.timeoutMs)
          : new MemoryRateLimitStore();
      resultSearchLimiter = createResultSearchLimiter(config, store);
    } catch {
      console.error('[Result Search Rate Limit] Invalid configuration; request blocked.');
      return { allowed: false, status: 500, headers: {} };
    }
  }
  return resultSearchLimiter(headers, body);
}

function boundedInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, max) : fallback;
}

function getRateLimitConfiguration(): { maxAttempts: number; windowSeconds: number } {
  return {
    maxAttempts: boundedInteger(
      process.env.RESULT_RATE_LIMIT_MAX_ATTEMPTS,
      DEFAULT_MAX_ATTEMPTS,
      100
    ),
    windowSeconds: boundedInteger(
      process.env.RESULT_RATE_LIMIT_WINDOW_SECONDS,
      DEFAULT_WINDOW_SECONDS,
      24 * 60 * 60
    ),
  };
}

function pruneMemoryBuckets(now: number): void {
  if (memoryBuckets.size < MAX_MEMORY_BUCKETS) return;
  for (const [key, bucket] of memoryBuckets) {
    if (bucket.resetAt <= now) memoryBuckets.delete(key);
  }
  if (memoryBuckets.size < MAX_MEMORY_BUCKETS) return;
  const oldestKey = memoryBuckets.keys().next().value as string | undefined;
  if (oldestKey) memoryBuckets.delete(oldestKey);
}

/** Process-local fallback used when the database migration is unavailable. */
export function consumeMemoryRateLimit(
  key: string,
  now: number,
  maxAttempts: number,
  windowSeconds: number
): RateLimitDecision {
  pruneMemoryBuckets(now);
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    memoryBuckets.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: 0, source: 'memory' };
  }

  existing.count += 1;
  const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    allowed: existing.count <= maxAttempts,
    retryAfterSeconds: existing.count <= maxAttempts ? 0 : retryAfterSeconds,
    source: 'memory',
  };
}

function getClientAddress(request: Request): string {
  const cloudflareAddress = request.headers.get('cf-connecting-ip')?.trim();
  const realAddress = request.headers.get('x-real-ip')?.trim();
  const forwardedAddress = request.headers.get('x-forwarded-for')?.split(',', 1)[0]?.trim();
  return cloudflareAddress || realAddress || forwardedAddress || 'unknown-client';
}

/** Hash network identifiers before persistence so the database never stores raw IPs. */
export function getPublicSearchRateLimitKey(request: Request): string {
  const secret =
    process.env.RESULT_RATE_LIMIT_SECRET?.trim() ||
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    'prepx-local-rate-limit';
  return createHmac('sha256', secret).update(getClientAddress(request)).digest('hex');
}

export async function checkPublicSearchRateLimit(
  client: SupabaseClient<Database>,
  key: string
): Promise<RateLimitDecision> {
  const { maxAttempts, windowSeconds } = getRateLimitConfiguration();
  try {
    const { data, error } = await client.rpc('check_result_search_rate_limit', {
      p_key_hash: key,
      p_max_requests: maxAttempts,
      p_window_seconds: windowSeconds,
    });

    const decision = data?.[0];
    if (!error && decision) {
      return {
        allowed: decision.allowed,
        retryAfterSeconds: Math.max(0, decision.retry_after_seconds),
        source: 'database',
      };
    }

    console.warn('[Public Result Rate Limit]', { reason: error?.code ?? 'empty-response' });
  } catch {
    console.warn('[Public Result Rate Limit]', { reason: 'network' });
  }
  return consumeMemoryRateLimit(key, Date.now(), maxAttempts, windowSeconds);
}
