import type { Metadata } from 'next';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  Clock3,
  Info,
  LockKeyhole,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { SearchForm } from './_components/search-form';

export const metadata: Metadata = {
  title: 'Results Portal',
  description: 'Search for your published O/L examination results.',
};

// Publication state must always be read at request time, never captured during a production build.
export const dynamic = 'force-dynamic';
export const revalidate = 0;

interface PublishedExamination {
  id: string;
  name: string;
  year: number;
  organization_name: string;
  result_notice: string | null;
}

export default async function PublicHomePage(): Promise<React.JSX.Element> {
  let currentExam: PublishedExamination | null = null;
  let queryFailed = false;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('examinations')
      .select('id, name, year, organization_name, result_notice')
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

  // Only a row with PUBLISHED status can reach this value because public RLS and the query both
  // enforce that state. The newest published examination year becomes the public search target.
  const publishedExam = currentExam;

  return (
    <div className="flex flex-1 px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
      <div className="mx-auto grid w-full max-w-[1380px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(430px,530px)] lg:gap-16 xl:gap-24">
        <section className="max-w-[700px]" aria-labelledby="portal-heading">
          {publishedExam && (
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-blue-300/60 bg-blue-100/60 px-3.5 py-2 text-blue-800 shadow-sm shadow-blue-900/[0.03] dark:border-blue-400/15 dark:bg-blue-400/[0.07] dark:text-blue-200 dark:shadow-none">
              <span
                aria-hidden="true"
                className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/10 dark:bg-emerald-400"
              />
              <span className="text-xs font-semibold uppercase tracking-[0.12em]">
                Results are now available
              </span>
            </div>
          )}

          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-400">
            Official result service
          </p>
          <h1
            id="portal-heading"
            className="mt-4 max-w-[680px] text-[38px] font-bold leading-[1.08] tracking-[-0.04em] text-slate-950 dark:text-white sm:text-[50px] lg:text-[56px]"
          >
            <span className="block">{publishedExam?.name ?? 'Examination Results Portal'}</span>
            {publishedExam && (
              <span className="block bg-gradient-to-r from-blue-700 to-slate-600 bg-clip-text text-transparent dark:from-white dark:to-slate-400">
                {publishedExam.year} Results
              </span>
            )}
          </h1>
          <p className="mt-6 max-w-[590px] text-base leading-7 text-slate-600 dark:text-slate-400">
            Access your officially published examination results securely using your candidate index
            number or NIC number.
          </p>

          {publishedExam && (
            <div className="mt-8 flex flex-wrap gap-3">
              <ExamFact
                icon={CalendarDays}
                label="Examination"
                value={String(publishedExam.year)}
              />
              <ExamFact icon={BadgeCheck} label="Status" value="Published" />
              <ExamFact
                icon={Building2}
                label="Organized by"
                value={publishedExam.organization_name}
              />
            </div>
          )}

          <div className="mt-9 grid max-w-[650px] gap-5 border-t border-slate-300/70 pt-7 dark:border-white/[0.08] sm:grid-cols-2">
            <TrustItem
              icon={ShieldCheck}
              title="Official records"
              description="Only formally published examination records are displayed."
            />
            <TrustItem
              icon={LockKeyhole}
              title="Secure lookup"
              description="Your details are used only to retrieve your examination result."
            />
          </div>

          {publishedExam?.result_notice && (
            <aside className="mt-6 flex max-w-[650px] items-start gap-3 rounded-2xl border border-blue-200/80 bg-blue-50/75 p-4 backdrop-blur-sm dark:border-blue-400/15 dark:bg-blue-400/[0.07]">
              <Info
                aria-hidden="true"
                strokeWidth={1.8}
                className="mt-0.5 h-4 w-4 shrink-0 text-blue-700 dark:text-blue-300"
              />
              <div>
                <p className="text-xs font-semibold text-blue-950 dark:text-blue-100">
                  Result notice
                </p>
                <p className="mt-1 text-sm leading-6 text-blue-800 dark:text-blue-200">
                  {publishedExam.result_notice}
                </p>
              </div>
            </aside>
          )}
        </section>

        <div className="w-full">
          <section
            aria-labelledby="result-search-heading"
            className="public-portal-surface relative isolate overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_28px_80px_-34px_rgba(30,64,175,0.45)] backdrop-blur-xl dark:border-white/[0.1] dark:bg-[#0b1424]/95 dark:shadow-[0_30px_90px_-36px_rgba(0,0,0,0.9)]"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_10%_0%,rgba(37,99,235,0.08),transparent_34%)] dark:bg-[radial-gradient(circle_at_10%_0%,rgba(59,130,246,0.1),transparent_38%)]"
            />

            <div className="border-b border-slate-200/80 px-6 py-6 dark:border-white/[0.07] sm:px-7">
              <div className="flex items-start justify-between gap-5">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-blue-500/20 bg-blue-600 text-white shadow-[0_10px_30px_-12px_rgba(37,99,235,0.8)]">
                    <Search aria-hidden="true" strokeWidth={1.8} className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="result-search-heading"
                      className="text-xl font-bold tracking-tight text-slate-950 dark:text-white"
                    >
                      Find your result
                    </h2>
                    <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-400">
                      {publishedExam
                        ? `Search the published ${publishedExam.year} examination records.`
                        : 'Published examination records will appear here.'}
                    </p>
                  </div>
                </div>

                <div className="hidden shrink-0 items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/70 px-2.5 py-2 text-[11px] font-semibold text-slate-600 shadow-sm dark:border-white/[0.08] dark:bg-white/[0.035] dark:text-slate-300 sm:flex">
                  <ShieldCheck
                    aria-hidden="true"
                    strokeWidth={1.8}
                    className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400"
                  />
                  Secure portal
                </div>
              </div>
            </div>

            <div className="px-6 py-6 sm:px-7 sm:py-7">
              {queryFailed ? (
                <StatusMessage
                  icon={AlertTriangle}
                  title="Result service temporarily unavailable"
                  description="We could not connect to the result service. Please wait a moment and try again."
                />
              ) : publishedExam ? (
                <SearchForm
                  examinationId={publishedExam.id}
                  examName={`${publishedExam.name} ${publishedExam.year}`}
                />
              ) : (
                <StatusMessage
                  icon={Clock3}
                  title="Results Not Yet Published"
                  description="No results have been released yet. Please check back after the official announcement."
                />
              )}
            </div>

            <div className="border-t border-slate-200/80 bg-slate-50/80 px-6 py-4 dark:border-white/[0.07] dark:bg-[#101b2d] sm:px-7">
              <div className="flex items-start gap-3">
                <LockKeyhole
                  aria-hidden="true"
                  strokeWidth={1.8}
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400"
                />
                <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
                  Your information is used only for result verification. Never share your NIC or
                  index number with unauthorized persons.
                </p>
              </div>
            </div>
          </section>

          <p className="mt-5 text-center text-xs text-slate-500 dark:text-slate-400">
            Need assistance? Contact your school examination coordinator.
          </p>
        </div>
      </div>
    </div>
  );
}

