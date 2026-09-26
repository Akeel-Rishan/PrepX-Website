import 'server-only';

import { createClient } from '@/lib/supabase/server';

/**
 * Verifies the signed access token, then confirms current admin membership.
 * getClaims avoids getUser's Auth API round-trip when the project uses its
 * asymmetric signing key, while the profile lookup keeps revocation immediate.
 */
export async function getAdminUserId(): Promise<string | null> {
  const client = await createClient();
  const { data, error } = await client.auth.getClaims();
  const userId = data?.claims.sub;
  if (error || !userId) return null;

  const { data: profile, error: profileError } = await client
    .from('admin_profiles')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();
  return profile && !profileError ? userId : null;
}

export async function isAdmin(): Promise<boolean> {
  return Boolean(await getAdminUserId());
}
