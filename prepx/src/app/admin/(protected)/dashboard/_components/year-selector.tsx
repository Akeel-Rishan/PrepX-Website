'use client';

import { useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { Dropdown } from '@/components/ui/dropdown';

interface YearSelectorProps {
  years: number[];
  selectedYear: number;
}

export function YearSelector({ years, selectedYear }: YearSelectorProps): React.JSX.Element {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-w-48 items-center gap-3 rounded-xl border border-white/15 bg-white/10 p-2 pl-3 text-white shadow-sm backdrop-blur-sm">
      <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-300" />
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-200/70">
          Reporting year
        </span>
        <span className="block text-sm font-medium">{isPending ? 'Updating…' : selectedYear}</span>
      </span>
      <Dropdown
        ariaLabel="Dashboard year"
        value={String(selectedYear)}
        options={(years.length ? years : [selectedYear]).map((year) => ({
          value: String(year),
          label: String(year),
        }))}
        disabled={isPending || years.length === 0}
        onValueChange={(year) => {
          startTransition(() => router.push(`${pathname}?year=${encodeURIComponent(year)}`));
        }}
        compact
        align="right"
        className="w-24 border-white/15 bg-slate-800 text-sm font-semibold text-white hover:border-white/30 dark:border-white/15 dark:bg-slate-800 dark:text-white dark:hover:border-white/30"
      />
    </div>
  );
}
