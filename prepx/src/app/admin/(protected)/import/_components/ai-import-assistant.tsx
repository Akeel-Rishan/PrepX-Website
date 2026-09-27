'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getImportAiSuggestionsAction } from '@/lib/actions/import-ai';
import type {
  ImportAiSuggestion,
  ImportHeaderMapping,
  ImportPreviewResult,
} from '@/types/import';

interface AiImportAssistantProps {
  examinationId: string;
  result: ImportPreviewResult;
  onApply: (mappings: ImportHeaderMapping[]) => Promise<void>;
}

const BASE_COLUMNS = [
  'index_number',
  'nic_number',
  'full_name',
  'school_name',
  'examination_center',
];

/** Optional, read-only AI guidance for headers the deterministic parser could not recognize. */
export function AiImportAssistant({
  examinationId,
  result,
  onApply,
}: AiImportAssistantProps): React.JSX.Element | null {
  const [suggestion, setSuggestion] = useState<ImportAiSuggestion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const fingerprint = result.sourceColumns.join('\u0001');

  useEffect(() => {
    setSuggestion(null);
    setError(null);
  }, [fingerprint]);

  const issueSummaries = useMemo(
    () =>
      Array.from(
        new Set(result.rows.flatMap((row) => row.cellErrors.map((issue) => issue.message)))
      ).slice(0, 20),
    [result.rows]
  );
  const knownColumns = new Set([
    ...BASE_COLUMNS,
    ...result.detectedSubjects.map((subject) => subject.toLocaleLowerCase()),
  ]);
  const unknownColumns = result.sourceColumns.filter(
    (column) => !knownColumns.has(column.trim().toLocaleLowerCase())
  );
  const needsHelp =
    result.missingRequiredColumns.length > 0 ||
    result.subjectsNotFound.length > 0 ||
    unknownColumns.length > 0 ||
    result.errorRows > 0;
  if (!needsHelp) return null;

  async function requestSuggestions(): Promise<void> {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);
    const response = await getImportAiSuggestionsAction({
      examinationId,
      sourceColumns: result.sourceColumns,
      detectedBaseColumns: result.detectedBaseColumns,
      detectedSubjects: result.detectedSubjects,
      missingRequiredColumns: result.missingRequiredColumns,
      issueSummaries,
    });
    if (response.success) setSuggestion(response.suggestion);
    else setError(response.error);
    setIsLoading(false);
  }

  const applicableMappings =
    suggestion?.mappings
      .filter((mapping) => mapping.confidence !== 'low')
      .map(({ source, target }) => ({ source, target })) ?? [];

  async function applySuggestions(): Promise<void> {
    if (!applicableMappings.length || isApplying) return;
    setIsApplying(true);
    setError(null);
    try {
      await onApply(applicableMappings);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to apply the suggestions.');
    } finally {
      setIsApplying(false);
    }
  }

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/30 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
          <Sparkles aria-hidden="true" className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-blue-950 dark:text-blue-100">
            Gemini Import Assistant
          </h4>
          <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
            Get suggestions for unrecognized column names and validation problems. Only column
            headers and issue summaries are analyzed—student row data is never sent.
          </p>
        </div>
      </div>

      {!suggestion && (
        <div className="mt-4">
          <Button size="sm" onClick={() => void requestSuggestions()} loading={isLoading}>
            <Sparkles aria-hidden="true" className="h-4 w-4" />
            {isLoading ? 'Analyzing columns...' : 'Analyze with Gemini'}
          </Button>
        </div>
      )}

      {suggestion && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-blue-950 dark:text-blue-100">
              {suggestion.headline}
            </p>
            <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
              {suggestion.summary}
            </p>
          </div>

          {suggestion.mappings.length > 0 && (
            <div className="space-y-2">
              {suggestion.mappings.map((mapping) => (
                <div
                  key={`${mapping.source}-${mapping.target}`}
                  className="rounded-lg border border-blue-200 bg-white/80 px-3 py-2.5 text-sm dark:border-blue-900 dark:bg-slate-900/70"
                >
                  <div className="flex flex-wrap items-center gap-2 font-medium text-gray-900 dark:text-slate-100">
                    <span>{mapping.source}</span>
                    <span aria-hidden="true" className="text-blue-500">→</span>
                    <span>{mapping.target}</span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] uppercase tracking-wide text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                      {mapping.confidence}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">
                    {mapping.reason}
                  </p>
                </div>
              ))}
            </div>
          )}

          {suggestion.guidance.length > 0 && (
            <ul className="space-y-1.5 text-sm text-blue-900 dark:text-blue-100">
              {suggestion.guidance.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap gap-2">
            {applicableMappings.length > 0 && (
              <Button size="sm" onClick={() => void applySuggestions()} loading={isApplying}>
                {isApplying
                  ? 'Applying suggestions...'
                  : `Apply ${applicableMappings.length} confident match${applicableMappings.length === 1 ? '' : 'es'}`}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => void requestSuggestions()} disabled={isLoading || isApplying}>
              Analyze again
            </Button>
          </div>
          {suggestion.mappings.some((mapping) => mapping.confidence === 'low') && (
            <p className="text-xs text-blue-700 dark:text-blue-300">
              Low-confidence matches are shown for review but are not applied automatically.
            </p>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4">
          <Alert variant="error">{error}</Alert>
        </div>
      )}
    </div>
  );
}