interface IconTextProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

function TrustItem({ icon: Icon, title, description }: IconTextProps): React.JSX.Element {
  return (
    <div className="flex gap-3.5">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-300/60 bg-blue-100/60 text-blue-700 dark:border-blue-400/15 dark:bg-blue-400/[0.06] dark:text-blue-400">
        <Icon aria-hidden="true" strokeWidth={1.8} className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-200">{title}</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

interface ExamFactProps {
  icon: LucideIcon;
  label: string;
  value: string;
}

function ExamFact({ icon: Icon, label, value }: ExamFactProps): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/90 bg-white/60 px-4 py-3 shadow-sm shadow-blue-950/[0.03] backdrop-blur-sm dark:border-white/[0.08] dark:bg-white/[0.035] dark:shadow-none">
      <Icon
        aria-hidden="true"
        strokeWidth={1.8}
        className="h-4 w-4 text-blue-700 dark:text-blue-400"
      />
      <div>
        <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <p className="mt-0.5 max-w-[13rem] truncate text-xs font-semibold text-slate-800 dark:text-slate-300">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusMessage({ icon: Icon, title, description }: IconTextProps): React.JSX.Element {
  return (
    <div className="flex flex-col items-center py-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100/70 text-blue-700 dark:bg-blue-400/[0.08] dark:text-blue-300">
        <Icon aria-hidden="true" strokeWidth={1.8} className="h-7 w-7" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-950 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}
