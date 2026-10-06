'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function PrintActions({ className }: { className?: string }) {
  return (
    <div className={cn('no-print space-y-3', className)}>
      <div className="flex flex-col gap-3 min-[375px]:flex-row min-[375px]:flex-wrap">
        <Button
          variant="outline"
          className="h-auto min-h-11 whitespace-normal px-5 py-3"
          aria-describedby="print-result-help"
          onClick={() => window.print()}
        >
          <Printer aria-hidden="true" className="h-4 w-4 shrink-0" />
          Print / Save as PDF
        </Button>
        <Link
          href="/"
          className="flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Search Again
        </Link>
      </div>
      <p id="print-result-help" className="text-xs leading-5 text-slate-500 dark:text-slate-400">
        Opens your browser’s print dialog. Choose “Save as PDF” as the destination to save a copy.
      </p>
    </div>
  );
}
