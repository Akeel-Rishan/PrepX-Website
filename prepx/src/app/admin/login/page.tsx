import type { Metadata } from 'next';
import Image from 'next/image';
import { BarChart3, LockKeyhole, ShieldCheck } from 'lucide-react';
import { LoginForm } from './_components/login-form';

export const metadata: Metadata = {
  title: 'Admin Login | PrepX',
  description: 'PrepX Administrator Login',
};

interface LoginPageProps {
  searchParams: Promise<{ redirectTo?: string | string[] }>;
}

const FEATURES = [
  {
    icon: ShieldCheck,
    title: 'Publication safeguards',
    description: 'Validate examination data before results go live.',
  },
  {
    icon: BarChart3,
    title: 'Complete result oversight',
    description: 'Manage students, grades, reviews, and publishing in one place.',
  },
  {
    icon: LockKeyhole,
    title: 'Protected administration',
    description: 'Access is restricted to authorized administrators.',
  },
] as const;

export default async function AdminLoginPage({
  searchParams,
}: LoginPageProps): Promise<React.JSX.Element> {
  const params = await searchParams;
  const redirectTo = typeof params.redirectTo === 'string' ? params.redirectTo : undefined;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#071426] text-white">
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -left-48 -top-48 h-[32rem] w-[32rem] rounded-full bg-blue-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-64 -right-40 h-[38rem] w-[38rem] rounded-full bg-indigo-500/20 blur-3xl"
      />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center p-4 sm:p-8 lg:p-12">
        <section className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.06] shadow-[0_32px_100px_rgba(0,0,0,0.38)] backdrop-blur-sm lg:min-h-[680px] lg:grid-cols-[1.08fr_0.92fr]">
          <div className="relative hidden flex-col justify-between overflow-hidden p-12 lg:flex xl:p-16">
            <div
              aria-hidden="true"
              className="absolute -right-24 top-20 h-72 w-72 rounded-full border border-blue-300/10"
            />
            <div
              aria-hidden="true"
              className="absolute -right-6 top-36 h-44 w-44 rounded-full border border-blue-300/10"
            />

            <div className="relative">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 p-1.5 shadow-lg">
                  <Image
                    src="/brand/prepx-mark.png"
                    alt=""
                    aria-hidden="true"
                    width={56}
                    height={56}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight">PrepX</p>
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-blue-200/80">
                    Result management
                  </p>
                </div>
              </div>

              <div className="mt-20 max-w-xl">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-blue-300">
                  Examination administration
                </p>
                <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
                  Publish results with clarity and confidence.
                </h1>
                <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                  A secure workspace for managing examination records from initial setup through
                  final publication.
                </p>
              </div>
            </div>

            <div className="relative grid gap-4">
              {FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="mt-0.5 rounded-xl border border-white/10 bg-white/[0.07] p-2.5 text-blue-300">
                    <Icon aria-hidden="true" className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="mt-1 text-sm leading-5 text-slate-400">{description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center bg-white p-6 text-slate-900 sm:p-10 lg:p-14 xl:p-16">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-9 flex items-center gap-3 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-slate-900 p-1.5 shadow-md">
                  <Image
                    src="/brand/prepx-mark.png"
                    alt=""
                    aria-hidden="true"
                    width={48}
                    height={48}
                    className="h-full w-full object-contain"
                    priority
                  />
                </div>
                <div>
                  <p className="text-xl font-bold tracking-tight text-slate-950">PrepX</p>
                  <p className="text-xs font-medium text-slate-500">Examination Result System</p>
                </div>
              </div>

              <LoginForm redirectTo={redirectTo} />

              <div className="mt-8 border-t border-slate-200 pt-6 text-center">
                <p className="text-xs leading-5 text-slate-500">
                  PrepX Examination Management System
                  <br />
                  Authorized administrative access only
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
