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

// Preserve the ordered limiter semantics in one atomic Redis operation: the
// IP bucket always consumes first, while a blocked IP does not consume the
// identifier bucket. This halves successful-search provider round trips.
export const RATE_LIMIT_PAIR_SCRIPT = `
local function check(key, limit, window)
  local count = tonumber(redis.call('GET', key) or '0')
  if count < limit + 1 then
    count = redis.call('INCR', key)
  end
  local ttl = redis.call('PTTL', key)
  if ttl < 0 then
    ttl = window * 1000
    redis.call('PEXPIRE', key, ttl)
  end
  local now = redis.call('TIME')
  local reset = math.ceil((tonumber(now[1]) * 1000 + tonumber(now[2]) / 1000 + ttl) / 1000)
  return count, reset
end

local firstLimit = tonumber(ARGV[1])
local firstCount, firstReset = check(KEYS[1], firstLimit, tonumber(ARGV[2]))
if firstCount > firstLimit then
  return {firstCount, firstReset, 0, 0}
end
local secondCount, secondReset = check(KEYS[2], tonumber(ARGV[3]), tonumber(ARGV[4]))
return {firstCount, firstReset, secondCount, secondReset}
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

  async checkPair(
    first: RateLimitInput,
    second: RateLimitInput
  ): Promise<[RateLimitResult, RateLimitResult | null]> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(this.url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([
          'EVAL',
          RATE_LIMIT_PAIR_SCRIPT,
          2,
          first.key,
          second.key,
          first.limit,
          first.windowSeconds,
          second.limit,
          second.windowSeconds,
        ]),
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
        result.length !== 4 ||
        !result.every(Number.isSafeInteger)
      ) {
        throw new Error('Invalid response');
      }
      const [firstCount, firstReset, secondCount, secondReset] = result as [
        number,
        number,
        number,
        number,
      ];
      if (
        firstCount < 1 ||
        firstCount > first.limit + 1 ||
        firstReset <= 0 ||
        (firstCount <= first.limit &&
          (secondCount < 1 || secondCount > second.limit + 1 || secondReset <= 0)) ||
        (firstCount > first.limit && (secondCount !== 0 || secondReset !== 0))
      ) {
        throw new Error('Invalid response');
      }
      const firstResult: RateLimitResult = {
        allowed: firstCount <= first.limit,
        limit: first.limit,
        remaining: Math.max(0, first.limit - firstCount),
        resetAt: firstReset,
      };
      if (!firstResult.allowed) return [firstResult, null];
      return [
        firstResult,
        {
          allowed: secondCount <= second.limit,
          limit: second.limit,
          remaining: Math.max(0, second.limit - secondCount),
          resetAt: secondReset,
        },
      ];
    } catch {
      throw new Error('Rate-limit store unavailable.');
    } finally {
      clearTimeout(timeout);
    }
  }
}
