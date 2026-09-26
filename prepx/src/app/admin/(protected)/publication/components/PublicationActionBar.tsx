'use client';

import { Archive, Radio, Send, Undo2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { PublicationValidationResult } from '@/lib/publication-validator';

interface PublicationActionBarProps {
  result: PublicationValidationResult;
  onPublish: () => void;
  onUnpublish: () => void;
  isActioning: boolean;
}

/** Context-aware publication controls. Mutating actions remain placeholders for Step 9.2. */
export function PublicationActionBar({
  result,
  onPublish,
  onUnpublish,
  isActioning,
}: PublicationActionBarProps): React.JSX.Element {
  const archived = result.examinationStatus === 'ARCHIVED';
  const published = result.examinationStatus === 'PUBLISHED';
  const disabledReason = result.canPublish
    ? undefined
    : `${result.blockingFailures} blocking validation issue${result.blockingFailures === 1 ? '' : 's'} must be resolved first.`;

  return (
    <aside
      className="bottom-0 z-20 rounded-xl border border-gray-200 bg-white/95 p-4 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur md:sticky"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
              published
                ? 'bg-blue-100 text-blue-700'
                : archived
                  ? 'bg-gray-100 text-gray-700'
                  : result.canPublish
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
            )}
          >
            {published ? (
              <Radio className="h-3.5 w-3.5" />
            ) : archived ? (
              <Archive className="h-3.5 w-3.5" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {result.examinationStatus}
          </span>
          <div>
            <p className="text-sm font-medium text-gray-900">{result.examinationName}</p>
            <p className="text-xs text-gray-600">
              {archived
                ? 'Archived examinations cannot be published.'
                : published
                  ? 'These results are currently visible to students.'
                  : result.canPublish
                    ? 'All blocking checks passed.'
                    : disabledReason}
            </p>
          </div>
        </div>
        {published ? (
          <Button variant="destructive" loading={isActioning} onClick={onUnpublish}>
            <Undo2 className="h-4 w-4" />
            {isActioning ? 'Processing…' : 'Unpublish results'}
          </Button>
        ) : archived ? null : (
          <span title={disabledReason}>
            <Button
              className="w-full sm:w-auto"
              loading={isActioning}
              disabled={!result.canPublish}
              onClick={onPublish}
            >
              <Send className="h-4 w-4" />
              {isActioning ? 'Processing…' : 'Publish results →'}
            </Button>
          </span>
        )}
      </div>
    </aside>
  );
}
