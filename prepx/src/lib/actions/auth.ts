'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSafeRedirect } from '@/lib/auth/redirect';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export interface LoginActionState {
  error?: string;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) {
    return { error: 'Please enter a valid email and password.' };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    return { error: 'Invalid email or password.' };
  }

  // Fail closed if the administrator lookup fails or no profile exists.
  try {
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin
      .from('admin_profiles')
      .select('id')
      .eq('user_id', data.user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      return { error: 'You are not authorized to access this area.' };
    }
  } catch {
    await supabase.auth.signOut();
    return { error: 'You are not authorized to access this area.' };
  }

  // Keep the redirect outside the catch: Next.js redirects throw internally.
  redirect(getSafeRedirect(formData.get('redirectTo')));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/admin/login');
}
