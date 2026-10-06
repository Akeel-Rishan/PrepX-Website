export interface RateLimitInput {
  key: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Unix seconds, rounded up so clients do not retry before expiry. */
  resetAt: number;
}

export interface RateLimitStore {
  check(input: RateLimitInput): Promise<RateLimitResult>;
}

export type RateLimitDecision =
  | { allowed: true; headers: Record<string, string> }
  | { allowed: false; status: 429 | 500; headers: Record<string, string> };
