import type { Metadata } from 'next';
import Image from 'next/image';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = {
  title: 'Admin Login | PrepX',
  description: 'PrepX Administrator Login',
};

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}

export default async function AdminLoginPage({ searchParams }: LoginPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const redirectTo =
    typeof params.redirectTo === 'string' ? params.redirectTo : undefined;
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-950 to-blue-800 p-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-blue-900/50 p-1">
            <Image
              src="/brand/prepx-mark.png"
              alt=""
              aria-hidden="true"
              width={72}
              height={72}
              className="h-full w-full scale-125 object-contain"
              priority
            />
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
