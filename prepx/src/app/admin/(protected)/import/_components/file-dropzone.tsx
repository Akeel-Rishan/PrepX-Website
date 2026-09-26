'use client';

import { useRef, type DragEvent } from 'react';
import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileDropzoneProps {
  selectedFile: File | null;
  error: string | null;
  disabled: boolean;
  isDragging: boolean;
  onDraggingChange: (dragging: boolean) => void;
  onFileCandidate: (file: File) => void;
  onClear: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.ceil(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Native drag-and-drop and click file picker for CSV and XLSX files. */
export function FileDropzone({
  selectedFile,
  error,
  disabled,
  isDragging,
  onDraggingChange,
  onFileCandidate,
  onClear,
}: FileDropzoneProps): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    dragDepth.current = 0;
    onDraggingChange(false);
    if (disabled) return;
    const file = event.dataTransfer.files.item(0);
    if (file) onFileCandidate(file);
  }

  if (selectedFile) {
    return (
      <div className="rounded-xl border-2 border-green-300 bg-green-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 gap-3">
            <FileSpreadsheet aria-hidden="true" className="h-8 w-8 shrink-0 text-green-700" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-green-900">{selectedFile.name}</p>
              <p className="mt-1 text-xs text-green-800">Size: {formatSize(selectedFile.size)} · Type: {selectedFile.name.toLowerCase().endsWith('.xlsx') ? 'Excel Spreadsheet' : 'CSV File'}</p>
            </div>
          </div>
          <button type="button" onClick={onClear} disabled={disabled} className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 disabled:cursor-not-allowed disabled:opacity-50">
            <X aria-hidden="true" className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/csv"
        className="sr-only"
        disabled={disabled}
        onChange={(event) => {
          const file = event.target.files?.item(0);
          if (file) onFileCandidate(file);
          event.target.value = '';
        }}
      />
      <div
        title={disabled ? 'Please select an examination first.' : undefined}
        onDragEnter={(event) => {
          event.preventDefault();
          if (disabled) return;
          dragDepth.current += 1;
          onDraggingChange(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          dragDepth.current = Math.max(0, dragDepth.current - 1);
          if (dragDepth.current === 0) onDraggingChange(false);
        }}
        onDrop={handleDrop}
        className={cn(
          'flex min-h-[160px] items-center justify-center rounded-xl border-2 p-5 text-center transition-colors',
          disabled && 'cursor-not-allowed border-dashed border-gray-200 bg-gray-100 opacity-70',
          !disabled && !error && !isDragging && 'border-dashed border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/50',
          isDragging && 'border-solid border-blue-500 bg-blue-50',
          error && 'border-solid border-red-300 bg-red-50'
        )}
      >
        <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()} className="w-full cursor-pointer rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed">
          <Upload aria-hidden="true" className={cn('mx-auto mb-3 h-8 w-8', error ? 'text-red-500' : isDragging ? 'text-blue-600' : 'text-gray-400')} />
          <p className={cn('text-sm font-semibold', error ? 'text-red-800' : isDragging ? 'text-blue-800' : 'text-gray-800')}>
            {disabled ? 'Select an examination to enable upload' : isDragging ? 'Drop to upload' : 'Drag and drop your file here'}
          </p>
          {!disabled && !isDragging && <p className="mt-1 text-sm text-gray-600">or click to browse</p>}
          <p className="mt-3 text-xs text-gray-500">Accepted: .xlsx, .csv — Max 10 MB</p>
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-sm font-medium text-red-700">{error}</p>}
    </div>
  );
}
