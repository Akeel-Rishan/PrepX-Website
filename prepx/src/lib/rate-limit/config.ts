import 'server-only';

export interface RateLimitConfig {
  production: boolean;
  provider: 'memory' | 'upstash';
  ipLimit: number;
  ipWindowSeconds: number;
  identifierLimit: number;
  identifierWindowSeconds: number;
  secret: string;
  proxy: 'none' | 'vercel' | 'forwarded';
  trustedProxyHops: number;
  failureMode: 'closed' | 'open';
  timeoutMs: number;
  redisUrl: string;
  redisToken: string;
}

function invalidConfig(): never {
  // Never include an environment value (especially credentials) in an error.
  throw new Error('Invalid rate-limit configuration.');
}

function integer(value: string | undefined, fallback: number, max: number): number {
  if (value === undefined || value === '') return fallback;
  if (!/^[1-9][0-9]*$/.test(value)) return invalidConfig();
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > max) return invalidConfig();
  return parsed;
}

export function readRateLimitConfig(env: NodeJS.ProcessEnv = process.env): RateLimitConfig {
  const production = env.NODE_ENV === 'production' || env.VERCEL === '1';
  const provider = env.RESULT_SEARCH_RATE_LIMIT_PROVIDER || (production ? 'upstash' : 'memory');
  if (provider !== 'upstash' && provider !== 'memory') return invalidConfig();
  if (production && provider === 'memory') return invalidConfig();

  const secret =
    env.RATE_LIMIT_HASH_SECRET || (production ? '' : 'prepx-local-only-rate-limit-secret-v1');
  if (secret.trim() !== secret || secret.length < 32) return invalidConfig();

  const proxy = env.RESULT_SEARCH_TRUSTED_PROXY || (env.VERCEL === '1' ? 'vercel' : 'none');
  if (!['none', 'vercel', 'forwarded'].includes(proxy)) return invalidConfig();
  if (proxy === 'vercel' && env.VERCEL !== '1') return invalidConfig();
  const failureMode = env.RESULT_SEARCH_RATE_LIMIT_FAILURE_MODE || 'closed';
  if (failureMode !== 'closed' && failureMode !== 'open') return invalidConfig();

  const redisUrl = env.UPSTASH_REDIS_REST_URL || '';
  const redisToken = env.UPSTASH_REDIS_REST_TOKEN || '';
  if (provider === 'upstash') {
    // Only a configured Upstash HTTPS endpoint, never a request-derived URL.
    if (!/^https:\/\/[a-z0-9-]+\.upstash\.io\/?$/i.test(redisUrl) || !redisToken.trim()) {
      return invalidConfig();
    }
  }

  return {
    production,
    provider,
    ipLimit: integer(env.RESULT_SEARCH_RATE_LIMIT, 20, 100_000),
    ipWindowSeconds: integer(env.RESULT_SEARCH_RATE_WINDOW_SECONDS, 300, 86_400),
    identifierLimit: integer(env.RESULT_SEARCH_IDENTIFIER_LIMIT, 5, 100_000),
    identifierWindowSeconds: integer(env.RESULT_SEARCH_IDENTIFIER_WINDOW_SECONDS, 300, 86_400),
    secret,
    proxy: proxy as RateLimitConfig['proxy'],
    trustedProxyHops: integer(env.RESULT_SEARCH_TRUSTED_PROXY_HOPS, 1, 10),
    failureMode,
    timeoutMs: integer(env.RESULT_SEARCH_RATE_LIMIT_TIMEOUT_MS, 2000, 10_000),
    redisUrl,
    redisToken,
  };
}
