import type { Metadata } from 'next';
import { ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = {
  title: 'Admin Login | PrepX',
  description: 'PrepX Administrator Login',
};

interface LoginPageProps {
  searchParams: { redirectTo?: string | string[] };
}

export default function AdminLoginPage({ searchParams }: LoginPageProps): JSX.Element {
  const redirectTo =
    typeof searchParams.redirectTo === 'string' ? searchParams.redirectTo : undefined;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-950 to-blue-800 p-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 w-fit rounded-full bg-blue-900/50 p-3">
            <ShieldCheck aria-hidden="true" className="h-12 w-12 text-blue-200" />
          </div>
          <p className="text-3xl font-bold text-white">PrepX</p>
          <p className="mt-1 text-sm text-blue-200">Examination Result System</p>
        </div>
        <Card className="w-full rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <CardContent>
            <LoginForm redirectTo={redirectTo} />
          </CardContent>
          <CardFooter>
            <p className="text-center text-xs text-gray-400">PrepX Examination Management System</p>
            <p className="mt-1 text-center text-xs text-gray-500">
              Secure administrative access only
            </p>
          </CardFooter>
        </Card>
      </div>
    </main>
  );
}
