'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginAction } from '@/lib/actions/auth';

function SubmitButton(): React.JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button
      variant="primary"
      size="lg"
      loading={pending}
      type="submit"
      className="w-full bg-slate-950 shadow-lg shadow-slate-950/10 hover:bg-slate-800 focus-visible:ring-slate-900"
    >
      {pending ? (
        'Verifying access...'
      ) : (
        <>
          Sign in securely
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </>
      )}
    </Button>
  );
}

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps): React.JSX.Element {
  const [state, formAction] = useActionState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-600">
          Admin portal
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Welcome back</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Sign in with your administrator account to continue to PrepX.
        </p>
      </div>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <div className="space-y-4">
        <Input
          id="email"
          label="Email address"
          type="email"
          name="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="admin@example.com"
          className="h-12 rounded-xl border-slate-300 bg-slate-50/60 pl-4 focus:bg-white"
        />
        <Input
          id="password"
          label="Password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autoComplete="current-password"
          required
          placeholder="Enter your password"
          className="h-12 rounded-xl border-slate-300 bg-slate-50/60 pl-4 focus:bg-white"
          rightElement={
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              aria-pressed={showPassword}
              aria-controls="password"
              className="rounded-md p-1 text-slate-400 transition-colors hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" className="h-5 w-5" />
              ) : (
                <Eye aria-hidden="true" className="h-5 w-5" />
              )}
            </button>
          }
        />
      </div>
      <SubmitButton />
      <p className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-600" />
        Secure, encrypted administrator sign-in
      </p>
    </form>
  );
}
