'use client';

import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CalendarDays,
  GraduationCap,
  Hash,
  IdCard,
  MapPin,
  Printer,
  School,
} from 'lucide-react';
import { GRADE_LABELS, type Grade, type ResultStatus } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { PublicStudentResult } from '@/types';

interface ResultCardProps {
  result: PublicStudentResult;
}

const STATUS_STYLES: Record<ResultStatus, string> = {
  Passed:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300',
  'Not Passed':
    'border-red-200 bg-red-50 text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-300',
  Absent:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300',
  Incomplete:
    'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300',
};

const GRADE_STYLES: Record<Grade, string> = {
  A: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300',
  B: 'bg-blue-50 text-blue-700 dark:bg-blue-400/10 dark:text-blue-300',
  C: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-400/10 dark:text-cyan-300',
  S: 'bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300',
  W: 'bg-red-50 text-red-700 dark:bg-red-400/10 dark:text-red-300',
  AB: 'bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-300',
};

export function ResultCard({ result }: ResultCardProps): React.JSX.Element {
  return (
    <section className="public-portal-surface mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 shadow-[0_28px_80px_-34px_rgba(30,64,175,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-[#0b1424]/95 dark:shadow-[0_30px_90px_-36px_rgba(0,0,0,0.9)]">
      <header className="border-b border-slate-200/80 px-6 py-6 dark:border-white/[0.07] sm:px-8">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_12px_28px_-14px_rgba(37,99,235,0.9)]">
              <GraduationCap aria-hidden="true" strokeWidth={1.8} className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                Official examination result
              </p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
                {result.examinationName}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                <CalendarDays aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
                {result.examinationYear}
              </p>
            </div>
          </div>

          <div
            className={cn(
              'inline-flex w-fit items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold',
              STATUS_STYLES[result.overallStatus]
            )}
          >
            <BadgeCheck aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
            {result.overallStatus}
          </div>
        </div>
      </header>

      <div className="px-6 py-6 sm:px-8 sm:py-8">
        <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <StudentDetail icon={IdCard} label="Candidate" value={result.studentName} />
          <StudentDetail icon={Hash} label="Index number" value={result.indexNumber} mono />
          {result.maskedNic && (
            <StudentDetail icon={IdCard} label="NIC number" value={result.maskedNic} mono />
          )}
          <StudentDetail icon={School} label="School" value={result.schoolName} />
          {result.examinationCenter && (
            <StudentDetail
              icon={MapPin}
              label="Examination center"
              value={result.examinationCenter}
            />
          )}
        </div>

        <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200/90 dark:border-white/[0.08]">
          <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-white/[0.07] dark:bg-white/[0.025]">
            <Building2
              aria-hidden="true"
              strokeWidth={1.8}
              className="h-4 w-4 text-blue-600 dark:text-blue-400"
            />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Subject results
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200/80 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-white/[0.07] dark:text-slate-400">
                  <th scope="col" className="px-4 py-3">
                    Subject
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Code
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Grade
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 dark:divide-white/[0.06]">
                {result.grades.map((entry) => (
                  <tr key={`${entry.subjectCode ?? entry.subjectName}-${entry.displayOrder}`}>
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-900 dark:text-slate-200">
                      {entry.subjectName}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-500 dark:text-slate-400">
                      {entry.subjectCode ?? 'Not assigned'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      {entry.grade ? (
                        <span
                          className={cn(
                            'inline-flex min-w-24 items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-semibold',
                            GRADE_STYLES[entry.grade]
                          )}
                          title={GRADE_LABELS[entry.grade]}
                        >
                          {entry.grade} - {GRADE_LABELS[entry.grade]}
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                          Not available
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-200 dark:hover:bg-white/[0.06] dark:focus-visible:ring-offset-[#0b1424]"
          >
            <ArrowLeft aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
            Search another result
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#0b1424]"
          >
            <Printer aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
            Print result
          </button>
        </div>
      </div>
    </section>
  );
}

interface StudentDetailProps {
  icon: typeof IdCard;
  label: string;
  value: string;
  mono?: boolean;
}

function StudentDetail({
  icon: Icon,
  label,
  value,
  mono = false,
}: StudentDetailProps): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-400/[0.08] dark:text-blue-400">
        <Icon aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p
          className={cn(
            'mt-1 break-words text-sm font-semibold text-slate-900 dark:text-slate-200',
            mono && 'font-mono tracking-wide'
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}
