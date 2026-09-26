'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getSubjectsForTemplateAction } from '@/lib/actions/import';
import { generateCsvTemplate } from '@/lib/import-template';

interface TemplateDownloadButtonProps {
  examinationId: string | null;
  examinationName: string | null;
  examinationYear: number | null;
  disabled?: boolean;
  onError: (message: string) => void;
}

/** Fetches subject columns and downloads a generated CSV import template. */
export function TemplateDownloadButton({
  examinationId,
  examinationName,
  examinationYear,
  disabled = false,
  onError,
}: TemplateDownloadButtonProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState(false);

  async function downloadTemplate() {
    if (!examinationId || !examinationYear || disabled || isLoading) return;
    setIsLoading(true);
    onError('');
    try {
      const result = await getSubjectsForTemplateAction(examinationId);
      if (result.error) {
        onError(result.error);
        return;
      }
      const blob = new Blob([generateCsvTemplate(result.data ?? [])], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const examSlug = (examinationName ?? 'examination')
        .trim()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-|-$/g, '');
      anchor.download = `import-template-${examSlug}-${examinationYear}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      onError('Failed to download the template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <span className="block w-full md:inline-block md:w-auto" title={!examinationId ? 'Select an examination to generate a template.' : disabled ? 'Add active subjects before downloading a template.' : undefined}>
      <Button variant="outline" onClick={downloadTemplate} disabled={!examinationId || disabled} loading={isLoading} className="w-full md:w-auto">
        <Download aria-hidden="true" className="h-4 w-4" /> Download Template (.csv)
      </Button>
    </span>
  );
}
