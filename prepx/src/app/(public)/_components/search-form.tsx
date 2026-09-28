'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Hash, IdCard, Loader2, Search } from 'lucide-react';
import {
  getPublicSearchErrorMessage,
  preparePublicSearch,
  PUBLIC_SEARCH_ERROR_MESSAGES,
} from '@/lib/public-search';
import { cn } from '@/lib/utils';

interface SearchFormProps {
  examinationId: string;
  examName: string;
}

type SearchStatus = 'idle' | 'loading' | 'error';

interface ApiError {
  error?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function SearchForm({ examinationId, examName }: SearchFormProps): React.JSX.Element {
  const router = useRouter();
  const [indexNumber, setIndexNumber] = useState('');
  const [nicNumber, setNicNumber] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function clearError(): void {
    setErrorMessage(null);
    if (status === 'error') setStatus('idle');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    const prepared = preparePublicSearch(indexNumber, nicNumber);
    if (!prepared.ok) {
      setErrorMessage(prepared.message);
      setStatus('error');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('/api/results/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          examinationId,
          indexNumber: prepared.indexNumber,
          nicNumber: prepared.nicNumber,
        }),
      });

      const data: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const apiError: ApiError = isRecord(data) ? data : {};
        setErrorMessage(getPublicSearchErrorMessage(apiError.error));
        setStatus('error');
        return;
      }

      if (!isRecord(data)) {
        setErrorMessage(PUBLIC_SEARCH_ERROR_MESSAGES.SERVER_ERROR);
        setStatus('error');
        return;
      }

      try {
        sessionStorage.setItem('prepx_result', JSON.stringify(data));
      } catch {
        // The result page handles unavailable browser storage safely.
      }

      router.push('/results');
    } catch {
      setErrorMessage(PUBLIC_SEARCH_ERROR_MESSAGES.SERVER_ERROR);
      setStatus('error');
    }
  }

  const isLoading = status === 'loading';

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={`Search results for ${examName}`}
      aria-describedby={errorMessage ? 'search-help search-error' : 'search-help'}
      className="space-y-4"
    >
      <div>
        <label htmlFor="indexNumber" className="mb-2 flex items-center gap-2">
          <Hash
            aria-hidden="true"
            strokeWidth={1.8}
            className="h-4 w-4 text-slate-400 dark:text-slate-500"
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Index Number
          </span>
        </label>
        <input
          id="indexNumber"
          name="indexNumber"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={50}
          placeholder="e.g. OL2026001"
          value={indexNumber}
          onChange={(event) => {
            setIndexNumber(event.target.value);
            clearError();
          }}
          disabled={isLoading}
          aria-invalid={Boolean(errorMessage)}
          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono text-sm tracking-wide text-slate-950 shadow-sm shadow-slate-950/[0.02] placeholder:text-slate-500 transition-[border-color,box-shadow,background-color] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:shadow-none dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/15 dark:disabled:bg-slate-800"
        />
      </div>

      <div className="relative" aria-hidden="true">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200 dark:border-slate-700" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-xs font-semibold uppercase tracking-[0.18em] text-slate-400 dark:bg-slate-900 dark:text-slate-500">
            or
          </span>
        </div>
      </div>

      <div>
        <label htmlFor="nicNumber" className="mb-2 flex items-center gap-2">
          <IdCard
            aria-hidden="true"
            strokeWidth={1.8}
            className="h-4 w-4 text-slate-400 dark:text-slate-500"
          />
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            NIC Number
          </span>
        </label>
        <input
          id="nicNumber"
          name="nicNumber"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          placeholder="e.g. 200312345678 or 991234567V"
          value={nicNumber}
          onChange={(event) => {
            setNicNumber(event.target.value);
            clearError();
          }}
          disabled={isLoading}
          aria-invalid={Boolean(errorMessage)}
          className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 font-mono text-sm tracking-wide text-slate-950 shadow-sm shadow-slate-950/[0.02] placeholder:text-slate-500 transition-[border-color,box-shadow,background-color] focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:shadow-none dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/15 dark:disabled:bg-slate-800"
        />
      </div>

      {errorMessage && (
        <div
          id="search-error"
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/70 dark:bg-red-950/30"
        >
          <AlertCircle
            aria-hidden="true"
            strokeWidth={1.8}
            className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-300"
          />
          <p className="text-sm leading-5 text-red-700 dark:text-red-200">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        aria-busy={isLoading}
        className={cn(
          'inline-flex h-12 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl px-6 text-sm font-semibold text-white shadow-sm transition-[background-color,box-shadow,transform] duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 active:translate-y-px dark:focus:ring-offset-slate-900',
          isLoading
            ? 'cursor-not-allowed bg-blue-600 dark:bg-blue-600'
            : 'bg-blue-600 hover:bg-blue-700 hover:shadow dark:bg-blue-600 dark:hover:bg-blue-700'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 aria-hidden="true" strokeWidth={1.8} className="h-4 w-4 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <Search aria-hidden="true" strokeWidth={1.8} className="h-4 w-4" />
            Search My Results
          </>
        )}
      </button>

      <p
        id="search-help"
        className="text-center text-xs leading-5 text-slate-500 dark:text-slate-400"
      >
        Use either your Index Number or NIC Number. Only one is required.
      </p>
    </form>
  );
}
