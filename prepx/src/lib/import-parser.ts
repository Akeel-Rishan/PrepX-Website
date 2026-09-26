import * as XLSX from 'xlsx';
import type { RawImportRow } from '@/types/import';

const REQUIRED_COLUMNS = ['index_number', 'nic_number', 'full_name', 'school_name'] as const;

export interface ParsedImportFile {
  headers: string[];
  rows: RawImportRow[];
}

function cellString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeHeader(header: string, subjects: Map<string, string>): string {
  const trimmed = header.trim();
  const lower = trimmed.toLocaleLowerCase();
  const required = REQUIRED_COLUMNS.find((column) => column === lower);
  return required ?? subjects.get(lower) ?? trimmed;
}

/** Parses the first XLSX/CSV sheet into normalized rows without database access. */
export function parseImportFile(
  fileBuffer: Buffer,
  fileType: 'xlsx' | 'csv',
  expectedSubjectNames: string[]
): ParsedImportFile {
  try {
    let source: Buffer | string = fileBuffer;
    if (fileType === 'csv') {
      source = fileBuffer
        .toString('utf8')
        .replace(/^\uFEFF/, '')
        .split(/\r?\n/)
        .filter((line, index, lines) => {
          const firstContentLine = lines.slice(0, index).every((prior) => !prior.trim() || prior.trimStart().startsWith('#'));
          return !(firstContentLine && line.trimStart().startsWith('#'));
        })
        .join('\n');
    }
    const workbook = XLSX.read(source, { type: fileType === 'csv' ? 'string' : 'buffer', raw: false });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) throw new Error('No worksheet');
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[firstSheetName], {
      header: 1,
      // Numeric XLSX identifiers must use their underlying value; formatted
      // "General" cells can otherwise become scientific notation.
      raw: fileType === 'xlsx',
      defval: '',
      blankrows: false,
    });
    while (matrix.length && matrix[0].every((cell) => !cellString(cell))) matrix.shift();
    while (matrix.length && cellString(matrix[0][0]).startsWith('#')) matrix.shift();
    if (!matrix.length) return { headers: [], rows: [] };

    const subjectMap = new Map(expectedSubjectNames.map((name) => [name.trim().toLocaleLowerCase(), name]));
    const headers = matrix[0].map((cell) => normalizeHeader(cellString(cell), subjectMap));
    const rows: RawImportRow[] = [];
    for (const values of matrix.slice(1)) {
      if (values.every((cell) => !cellString(cell))) continue;
      if (rows.length >= 1000) {
        throw new Error('Import file contains too many rows (max 1000). Please split the file.');
      }
      const rawValues: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) rawValues[header] = cellString(values[index]);
      });
      const grades: Record<string, string> = {};
      for (const subjectName of expectedSubjectNames) grades[subjectName] = rawValues[subjectName] ?? '';
      rows.push({
        rowNumber: rows.length + 1,
        index_number: rawValues.index_number ?? '',
        nic_number: rawValues.nic_number ?? '',
        full_name: rawValues.full_name ?? '',
        school_name: rawValues.school_name ?? '',
        grades,
        rawValues,
      });
    }
    return { headers, rows };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Import file contains too many rows')) throw error;
    throw new Error('Could not read the file. Ensure it is a valid .xlsx or .csv file.');
  }
}
