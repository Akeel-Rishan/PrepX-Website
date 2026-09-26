import 'server-only';

import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import type { RawImportRow } from '@/types/import';

type ImportBaseColumn =
  | 'index_number'
  | 'nic_number'
  | 'full_name'
  | 'school_name'
  | 'examination_center';

const FIELD_ALIASES: Record<ImportBaseColumn, string[]> = {
  index_number: ['index_number', 'index number', 'indexno', 'index no', 'index'],
  nic_number: ['nic_number', 'nic number', 'nic'],
  full_name: ['full_name', 'full name', 'name', 'student_name', 'student name', 'student'],
  school_name: ['school_name', 'school name', 'school'],
  examination_center: [
    'examination_center',
    'examination center',
    'center',
    'centre',
    'exam center',
    'exam centre',
  ],
};

const BASE_ALIAS_TO_COLUMN = new Map(
  Object.entries(FIELD_ALIASES).flatMap(([column, aliases]) =>
    aliases.map((alias) => [alias, column] as const)
  )
);

export interface ParsedImportFile {
  headers: string[];
  rows: RawImportRow[];
}

export interface ImportSubjectHeader {
  subject_name: string;
  subject_code: string | null;
}

function cellString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  if (value instanceof Date) return value.toISOString();
  if ('result' in value) return cellString(value.result ?? null);
  if ('richText' in value) return value.richText.map((part) => part.text).join('').trim();
  if ('text' in value) return value.text.trim();
  return '';
}

function normalizeHeader(header: string, subjects: Map<string, string>): string {
  const trimmed = header.trim();
  const lower = trimmed.toLocaleLowerCase();
  const base = BASE_ALIAS_TO_COLUMN.get(lower);
  return base ?? subjects.get(lower) ?? trimmed;
}

function stripLeadingCsvComments(source: string): string {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  while (lines.length && (!lines[0].trim() || lines[0].trimStart().startsWith('#'))) {
    lines.shift();
  }
  return lines.join('\n');
}

async function readMatrix(fileBuffer: Buffer, fileType: 'xlsx' | 'csv'): Promise<ExcelJS.CellValue[][]> {
  const workbook = new ExcelJS.Workbook();
  let worksheet: ExcelJS.Worksheet | undefined;
  if (fileType === 'xlsx') {
    const workbookBytes = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    ) as ArrayBuffer;
    await workbook.xlsx.load(workbookBytes);
    worksheet = workbook.worksheets[0];
  } else {
    const source = stripLeadingCsvComments(fileBuffer.toString('utf8'));
    worksheet = await workbook.csv.read(Readable.from([source]), {
      parserOptions: { ignoreEmpty: true, trim: false },
    });
  }
  if (!worksheet) throw new Error('No worksheet');
  if (worksheet.columnCount > 250) {
    throw new Error('Import file contains too many columns (max 250).');
  }
  if (worksheet.actualRowCount > 1100) {
    throw new Error('Import file contains too many rows (max 1000 data rows).');
  }

  const matrix: ExcelJS.CellValue[][] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values: ExcelJS.CellValue[] = [];
    for (let column = 1; column <= worksheet!.columnCount; column += 1) {
      values.push(row.getCell(column).value);
    }
    matrix.push(values);
  });
  return matrix;
}

/** Parses the first XLSX/CSV sheet into normalized rows without database access. */
export async function parseImportFile(
  fileBuffer: Buffer,
  fileType: 'xlsx' | 'csv',
  expectedSubjects: ImportSubjectHeader[]
): Promise<ParsedImportFile> {
  try {
    const matrix = await readMatrix(fileBuffer, fileType);
    while (matrix.length && matrix[0].every((cell) => !cellString(cell))) matrix.shift();
    if (!matrix.length) return { headers: [], rows: [] };

    const subjectMap = new Map<string, string>();
    for (const subject of expectedSubjects) {
      subjectMap.set(subject.subject_name.trim().toLocaleLowerCase(), subject.subject_name);
      if (subject.subject_code?.trim()) {
        subjectMap.set(subject.subject_code.trim().toLocaleLowerCase(), subject.subject_name);
      }
    }
    const expectedSubjectNames = expectedSubjects.map((subject) => subject.subject_name);
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
      for (const subjectName of expectedSubjectNames) {
        grades[subjectName] = rawValues[subjectName] ?? '';
      }
      rows.push({
        rowNumber: rows.length + 1,
        index_number: rawValues.index_number ?? '',
        nic_number: rawValues.nic_number ?? '',
        full_name: rawValues.full_name ?? '',
        school_name: rawValues.school_name ?? '',
        examination_center: rawValues.examination_center ?? '',
        grades,
        rawValues,
      });
    }
    return { headers, rows };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Import file contains too many')) {
      throw error;
    }
    throw new Error('Could not read the file. Ensure it is a valid .xlsx or .csv file.');
  }
}
