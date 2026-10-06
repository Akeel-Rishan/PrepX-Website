'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { publicResultSchema } from '@/lib/validations/public-result';
import type { PublicStudentResult } from '@/types';

interface ResultContextValue {
  result: PublicStudentResult | null;
  ready: boolean;
  acceptResult: (value: unknown) => boolean;
  clearResult: () => void;
}

const ResultContext = createContext<ResultContextValue | null>(null);

/** A tab-local handoff across public client navigation. Nothing is persisted. */
export function ResultProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<PublicStudentResult | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const clearResult = useCallback(() => setResult(null), []);
  const acceptResult = useCallback((value: unknown) => {
    const parsed = publicResultSchema.safeParse(value);
    setResult(parsed.success ? parsed.data : null);
    return parsed.success;
  }, []);

  useEffect(() => {
    // Remove data left by the older storage-based handoff without reading it.
    try {
      sessionStorage.removeItem('prepx_result');
    } catch {
      /* Storage may be disabled. */
    }
    try {
      localStorage.removeItem('prepx_result');
    } catch {
      /* Storage may be disabled. */
    }
    setReady(true);
    window.addEventListener('pagehide', clearResult);
    return () => window.removeEventListener('pagehide', clearResult);
  }, [clearResult]);

  useEffect(() => {
    if (pathname !== '/results') clearResult();
  }, [pathname, clearResult]);

  const value = useMemo(
    () => ({ result, ready, acceptResult, clearResult }),
    [result, ready, acceptResult, clearResult]
  );
  return <ResultContext.Provider value={value}>{children}</ResultContext.Provider>;
}

export function usePublicResult(): ResultContextValue {
  const context = useContext(ResultContext);
  if (!context) throw new Error('Public result provider is missing.');
  return context;
}
