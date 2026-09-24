import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AdminShell } from '@/components/admin/admin-shell';

export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}): Promise<JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect('/admin/login');

  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (profileError || !profile) redirect('/admin/login');

  return <AdminShell userEmail={user.email ?? 'Administrator'}>{children}</AdminShell>;
}
