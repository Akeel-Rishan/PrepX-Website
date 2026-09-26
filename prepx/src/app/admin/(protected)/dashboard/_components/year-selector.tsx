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
    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
      <CalendarDays aria-hidden="true" className="h-4 w-4 text-gray-400" />
      <span>Dashboard year</span>
      <select
        aria-label="Dashboard year"
        value={selectedYear}
        disabled={isPending || years.length === 0}
        onChange={(event) => {
          const year = event.target.value;
          startTransition(() => router.push(`${pathname}?year=${encodeURIComponent(year)}`));
        }}
        className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-50"
      >
        {years.length === 0 ? (
          <option value={selectedYear}>{selectedYear}</option>
        ) : (
          years.map((year) => <option key={year} value={year}>{year}</option>)
        )}
      </select>
    </label>
  );
}
