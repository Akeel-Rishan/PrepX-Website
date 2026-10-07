interface PrintHeaderProps {
  examName: string;
  examYear: number;
}

export function PrintHeader({ examName, examYear }: PrintHeaderProps) {
  return (
    <div className="print-only print-doc-header">
      <p className="print-brand">PrepX ’{String(examYear).slice(-2)}</p>
      <h1>
        {examName} — {examYear}
      </h1>
      <p>Organized by UGSM</p>
      <p className="print-doc-title">Examination Result</p>
      <p id="print-date-stamp" />
    </div>
  );
}
