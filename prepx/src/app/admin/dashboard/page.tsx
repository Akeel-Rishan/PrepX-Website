import { redirect } from 'next/navigation';
import { LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { LogoutButton } from './_components/logout-button';

export default async function DashboardPage(): Promise<JSX.Element> {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect('/admin/login');

  // Verify membership on direct visits as well as during login.
  const { data: profile, error: profileError } = await supabase
    .from('admin_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (profileError || !profile) redirect('/admin/login');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-3 sm:h-16 sm:py-0">
        <span className="font-semibold text-gray-900">PrepX Admin</span>
        <div className="flex min-w-0 items-center gap-3">
          <span className="min-w-0 break-all text-sm text-gray-600">{user.email}</span>
          <div className="shrink-0">
            <LogoutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-gray-500">Welcome back. Full dashboard UI is coming in Phase 3.</p>
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-8">
          <LayoutDashboard aria-hidden="true" className="mx-auto h-12 w-12 text-gray-300" />
          <p className="mt-3 text-center text-sm text-gray-400">Admin dashboard</p>
        </div>
      </main>
    </div>
  );
}
