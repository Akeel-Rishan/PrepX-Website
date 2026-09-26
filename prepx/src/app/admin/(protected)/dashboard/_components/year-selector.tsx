'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';

interface YearSelectorProps {
  years: number[];
  selectedYear: number;
}

export function YearSelector({ years, selectedYear }: YearSelectorProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex min-w-48 items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-2 pl-3 text-white shadow-sm backdrop-blur-sm">
      <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-300" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-200/70">
          Reporting year
        </span>
        <span className="block text-sm font-medium">{isPending ? 'Updating…' : selectedYear}</span>
      </span>
      <select
        aria-label="Dashboard year"
        value={selectedYear}
        disabled={isPending || years.length === 0}
        onChange={(event) => {
          const year = event.target.value;
          startTransition(() => router.push(`${pathname}?year=${encodeURIComponent(year)}`));
        }}
        className="h-9 max-w-24 rounded-lg border border-white/10 bg-slate-800 px-2 text-sm font-semibold text-white focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/30 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {years.length === 0 ? (
          <option value={selectedYear}>{selectedYear}</option>
        ) : (
          years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))
        )}
      </select>
    </label>
  );
}
