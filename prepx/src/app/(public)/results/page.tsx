'use client';

import { useEffect } from 'react';
import { FileSearch, ShieldCheck } from 'lucide-react';
import { usePublicResult } from '@/components/public/result-provider';
import { PublicStatusPage } from '@/components/public/public-status-page';
import { PrintActions } from './_components/print-actions';
import { PrintHeader } from './_components/print-header';
import { GradesTable, OverallStatusCard } from './_components/result-details';

export default function ResultsPage() {
  const { result, ready } = usePublicResult();

  useEffect(() => {
    document.title = 'Examination Result | PrepX';
  }, []);

  useEffect(() => {
    function updatePrintDate() {
      const stamp = document.getElementById('print-date-stamp');
      if (stamp)
        stamp.textContent = `Printed: ${new Date().toLocaleString('en-LK', {
          timeZone: 'Asia/Colombo',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}`;
    }
    updatePrintDate();
    window.addEventListener('beforeprint', updatePrintDate);
    return () => window.removeEventListener('beforeprint', updatePrintDate);
  }, [result]);

  if (!ready)
    return (
      <div
        role="status"
        className="px-4 py-12 text-center text-sm text-slate-600 dark:text-slate-300"
      >
        Loading result…
      </div>
    );
  if (!result)
    return (
      <PublicStatusPage
        icon={FileSearch}
        label="Examination results"
        title="Search for your result"
        description="No result is available in this tab. Please search again after refreshing or opening a new tab."
        secondaryLabel="Search again"
      />
    );

  const info = [
    ['Student full name', result.studentName],
    ['Index number', result.indexNumber],
    ['Masked NIC', result.maskedNic ?? 'Not available'],
    ['School', result.schoolName],
    ...(result.examinationCenter ? [['Examination center', result.examinationCenter]] : []),
    ['Examination', `${result.examinationName} · ${result.examinationYear}`],
  ];

  return (
    <div className="result-print-wrapper mx-auto w-full max-w-3xl px-3 py-6 sm:px-6 sm:py-10">
      <p role="status" className="sr-only no-print">
        Your examination result is ready.
      </p>
      <p className="no-print mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
        Examination results / Student record
      </p>
      <article className="result-card overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[var(--app-shadow)] dark:border-slate-700 dark:bg-slate-900">
        <div className="no-print border-b border-blue-900 bg-[#0b172a] px-4 py-6 sm:px-7 sm:py-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold tracking-wide text-blue-200">
              PrepX ’{String(result.examinationYear).slice(-2)}
            </p>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-400/40 bg-blue-400/10 px-2.5 py-1 text-xs font-semibold text-blue-100">
              <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
              Published
            </span>
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Examination result
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{result.examinationName}</p>
          <p className="mt-3 text-sm font-semibold text-amber-200">{result.examinationYear}</p>
        </div>
        <div className="result-card-content px-4 py-5 sm:px-7 sm:py-7">
          <PrintHeader
            examName={result.examinationName}
            examYear={result.examinationYear}
            orgName="PrepX Institute"
          />
          <section aria-labelledby="student-details-heading" className="print-student-info">
            <h2
              id="student-details-heading"
              className="no-print mb-3 text-base font-bold text-slate-950 dark:text-white"
            >
              Student details
            </h2>
            <dl>
              {info.map(([label, value]) => (
                <div
                  key={label}
                  className="print-info-row flex flex-col gap-1 border-b border-slate-100 py-3 text-sm dark:border-slate-800 min-[375px]:flex-row min-[375px]:gap-3"
                >
                  <dt className="print-info-label shrink-0 font-medium text-slate-500 dark:text-slate-400 min-[375px]:w-[35%]">
                    {label}
                  </dt>
                  <dd className="print-info-value min-w-0 flex-1 break-words font-semibold text-slate-900 dark:text-slate-100">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
          <GradesTable grades={result.grades} />
          <OverallStatusCard status={result.overallStatus} />
          <div className="print-notice print-only">
            * Results are official as published. Contact your school or examination center for
            queries, corrections, or official certified copies.
          </div>
        </div>
      </article>
      <PrintActions className="mt-5" />
      <div className="print-only print-doc-footer">
        <span>PrepX Examination System</span>
        <span>This result was retrieved via the PrepX online portal.</span>
      </div>
    </div>
  );
}
