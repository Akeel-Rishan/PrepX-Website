import { GRADES } from '@/lib/constants';
import type {
  CellError,
  ImportValidationSummary,
  RawImportRow,
  ValidatedRow,
} from '@/types/import';

export const IMPORT_REQUIRED_COLUMNS = ['index_number', 'full_name', 'school_name'] as const;
export const IMPORT_OPTIONAL_COLUMNS = ['nic_number', 'examination_center'] as const;
export const IMPORT_BASE_COLUMNS = [
  'index_number',
  'nic_number',
  'full_name',
  'school_name',
  'examination_center',
] as const;
const OLD_NIC = /^\d{9}[VX]$/;
const NEW_NIC = /^\d{12}$/;
const INDEX_NUMBER = /^[A-Z0-9]+$/;
const VALID_GRADES = new Set<string>(GRADES);

export interface ImportValidationSubject {
  subject_name: string;
  required: boolean;
}

/** Validates required and recognized spreadsheet headers case-insensitively. */
export function validateFileHeaders(
  headers: string[],
  expectedSubjectNames: string[]
): {
  valid: boolean;
  missingColumns: string[];
  unknownColumns: string[];
  duplicateColumns: string[];
} {
  const normalized = new Map(headers.map((header) => [header.trim().toLocaleLowerCase(), header]));
  const counts = new Map<string, number>();
  for (const header of headers) {
    const key = header.trim().toLocaleLowerCase();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const subjects = new Set(expectedSubjectNames.map((name) => name.trim().toLocaleLowerCase()));
  const missingColumns = IMPORT_REQUIRED_COLUMNS.filter((column) => !normalized.has(column));
  const unknownColumns = headers.filter((header) => {
    const lower = header.trim().toLocaleLowerCase();
    return Boolean(lower) && !IMPORT_BASE_COLUMNS.includes(lower as (typeof IMPORT_BASE_COLUMNS)[number]) && !subjects.has(lower);
  });
  const duplicateColumns = Array.from(counts)
    .filter(([, count]) => count > 1)
    .map(([column]) => normalized.get(column) ?? column);
  return {
    valid: missingColumns.length === 0 && duplicateColumns.length === 0,
    missingColumns,
    unknownColumns,
    duplicateColumns,
  };
}

/** Validates parsed rows against import and examination business rules. */
export function validateImportRows(
  rows: RawImportRow[],
  subjects: ImportValidationSubject[],
  existingIndexNumbers: string[],
  existingNicNumbers: string[]
): ValidatedRow[] {
  const expectedSubjectNames = subjects.map((subject) => subject.subject_name);
  const indexCounts = new Map<string, number>();
  for (const row of rows) {
    const index = row.index_number.trim().toUpperCase();
    if (index) indexCounts.set(index, (indexCounts.get(index) ?? 0) + 1);
  }
  const existingIndexes = new Set(existingIndexNumbers.map((value) => value.trim().toUpperCase()));
  const existingNics = new Set(existingNicNumbers.map((value) => value.trim().toUpperCase()).filter(Boolean));
  const knownColumns = new Set<string>([...IMPORT_BASE_COLUMNS, ...expectedSubjectNames]);

  return rows.map((row) => {
    const index_number = row.index_number.trim().toUpperCase();
    const nic_number = row.nic_number.trim().toUpperCase();
    const full_name = row.full_name.trim();
    const school_name = row.school_name.trim();
    const examination_center = row.examination_center.trim();
    const cellErrors: CellError[] = [];
    const add = (column: string, message: string, severity: CellError['severity']) =>
      cellErrors.push({ column, message, severity });

    if (!index_number) add('index_number', 'Index number is required.', 'error');
    else {
      if (index_number.length > 50) add('index_number', 'Index number must be 50 characters or fewer.', 'error');
      if (!INDEX_NUMBER.test(index_number)) add('index_number', 'Index number must contain only letters and numbers.', 'error');
      if ((indexCounts.get(index_number) ?? 0) > 1) add('index_number', 'Duplicate index number in this file.', 'error');
      if (existingIndexes.has(index_number)) add('index_number', 'This index number already exists and will be updated.', 'warning');
    }
    if (!full_name) add('full_name', 'Student name is required.', 'error');
    else if (full_name.length > 200) add('full_name', 'Student name must be under 200 characters.', 'error');
    if (!school_name) add('school_name', 'School name is required.', 'error');
    else if (school_name.length > 200) add('school_name', 'School name must be under 200 characters.', 'error');
    if (nic_number) {
      const oldFormat = OLD_NIC.test(nic_number);
      const newFormat = NEW_NIC.test(nic_number);
      if (oldFormat) add('nic_number', 'Old NIC format detected. Verify this is correct.', 'warning');
      else if (!newFormat) add('nic_number', 'Invalid NIC number format.', 'error');
      if ((oldFormat || newFormat) && existingNics.has(nic_number)) {
        add('nic_number', 'This NIC number already belongs to a student in this examination. Verify it before importing.', 'warning');
      }
    }
    if (examination_center.length > 200) {
      add('examination_center', 'Examination center must be under 200 characters.', 'error');
    }

    const grades: Record<string, string> = {};
    for (const subject of subjects) {
      const subjectName = subject.subject_name;
      const value = (row.grades[subjectName] ?? '').trim().toUpperCase();
      grades[subjectName] = value;
      if (!value) {
        if (subject.required) {
          add(
            subjectName,
            `Grade for required subject ${subjectName} is missing. This will be recorded as incomplete.`,
            'warning'
          );
        }
      } else if (!VALID_GRADES.has(value)) {
        add(
          subjectName,
          `'${value}' is not a valid grade for ${subjectName}. Valid grades: A, B, C, S, W, AB.`,
          'error'
        );
      }
    }
    for (const column of Object.keys(row.rawValues)) {
      if (!knownColumns.has(column)) add('_row', `Unknown column '${column}' will be ignored.`, 'warning');
    }
    return {
      rowNumber: row.rowNumber,
      index_number,
      nic_number,
      full_name,
      school_name,
      examination_center,
      grades,
      cellErrors,
      isValid: !cellErrors.some((issue) => issue.severity === 'error'),
      isDuplicate: Boolean(index_number && (indexCounts.get(index_number) ?? 0) > 1),
    };
  });
}

/** Summarizes mutually exclusive clean, error, and warning row counts. */
export function summariseValidation(rows: ValidatedRow[]): ImportValidationSummary {
  const errorRows = rows.filter((row) => !row.isValid).length;
  const warningRows = rows.filter(
    (row) => row.isValid && row.cellErrors.some((issue) => issue.severity === 'warning')
  ).length;
  return {
    totalRows: rows.length,
    validRows: rows.length - errorRows - warningRows,
    errorRows,
    warningRows,
    hasBlockingErrors: errorRows > 0,
  };
}
