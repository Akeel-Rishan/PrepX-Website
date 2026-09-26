'use client';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

interface StudentsFilterBarProps {
  examinations: Array<{ id: string; name: string; year: number }>;
  schools: string[];
  initialSearch: string;
  initialExamId: string;
  initialSchool: string;
}

export function StudentsFilterBar({
  examinations,
  schools,
  initialSearch,
  initialExamId,
  initialSchool,
}: StudentsFilterBarProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [searchValue, setSearchValue] = useState(initialSearch);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const filters = useRef({ search: initialSearch, examId: initialExamId, school: initialSchool });
  useEffect(() => () => clearTimeout(timer.current), []);

  function updateParams(updates: Record<string, string>) {
    clearTimeout(timer.current);
    filters.current = { ...filters.current, ...updates };
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters.current)) {
      if (value.trim()) params.set(key, value.trim());
    }
    router.push(params.size ? pathname + '?' + params : pathname);
  }

  function handleSearch(value: string) {
    setSearchValue(value);
    filters.current.search = value;
    clearTimeout(timer.current);
    timer.current = setTimeout(() => updateParams({ search: value }), 350);
  }

  const inputClass =
    'rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400 dark:focus:border-blue-500';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="relative min-w-0 flex-1 sm:min-w-[220px]">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-400"
          />
          <input
            type="search"
            aria-label="Search students"
            placeholder="Search by name, index number, or school..."
            value={searchValue}
            onChange={(event) => handleSearch(event.target.value)}
            className={inputClass + ' w-full pl-9'}
          />
        </div>
        <select
          aria-label="Examination"
          value={initialExamId}
          onChange={(event) => updateParams({ examId: event.target.value, school: '' })}
          className={inputClass + ' sm:min-w-[180px]'}
        >
          <option value="">All Examinations</option>
          {examinations.map((exam) => (
            <option key={exam.id} value={exam.id}>
              {exam.name} {exam.year}
            </option>
          ))}
        </select>
        <select
          aria-label="School"
          value={initialSchool}
          onChange={(event) => updateParams({ school: event.target.value })}
          disabled={schools.length === 0}
          className={inputClass + ' sm:min-w-[160px]'}
        >
          <option value="">All Schools</option>
          {initialSchool && !schools.includes(initialSchool) && (
            <option value={initialSchool}>{initialSchool}</option>
          )}
          {schools.map((school) => (
            <option key={school} value={school}>
              {school}
            </option>
          ))}
        </select>
        {(searchValue || initialExamId || initialSchool) && (
          <button
            type="button"
            onClick={() => {
              setSearchValue('');
              updateParams({ search: '', examId: '', school: '' });
            }}
            className="flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
