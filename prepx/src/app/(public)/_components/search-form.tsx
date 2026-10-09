'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { AlertCircle, ArrowRight, Hash, IdCard, Loader2 } from 'lucide-react';
import {
  getPublicSearchErrorMessage,
  preparePublicSearch,
  PUBLIC_SEARCH_ERROR_MESSAGES,
} from '@/lib/public-search';
import { isPublicStudentResult } from '@/lib/public-result';
import { cn } from '@/lib/utils';

interface SearchFormProps {
  examinationId: string;
  examName: string;
}

type SearchStatus = 'idle' | 'loading' | 'error';
type SearchType = 'index' | 'nic';

interface ApiError {
  error?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function SearchForm({ examinationId, examName }: SearchFormProps): React.JSX.Element {
  const router = useRouter();
  const [searchType, setSearchType] = useState<SearchType>('index');
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isLoading = status === 'loading';
  const isIndexSearch = searchType === 'index';

  function clearError(): void {
    setErrorMessage(null);
    if (status === 'error') setStatus('idle');
  }

  function changeSearchType(nextType: SearchType): void {
    if (isLoading || nextType === searchType) return;
    setSearchType(nextType);
    setValue('');
    setErrorMessage(null);
    setStatus('idle');
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    const prepared = preparePublicSearch(isIndexSearch ? value : '', isIndexSearch ? '' : value);
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

      if (!isPublicStudentResult(data)) {
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

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      aria-label={`Search results for ${examName}`}
      aria-describedby={errorMessage ? 'search-help search-error' : 'search-help'}
    >
      <fieldset className="mb-6">
        <legend className="mb-2.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 dark:text-slate-400">
          Search using
        </legend>
        <div className="grid grid-cols-2 rounded-2xl border border-slate-200/90 bg-slate-100/80 p-1 dark:border-white/[0.08] dark:bg-[#070e1a]">
          <SearchTypeButton
            active={isIndexSearch}
            disabled={isLoading}
            onClick={() => changeSearchType('index')}
            icon={Hash}
          >
            Index Number
          </SearchTypeButton>
          <SearchTypeButton
            active={!isIndexSearch}
            disabled={isLoading}
            onClick={() => changeSearchType('nic')}
            icon={IdCard}
          >
            NIC Number
          </SearchTypeButton>
        </div>
      </fieldset>

      <label
        htmlFor="candidate-id"
        className="mb-2.5 block text-sm font-semibold text-slate-800 dark:text-slate-200"
      >
        {isIndexSearch ? 'Candidate Index Number' : 'National Identity Card Number'}
      </label>

      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex w-12 items-center justify-center text-slate-400 transition-colors group-focus-within:text-blue-600 dark:text-slate-400 dark:group-focus-within:text-blue-400">
          {isIndexSearch ? (
            <Hash aria-hidden="true" strokeWidth={1.8} className="h-[18px] w-[18px]" />
          ) : (
            <IdCard aria-hidden="true" strokeWidth={1.8} className="h-[18px] w-[18px]" />
          )}
        </div>
        <input
          id="candidate-id"
          name={isIndexSearch ? 'indexNumber' : 'nicNumber'}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={isIndexSearch ? 50 : 12}
          placeholder={isIndexSearch ? 'Enter your index number' : '200312345678 or 991234567V'}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            clearError();
          }}
          disabled={isLoading}
          aria-invalid={Boolean(errorMessage)}
          className="h-[54px] w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 font-mono text-[15px] tracking-wide text-slate-950 shadow-sm outline-none transition-[border-color,box-shadow,background-color] placeholder:text-slate-500 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:text-slate-400 dark:border-white/[0.11] dark:bg-[#111d30] dark:text-white dark:placeholder:text-slate-400 dark:shadow-none dark:hover:border-white/[0.18] dark:focus:border-blue-500 dark:focus:ring-blue-500/[0.1]"
        />
      </div>

      <p id="search-help" className="mt-2.5 text-xs leading-5 text-slate-600 dark:text-slate-400">
        {isIndexSearch
          ? 'Use the index number issued for your PrepX examination.'
          : 'Enter your NIC without spaces.'}
      </p>

      {errorMessage && (
        <div
          id="search-error"
          role="alert"
          className="mt-5 flex items-start gap-3 rounded-2xl border border-red-300/70 bg-red-50/80 px-4 py-3.5 dark:border-red-400/20 dark:bg-red-400/[0.08]"
        >
          <AlertCircle
            aria-hidden="true"
            strokeWidth={1.8}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-red-600 dark:text-red-400"
          />
          <p className="text-sm leading-5 text-red-700 dark:text-red-200">{errorMessage}</p>
        </div>
      )}

      <button
        disabled={isLoading}
        type="submit"
        aria-busy={isLoading}
        className="group mt-6 flex h-[54px] w-full items-center justify-center gap-2.5 whitespace-nowrap rounded-2xl bg-blue-600 px-5 text-sm font-bold text-white shadow-[0_14px_30px_-14px_rgba(37,99,235,0.9)] transition-[background-color,box-shadow,transform] hover:bg-blue-700 hover:shadow-[0_16px_34px_-14px_rgba(37,99,235,0.95)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:translate-y-px disabled:cursor-not-allowed dark:hover:bg-blue-700 dark:focus-visible:ring-offset-[#0b1424]"
      >
        {isLoading ? (
          <>
            <Loader2
              aria-hidden="true"
              strokeWidth={1.8}
              className="h-[18px] w-[18px] animate-spin"
            />
            Searching...
          </>
        ) : (
          <>
            Search My Result
            <ArrowRight
              aria-hidden="true"
              strokeWidth={1.8}
              className="h-[18px] w-[18px] transition-transform group-hover:translate-x-0.5"
            />
          </>
        )}
      </button>
    </form>
  );
}

interface SearchTypeButtonProps {
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  icon: LucideIcon;
  children: string;
}

function SearchTypeButton({
  active,
  disabled,
  onClick,
  icon: Icon,
  children,
}: SearchTypeButtonProps): React.JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-2 text-sm font-semibold transition-[background-color,color,box-shadow,border-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed',
        active
          ? 'border border-slate-200/80 bg-white text-slate-950 shadow-sm dark:border-white/[0.08] dark:bg-[#18253a] dark:text-white'
          : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
      )}
    >
      <Icon
        aria-hidden="true"
        strokeWidth={1.8}
        className={cn('h-4 w-4', active && 'text-blue-600 dark:text-blue-400')}
      />
      {children}
    </button>
  );
}
