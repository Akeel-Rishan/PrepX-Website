import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<React.JSX.Element> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) redirect('/admin/login');

  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('user_id', claims.sub)
    .single();
  if (profileError || !profile) redirect('/admin/login');

  return (
    <AdminShell userEmail={typeof claims.email === 'string' ? claims.email : 'Administrator'}>
      {children}
    </AdminShell>
  );
}
