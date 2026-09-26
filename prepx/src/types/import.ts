export interface RawImportRow {
  rowNumber: number;
  index_number: string;
  nic_number: string;
  full_name: string;
  school_name: string;
  grades: Record<string, string>;
  rawValues: Record<string, string>;
}

export interface CellError {
  column: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidatedRow {
  rowNumber: number;
  index_number: string;
  nic_number: string;
  full_name: string;
  school_name: string;
  grades: Record<string, string>;
  cellErrors: CellError[];
  isValid: boolean;
  isDuplicate: boolean;
}

export interface ImportValidationSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  hasBlockingErrors: boolean;
}

export interface ImportPreviewResult extends ImportValidationSummary {
  columns: string[];
  rows: ValidatedRow[];
  parseError: string | null;
}
