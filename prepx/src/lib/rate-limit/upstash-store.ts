import 'server-only';
import type { RateLimitInput, RateLimitResult, RateLimitStore } from '@/lib/rate-limit/types';

// One atomic command: concurrent instances cannot lose increments or leave a
// newly created counter without expiry. Denied attempts do not extend the TTL.
export const RATE_LIMIT_SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
local limit = tonumber(ARGV[1])
if count < limit + 1 then
  count = redis.call('INCR', KEYS[1])
end
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  ttl = tonumber(ARGV[2]) * 1000
  redis.call('PEXPIRE', KEYS[1], ttl)
end
local now = redis.call('TIME')
local reset = math.ceil((tonumber(now[1]) * 1000 + tonumber(now[2]) / 1000 + ttl) / 1000)
return {count, reset}
`;

export class UpstashRateLimitStore implements RateLimitStore {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly timeoutMs = 2000,
    private readonly fetcher: typeof fetch = fetch
  ) {}

  async check({ key, limit, windowSeconds }: RateLimitInput): Promise<RateLimitResult> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(this.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EVAL', RATE_LIMIT_SCRIPT, 1, key, limit, windowSeconds]),
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal,
      });
      if (!response.ok) throw new Error('Unavailable');
      const payload: unknown = await response.json();
      const result =
        typeof payload === 'object' &&
        payload !== null &&
        !('error' in payload) &&
        'result' in payload
          ? payload.result
          : null;
      if (
        !Array.isArray(result) ||
        result.length !== 2 ||
        !Number.isSafeInteger(result[0]) ||
        !Number.isSafeInteger(result[1])
      ) {
        throw new Error('Invalid response');
      }
      const [count, resetAt] = result as [number, number];
      if (count < 1 || count > limit + 1 || resetAt <= 0) throw new Error('Invalid response');
      return { allowed: count <= limit, limit, remaining: Math.max(0, limit - count), resetAt };
    } catch {
      // No retries: an uncertain request might already have incremented Redis.
      throw new Error('Rate-limit store unavailable.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
