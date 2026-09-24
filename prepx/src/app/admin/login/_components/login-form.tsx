'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Eye, EyeOff } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginAction } from '@/lib/actions/auth';

function SubmitButton(): JSX.Element {
  const { pending } = useFormStatus();
  return (
    <Button variant="primary" size="lg" loading={pending} type="submit" className="w-full">
      {pending ? 'Signing in...' : 'Sign In'}
    </Button>
  );
}

interface LoginFormProps {
  redirectTo?: string;
}

export function LoginForm({ redirectTo }: LoginFormProps): JSX.Element {
  const [state, formAction] = useFormState(loginAction, {});
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      <h1 className="text-center text-xl font-semibold text-gray-900">Administrator Login</h1>
      {state.error && <Alert variant="error">{state.error}</Alert>}
      {redirectTo && <input type="hidden" name="redirectTo" value={redirectTo} />}
      <Input
        id="email"
        label="Email Address"
        type="email"
        name="email"
        autoComplete="email"
        required
        className="h-11"
      />
      <Input
        id="password"
        label="Password"
        type={showPassword ? 'text' : 'password'}
        name="password"
        autoComplete="current-password"
        required
        className="h-11"
        rightElement={
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
            aria-controls="password"
            className="rounded p-1 text-gray-500 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="h-5 w-5" />
            ) : (
              <Eye aria-hidden="true" className="h-5 w-5" />
            )}
          </button>
        }
      />
      <SubmitButton />
    </form>
  );
}
