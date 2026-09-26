'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowRight, FileCheck2 } from 'lucide-react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { parseAndValidateImportAction } from '@/lib/actions/import';
import type { ImportPreviewResult } from '@/types/import';
import { ExaminationSelector, type ImportExamination } from './_components/examination-selector';
import { FileDropzone } from './_components/file-dropzone';
import { FormatGuide, type ImportGuideSubject } from './_components/format-guide';
import { ImportInstructions } from './_components/import-instructions';
import { ImportConfirm } from './_components/import-confirm';
import { PreviewSection } from './_components/preview-section';
import { StepIndicator } from './_components/step-indicator';
import { TemplateDownloadButton } from './_components/template-download-button';
import { UpcomingSteps } from './_components/upcoming-steps';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const STEPS = [
  { label: 'Select File', description: 'Choose exam and file' },
  { label: 'Preview', description: 'Validate rows' },
  { label: 'Confirm', description: 'Review changes' },
  { label: 'Done', description: 'Import result' },
];

interface ImportClientProps {
  examinations: ImportExamination[];
  hiddenExaminationCount: number;
  initialExamId: string;
  subjects: ImportGuideSubject[];
}

/** Coordinates file selection and the server-backed validation preview. */
export function ImportClient({
  examinations,
  hiddenExaminationCount,
  initialExamId,
  subjects,
}: ImportClientProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedExaminationId, setSelectedExaminationId] = useState(initialExamId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [previewResult, setPreviewResult] = useState<ImportPreviewResult | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsInstructionsOpen(window.matchMedia('(min-width: 768px)').matches), []);
  useEffect(() => {
    setSelectedExaminationId(initialExamId);
    setSelectedFile(null);
    setFileError(null);
    setTemplateError(null);
    setPreviewResult(null);
    setParseError(null);
    setCurrentStep(1);
  }, [initialExamId]);
  const selectedExamination = useMemo(
    () => examinations.find((exam) => exam.id === selectedExaminationId) ?? null,
    [examinations, selectedExaminationId]
  );

  function selectExamination(id: string) {
    setSelectedExaminationId(id);
    setSelectedFile(null);
    setFileError(null);
    setTemplateError(null);
    setPreviewResult(null);
    setParseError(null);
    setCurrentStep(1);
    router.push(id ? `${pathname}?examId=${encodeURIComponent(id)}` : pathname);
  }

  function validateFile(file: File) {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.csv')) {
      setSelectedFile(null);
      setFileError('Only .xlsx and .csv files are supported.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      setFileError(`File is too large. Maximum size is 10 MB (this file is ${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }
    if (file.size === 0) {
      setSelectedFile(null);
      setFileError('The selected file is empty.');
      return;
    }
    setSelectedFile(file);
    setFileError(null);
    setPreviewResult(null);
    setParseError(null);
  }

  async function parseFile() {
    if (!selectedFile || !selectedExaminationId || isParsing) return;
    setIsParsing(true);
    setParseError(null);
    setPreviewResult(null);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('examinationId', selectedExaminationId);
    try {
      const result = await parseAndValidateImportAction(formData);
      if (result.parseError) {
        setParseError(result.parseError);
        return;
      }
      setPreviewResult(result);
      setCurrentStep(2);
      setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
    } catch {
      setParseError('Failed to parse the file. Please try again.');
    } finally {
      setIsParsing(false);
    }
  }

  const clearFile = () => {
    setSelectedFile(null);
    setFileError(null);
    setPreviewResult(null);
    setParseError(null);
  };
  const returnToSelection = () => {
    setPreviewResult(null);
    setCurrentStep(1);
  };
  const startAnotherImport = () => {
    setSelectedFile(null);
    setFileError(null);
    setTemplateError(null);
    setPreviewResult(null);
    setParseError(null);
    setIsDragging(false);
    setCurrentStep(1);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <StepIndicator steps={STEPS} currentStep={currentStep} />
      </section>

      {currentStep > 1 && currentStep < 4 && selectedExamination && selectedFile && (
        <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold text-gray-900">{selectedExamination.name} {selectedExamination.year}</p><p className="mt-0.5 text-xs text-gray-600">{selectedFile.name}</p></div>
          <Button variant="outline" size="sm" onClick={returnToSelection}>Change file</Button>
        </section>
      )}
      {currentStep === 1 && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5"><p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Step 1 of 4</p><h3 className="mt-1 text-lg font-semibold text-gray-900">Select Examination and File</h3><p className="mt-1 text-sm text-gray-600">Choose an open examination, download its template, then upload the completed file.</p></div>
          <div className="space-y-6">
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">1</span>
                <p className="text-sm font-semibold text-gray-900">Select Examination</p>
              </div>
              <div className="pl-8">
                <ExaminationSelector examinations={examinations} selectedId={selectedExaminationId} onChange={selectExamination} hiddenExaminationCount={hiddenExaminationCount} />
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className="mb-3 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${selectedExaminationId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>2</span>
                <p className={`text-sm font-semibold ${selectedExaminationId ? 'text-gray-900' : 'text-gray-400'}`}>
                  Download Template <span className="font-normal">(optional)</span>
                </p>
              </div>
              <div className="pl-8">
                <TemplateDownloadButton
                  examinationId={selectedExamination?.id ?? null}
                  examinationName={selectedExamination?.name ?? null}
                  examinationYear={selectedExamination?.year ?? null}
                  disabled={subjects.length === 0}
                  onError={(message) => setTemplateError(message || null)}
                />
                <p className="mt-2 text-xs text-gray-500">
                  {selectedExaminationId
                    ? `Pre-filled with ${subjects.length} active subject column${subjects.length === 1 ? '' : 's'} for this examination.`
                    : 'Select an examination to enable template download.'}
                </p>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className="mb-3 flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${selectedExaminationId ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400'}`}>3</span>
                <p className={`text-sm font-semibold ${selectedExaminationId ? 'text-gray-900' : 'text-gray-400'}`}>Upload File</p>
              </div>
              <div className="pl-8">
                <FileDropzone selectedFile={selectedFile} error={fileError} disabled={!selectedExaminationId || isParsing} isDragging={isDragging} onDraggingChange={setIsDragging} onFileCandidate={validateFile} onClear={clearFile} />
              </div>
            </div>
            {templateError && <Alert variant="error" onClose={() => setTemplateError(null)}>{templateError}</Alert>}
            {selectedFile && <div className="flex gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4"><FileCheck2 aria-hidden="true" className="h-5 w-5 shrink-0 text-blue-700" /><div><p className="text-sm font-semibold text-blue-900">Ready to Parse</p><p className="mt-0.5 text-sm text-blue-800">The file passed initial checks and is ready for server-side validation.</p></div></div>}
            {parseError && <Alert variant="error" onClose={() => setParseError(null)}>{parseError}</Alert>}
            {isParsing && (
              <p role="status" className="text-center text-sm text-gray-500 motion-safe:animate-pulse">
                Parsing and validating the file, please wait…
              </p>
            )}
            <div className="flex justify-end border-t border-gray-100 pt-5">
              <Button onClick={parseFile} disabled={!selectedExaminationId || !selectedFile || subjects.length === 0} loading={isParsing} className="w-full md:w-auto">{isParsing ? 'Parsing...' : 'Parse & Preview'} {!isParsing && <ArrowRight aria-hidden="true" className="h-4 w-4" />}</Button>
            </div>
          </div>
        </section>
      )}

      {currentStep === 1 && <><ImportInstructions isOpen={isInstructionsOpen} onToggle={() => setIsInstructionsOpen((open) => !open)} />{selectedExaminationId ? <FormatGuide subjects={subjects} /> : null}<UpcomingSteps /></>}
      {currentStep === 2 && previewResult && (
        <div ref={previewRef}>
          <PreviewSection
            result={previewResult}
            fileName={selectedFile?.name ?? ''}
            examName={
              selectedExamination
                ? `${selectedExamination.name} ${selectedExamination.year}`
                : 'Unknown examination'
            }
            onBack={returnToSelection}
            onProceed={(result) => {
              setPreviewResult(result);
              setCurrentStep(3);
            }}
          />
        </div>
      )}
      {currentStep >= 3 && previewResult && selectedExamination && (
        <ImportConfirm
          result={previewResult}
          examinationId={selectedExaminationId}
          examName={`${selectedExamination.name} ${selectedExamination.year}`}
          subjects={subjects}
          onBack={() => setCurrentStep(2)}
          onComplete={() => setCurrentStep(4)}
          onImportAnother={startAnotherImport}
        />
      )}
    </div>
  );
}
