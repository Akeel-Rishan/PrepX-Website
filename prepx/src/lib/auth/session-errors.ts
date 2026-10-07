import { isAuthApiError } from '@supabase/supabase-js';

/** Only terminal refresh failures justify discarding browser credentials. */
export function isInvalidRefreshTokenError(error: unknown): boolean {
  return isAuthApiError(error) && (
    error.code === 'refresh_token_not_found' || error.code === 'refresh_token_already_used'
  );
}
