'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

interface ResultsFilterBarProps {
  examinations: Array<{ id: string; name: string; year: number }>;
  selectedExamId: string;
  initialSearch: string;
}

export function ResultsFilterBar({
  examinations,
  selectedExamId,
  initialSearch,
}: ResultsFilterBarProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(initialSearch);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    setSearchValue(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (searchValue === initialSearch) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedExamId) params.set('examId', selectedExamId);
      if (searchValue.trim()) params.set('search', searchValue.trim());
      router.push(params.size ? `${pathname}?${params}` : pathname);
    }, 350);
    return () => clearTimeout(timer.current);
  }, [initialSearch, pathname, router, searchValue, selectedExamId]);

  function handleExamChange(examId: string) {
    clearTimeout(timer.current);
    setSearchValue('');
    const params = new URLSearchParams();
    if (examId) params.set('examId', examId);
    router.push(params.size ? `${pathname}?${params}` : pathname);
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex items-center gap-2">
          <label htmlFor="results-examination" className="whitespace-nowrap text-sm font-medium text-gray-700">Examination:</label>
          <select
            id="results-examination"
            value={selectedExamId}
            onChange={(event) => handleExamChange(event.target.value)}
            className="min-w-[220px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an examination...</option>
            {examinations.map((exam) => <option key={exam.id} value={exam.id}>{exam.name} {exam.year}</option>)}
          </select>
        </div>
        {selectedExamId && (
          <div className="relative flex-1">
            <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              aria-label="Search students"
              placeholder="Search by name or index number..."
              value={searchValue}
              onChange={(event) => setSearchValue(event.target.value)}
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>
    </div>
  );
}
