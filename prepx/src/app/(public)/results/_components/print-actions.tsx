'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Download, Info, Printer } from 'lucide-react';
import { cn } from '@/lib/utils';

export function PrintActions({ className }: { className?: string }) {
  const [pdfTipVisible, setPdfTipVisible] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function afterPrint() {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => setPdfTipVisible(false), 3000);
    }
    window.addEventListener('afterprint', afterPrint);
    return () => {
      window.removeEventListener('afterprint', afterPrint);
      if (openTimer.current) clearTimeout(openTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  function handleDownloadPDF() {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setPdfTipVisible(true);
    openTimer.current = setTimeout(() => window.print(), 400);
  }

  return (
    <div
      className={cn(
        'no-print space-y-3 [&_button:focus-visible]:outline [&_button:focus-visible]:outline-2 [&_button:focus-visible]:outline-offset-4 [&_button:focus-visible]:outline-blue-500 [&_a:focus-visible]:outline [&_a:focus-visible]:outline-2 [&_a:focus-visible]:outline-offset-4 [&_a:focus-visible]:outline-blue-500',
        className
      )}
    >
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800"
        >
          <Printer aria-hidden="true" className="h-4 w-4" /> Print Result
        </button>
        <button
          type="button"
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-5 py-3 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50"
        >
          <Download aria-hidden="true" className="h-4 w-4" /> Download PDF
        </button>
        <Link
          href="/"
          className="ml-auto flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 sm:ml-0"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Search Again
        </Link>
      </div>
      {pdfTipVisible && (
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700"
        >
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            In the print dialog, change the <strong>Destination</strong> to{' '}
            <strong>&quot;Save as PDF&quot;</strong> and click Save.
          </span>
        </div>
      )}
      <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        To save as PDF: click &quot;Download PDF&quot; and select &quot;Save as PDF&quot; in the
        print dialog.
      </p>
    </div>
  );
}
