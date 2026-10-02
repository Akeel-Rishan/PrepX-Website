'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';
import { z } from 'zod';
import { GRADES, GRADE_LABELS, RESULT_STATUSES } from '@/lib/constants';
import { getResultStatusStyle } from '@/lib/result-utils';
import { cn } from '@/lib/utils';
import type { PublicStudentResult } from '@/types';
import { PrintActions } from './_components/print-actions';
import { PrintHeader } from './_components/print-header';

const storedResultSchema = z.object({
  studentName: z.string(), indexNumber: z.string(), maskedNic: z.string().nullable(),
  schoolName: z.string(), examinationCenter: z.string().nullable(),
  examinationName: z.string(), examinationYear: z.number().int(),
  overallStatus: z.enum(RESULT_STATUSES),
  grades: z.array(z.object({
    subjectId: z.string(), subjectName: z.string(), subjectCode: z.string().nullable(),
    displayOrder: z.number(), grade: z.enum(GRADES).nullable(),
  })),
});

const GRADE_BADGE_STYLES = {
  A: 'bg-green-100 text-green-800 border-green-300',
  B: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  C: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  S: 'bg-blue-100 text-blue-800 border-blue-300',
  W: 'bg-red-100 text-red-700 border-red-300',
  AB: 'bg-gray-100 text-gray-600 border-gray-300',
};
const STATUS_ICONS = { check: CheckCircle2, x: XCircle, clock: Clock, alert: AlertCircle };

export default function ResultsPage() {
  const [result, setResult] = useState<PublicStudentResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    document.title = 'Result Display | PrepX';
    try {
      const parsed = storedResultSchema.safeParse(JSON.parse(sessionStorage.getItem('prepx_result') || 'null'));
      if (parsed.success) setResult(parsed.data);
    } catch {
      // Missing, unavailable, or malformed storage should offer a fresh search.
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    function updatePrintDate() {
      const stamp = document.getElementById('print-date-stamp');
      if (stamp) stamp.textContent = `Printed: ${new Date().toLocaleString('en-LK', {
        timeZone: 'Asia/Colombo', day: 'numeric', month: 'long', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
      })}`;
    }
    updatePrintDate();
    window.addEventListener('beforeprint', updatePrintDate);
    return () => window.removeEventListener('beforeprint', updatePrintDate);
  }, [result]);

  if (!result) return (
    <div className="mx-auto w-full max-w-xl px-4 py-12 text-center">
      <h1 className="text-xl font-bold">{loaded ? 'Search for your result' : 'Loading result…'}</h1>
      {loaded && <><p className="mt-3 text-sm text-gray-500">No result is available in this tab. Search again to view and print your result.</p><Link href="/" className="mt-5 inline-block font-semibold text-blue-600">Back to Search</Link></>}
    </div>
  );

  const status = getResultStatusStyle(result.overallStatus);
  const StatusIcon = STATUS_ICONS[status.icon];
  const info = [
    ['Student Name', result.studentName], ['Index Number', result.indexNumber],
    ['NIC Number', result.maskedNic ?? '—'], ['School', result.schoolName],
    ...(result.examinationCenter ? [['Examination Center', result.examinationCenter]] : []),
    ['Examination', `${result.examinationName} · ${result.examinationYear}`],
  ];

  return (
    <div className="result-print-wrapper mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
      <section className="result-card rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-8">
        <PrintHeader examName={result.examinationName} examYear={result.examinationYear} orgName="PrepX Institute" />
        <h1 className="no-print mb-5 text-xl font-bold">Examination Result</h1>
        <div className={cn('print-status-banner mb-5 flex items-center gap-3 rounded-xl border-2 px-5 py-4', status.bgColor, status.borderColor, status.textColor)}>
          <StatusIcon aria-hidden="true" className="h-7 w-7 shrink-0" />
          <div><p className="text-xs font-semibold uppercase tracking-wide">Overall Status</p><p className="text-lg font-bold">{status.label}</p></div>
        </div>
        <dl className="print-student-info">
          {info.map(([label, value]) => (
            <div key={label} className="print-info-row flex gap-3 border-b border-gray-100 py-2.5 text-sm">
              <dt className="print-info-label w-[38%] shrink-0 font-semibold text-gray-600">{label}</dt>
              <dd className="print-info-value min-w-0 flex-1 break-words text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="print-grades-section mt-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">Subject Results</h3>
          <table className="print-grades-table w-full text-sm">
            <thead><tr className="border-b border-gray-200 bg-gray-50">
              {['Subject', 'Grade', 'Description'].map(label => <th key={label} scope="col" className={cn('px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 sm:px-4', label === 'Grade' && 'text-center')}>{label}</th>)}
            </tr></thead>
            <tbody className="divide-y divide-gray-100">
              {result.grades.map(entry => (
                <tr key={entry.subjectId} className="transition-colors hover:bg-gray-50/50">
                  <td className="px-3 py-3 text-sm font-medium text-gray-900 sm:px-4">{entry.subjectName}</td>
                  <td className="print-grade-cell px-3 py-3 text-center sm:px-4">
                    {entry.grade ? <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-bold', GRADE_BADGE_STYLES[entry.grade], `print-grade-${entry.grade}`)}>{entry.grade}</span> : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600 sm:px-4">{entry.grade ? GRADE_LABELS[entry.grade] : <span className="text-xs italic text-gray-400">Not graded</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="print-notice print-only">* Results are official as published. Contact your school or examination center for queries, corrections, or official certified copies.</div>
      </section>
      <PrintActions className="mt-5" />
      <div className="print-only print-doc-footer"><span>PrepX Examination System</span><span>This result was retrieved via the PrepX online portal.</span></div>
    </div>
  );
}
