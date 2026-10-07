import type { Metadata } from 'next';
import { AlertTriangle, BadgeCheck, CalendarDays, Clock3, Info, LockKeyhole, School } from 'lucide-react';
import { createPublicClient } from '@/lib/supabase/server';
import { SearchForm } from './_components/search-form';
import { AnimatedBackground } from '@/components/public/animated-background';
import { YearOrbit } from '@/components/public/year-orbit';

export const metadata: Metadata = {
  title: 'Results Portal',
  description: 'Search for your published O/L examination results.',
};

// Publication state must always be read at request time, never captured during a production build.
export const dynamic = 'force-dynamic';

export default async function PublicHomePage(): Promise<React.JSX.Element> {
  let currentExam: {
    id: string;
    name: string;
    year: number;
    organization_name: string;
    result_notice: string | null;
    publication_date: string | null;
  } | null = null;
  let queryFailed = false;

  try {
    const supabase = createPublicClient();
    const { data, error } = await supabase
      .from('examinations')
      .select('id, name, year, organization_name, result_notice, publication_date')
      .eq('status', 'PUBLISHED')
      .order('year', { ascending: false })
      .order('publication_date', { ascending: false })
      .limit(1);

    if (error) {
      queryFailed = true;
      console.warn('[Public Examination Query]', { code: error.code || 'NETWORK_ERROR' });
    } else {
      currentExam = data?.[0] ?? null;
    }
  } catch {
    queryFailed = true;
    console.warn('[Public Examination Query]', { code: 'NETWORK_ERROR' });
  }

  const publishedAt = currentExam?.publication_date ? new Date(currentExam.publication_date) : null;
  const publicationLabel = publishedAt && !Number.isNaN(publishedAt.getTime())
    ? new Intl.DateTimeFormat('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Colombo',
      }).format(publishedAt)
    : null;

  return (
    <div className="public-results-hero relative isolate flex flex-1 flex-col overflow-hidden px-4 py-6 sm:px-6 sm:py-10 lg:px-8 lg:py-16">
      <AnimatedBackground />
      <div className="relative z-20 mx-auto grid w-full min-w-0 max-w-2xl items-start gap-6 sm:gap-8 lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.78fr)] lg:gap-14">
        <section className="min-w-0 pt-1 lg:pt-6" aria-labelledby="portal-heading">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
            Official result service
          </p>
          <h1
            id="portal-heading"
            className="mt-3 max-w-2xl text-2xl font-bold leading-[1.15] tracking-tight text-slate-950 dark:text-white sm:mt-4 sm:text-4xl"
          >
            {currentExam?.name ?? 'Examination Results Portal'}
          </h1>

          {currentExam ? (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-3 border-l-4 border-blue-600 pl-4 sm:mt-6 sm:pl-5">
              <p className="relative isolate shrink-0 text-4xl font-extrabold tracking-[-0.05em] text-blue-600 dark:text-blue-400 min-[375px]:text-5xl sm:text-6xl">
                <YearOrbit />
                <span className="relative z-[15]">{currentExam.year}</span>
              </p>
              <div className="min-w-0 flex-1 basis-32">
                <p className="inline-flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-blue-500 dark:bg-blue-400" />
                  Published results
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {currentExam.organization_name}
                </p>
              </div>
            </div>
          ) : (
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
              A secure place for students and parents to access officially published examination
              results.
            </p>
          )}

          {currentExam && (
            <div className="mt-5 max-w-md sm:mt-7">
              <p className="hidden text-base font-medium text-slate-800 dark:text-slate-200 sm:block">
                Your performance. Your next step.
              </p>
              <p className="text-sm leading-6 text-slate-600 dark:text-slate-400 sm:mt-2">
                Access your published examination record using the index number or NIC
                registered for this examination.
              </p>
              {publicationLabel && (
                <p className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <CalendarDays aria-hidden="true" className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>Published <time dateTime={currentExam.publication_date!}>{publicationLabel}</time></span>
                </p>
              )}
            </div>
          )}

          <div className="mt-8 hidden max-w-xl border-y border-slate-200 py-5 dark:border-slate-800 lg:block">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div className="flex items-start gap-3">
                <BadgeCheck
                  aria-hidden="true"
                  strokeWidth={1.8}
                  className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Official records
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Results appear only after formal publication.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <LockKeyhole
                  aria-hidden="true"
                  strokeWidth={1.8}
                  className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Private lookup
                  </p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    Use one identifier and keep it confidential.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {currentExam?.result_notice && (
            <aside className="mt-6 flex max-w-xl items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/70 dark:bg-blue-950/30">
              <Info
                aria-hidden="true"
                strokeWidth={1.8}
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300"
              />
              <div>
                <p className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                  Result notice
                </p>
                <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-200">
                  {currentExam.result_notice}
                </p>
              </div>
            </aside>
          )}
        </section>

        <section
          aria-labelledby="result-search-heading"
          className="public-portal-surface min-w-0 overflow-hidden rounded-2xl border border-white/90 bg-white/[0.88] shadow-[0_28px_80px_-34px_rgba(30,64,175,0.34)] backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/[0.88] dark:shadow-[0_28px_80px_-34px_rgba(0,0,0,0.88)]"
        >
          <div className="border-b border-slate-200/80 bg-slate-50/65 px-4 py-5 sm:px-6 dark:border-slate-800 dark:bg-slate-900/70 sm:px-7">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm dark:bg-blue-500">
                <School aria-hidden="true" strokeWidth={1.8} className="h-5 w-5" />
              </div>
              <div>
                <h2
                  id="result-search-heading"
                  className="text-base font-bold text-slate-950 dark:text-white"
                >
                  Find your result
                </h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Use your index number or NIC number.
                </p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-7">
            {queryFailed ? (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                  <AlertTriangle aria-hidden="true" strokeWidth={1.8} className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
                  Results portal is temporarily unavailable
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
                  We could not connect to the result service. Please wait a moment and refresh this
                  page.
                </p>
              </div>
            ) : currentExam ? (
              <SearchForm
                examinationId={currentExam.id}
                examName={`${currentExam.name} ${currentExam.year}`}
              />
            ) : (
              <div className="flex flex-col items-center py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300">
                  <Clock3 aria-hidden="true" strokeWidth={1.8} className="h-7 w-7" />
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">
                  Results Not Yet Published
                </h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
                  No results have been released yet. Please check back after the official result
                  announcement.
                </p>
              </div>
            )}
          </div>

          <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-4 sm:px-6 dark:border-slate-800 dark:bg-slate-950/[0.45] sm:px-7">
            <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
              Need help? Contact your school&apos;s examination coordinator. Never share your NIC
              with anyone outside the official process.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
