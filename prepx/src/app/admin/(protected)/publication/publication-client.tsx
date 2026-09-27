'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { runPublicationValidation } from './actions';
import { ValidationReport } from './components/ValidationReport';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dropdown } from '@/components/ui/dropdown';
import type { ExamStatus } from '@/lib/constants';
import type { PublicationValidationResult } from '@/lib/publication-validator';

interface ExaminationOption {
  id: string;
  name: string;
  year: number;
  status: ExamStatus;
}

interface PublicationClientProps {
  examinations: ExaminationOption[];
  initialExamId: string;
}

/** Client controller for examination selection and fresh validation runs. */
export function PublicationClient({
  examinations,
  initialExamId,
}: PublicationClientProps): React.JSX.Element {
  const [selectedExamId, setSelectedExamId] = useState(initialExamId);
  const [result, setResult] = useState<PublicationValidationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isActioning] = useState(false);
  const [isNavigating, startTransition] = useTransition();
  const requestId = useRef(0);
  const router = useRouter();
  const pathname = usePathname();

  const validate = useCallback(async (examId: string): Promise<void> => {
    const currentRequest = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const nextResult = await runPublicationValidation(examId);
      if (requestId.current === currentRequest) setResult(nextResult);
    } catch (caught) {
      if (requestId.current !== currentRequest) return;
      setResult(null);
      setError(caught instanceof Error ? caught.message : 'Validation could not be completed.');
    } finally {
      if (requestId.current === currentRequest) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void validate(selectedExamId);
  }, [selectedExamId, validate]);

  function selectExamination(examId: string): void {
    setSelectedExamId(examId);
    const params = new URLSearchParams();
    params.set('examId', examId);
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  function handlePublish(): void {
    window.alert('Publication will be implemented in Step 9.2.');
  }

  function handleUnpublish(): void {
    window.alert('Unpublication will be implemented in Step 9.2.');
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <label htmlFor="publication-exam" className="text-sm font-semibold text-gray-900">
          Examination
        </label>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <Dropdown
            id="publication-exam"
            value={selectedExamId}
            options={examinations.map((exam) => ({
              value: exam.id,
              label: `${exam.name} ${exam.year} (${exam.status})`,
            }))}
            onValueChange={selectExamination}
            disabled={loading || isNavigating}
            ariaLabel="Examination"
            className="min-w-0 flex-1"
          />
          <Button
            variant="outline"
            onClick={() => void validate(selectedExamId)}
            disabled={loading}
          >
            <RefreshCw aria-hidden="true" className="h-4 w-4" />
            Run validation again
          </Button>
        </div>
        {result && !loading && (
          <p className="mt-2 text-xs text-gray-500">
            Last checked{' '}
            {new Date(result.validatedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
      </section>

      {loading ? (
        <div
          role="status"
          aria-label="Checking publication readiness"
          className="space-y-3 animate-pulse"
        >
          <div className="h-48 rounded-2xl border border-gray-200 bg-gray-100" />
          <div className="h-20 rounded-xl border border-gray-200 bg-gray-100" />
          <div className="h-20 rounded-xl border border-gray-200 bg-gray-100" />
          <div className="h-20 rounded-xl border border-gray-200 bg-gray-100" />
          <span className="sr-only">Checking students, subjects, and grades.</span>
        </div>
      ) : error ? (
        <Alert variant="error" title="Validation failed">
          <p>{error}</p>
          <Button className="mt-3" size="sm" onClick={() => void validate(selectedExamId)}>
            Try again
          </Button>
        </Alert>
      ) : result ? (
        <ValidationReport
          result={result}
          onPublish={handlePublish}
          onUnpublish={handleUnpublish}
          isActioning={isActioning}
        />
      ) : null}
    </div>
  );
}
