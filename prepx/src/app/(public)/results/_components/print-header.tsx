interface PrintHeaderProps {
  examName: string;
  examYear: number;
  orgName: string;
}

export function PrintHeader({ examName, examYear, orgName }: PrintHeaderProps) {
  return (
    <div className="print-only print-doc-header">
      <p style={{ fontSize: '10pt', fontWeight: 'bold', margin: '0 0 4pt' }}>{orgName}</p>
      <h1>{examName} — {examYear}</h1>
      <p style={{ fontWeight: 'bold', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        Official Examination Result
      </p>
      <p id="print-date-stamp" style={{ fontSize: '8pt', color: '#666' }} />
    </div>
  );
}
