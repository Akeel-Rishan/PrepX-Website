import 'server-only';

import { Readable } from 'node:stream';
import ExcelJS from 'exceljs';
import type { ImportHeaderMapping, RawImportRow } from '@/types/import';
import { MAX_IMPORT_BYTES, validateXlsxArchive, safeImportCell } from '@/lib/security/import-file';
import { plainTextSchema } from '@/lib/security/input';

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

function normalizedMappingMap(mappings: readonly ImportHeaderMapping[]): Map<string, string> {
  return new Map(
    mappings
      .map(({ source, target }) => [source.trim().toLocaleLowerCase(), target.trim()] as const)
      .filter(([source, target]) => source && target)
  );
}

/** Applies administrator-approved header aliases and rebuilds parsed row fields. */
export function applyHeaderMappings(
  parsed: ParsedImportFile,
  expectedSubjects: ImportSubjectHeader[],
  mappings: readonly ImportHeaderMapping[]
): ParsedImportFile {
  if (mappings.length === 0) return parsed;
  const mappingMap = normalizedMappingMap(mappings);
  const remap = (header: string) => mappingMap.get(header.trim().toLocaleLowerCase()) ?? header;
  const headers = parsed.headers.map(remap);
  const subjectNames = expectedSubjects.map((subject) => subject.subject_name);
  const rows = parsed.rows.map((row) => {
    const rawValues: Record<string, string> = Object.create(null);
    for (const [source, value] of Object.entries(row.rawValues)) {
      rawValues[remap(source)] = value;
    }
    const grades = Object.fromEntries(
      subjectNames.map((subjectName) => [subjectName, rawValues[subjectName] ?? ''])
    );
    return {
      ...row,
      index_number: rawValues.index_number ?? '',
      nic_number: rawValues.nic_number ?? '',
      full_name: rawValues.full_name ?? '',
      school_name: rawValues.school_name ?? '',
      examination_center: rawValues.examination_center ?? '',
      grades,
      rawValues,
    };
  });
  return { headers, rows };
}

function cellString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return safeImportCell(String(value));
  }
  if (value instanceof Date) return value.toISOString();
  if ('formula' in value || 'sharedFormula' in value || 'hyperlink' in value) throw new Error('Invalid import cell.');
  if ('richText' in value) return safeImportCell(value.richText.map((part) => part.text).join(''));
  if ('text' in value && typeof value.text === 'string') return safeImportCell(value.text);
  return '';
}

function normalizeHeader(header: string, subjects: Map<string, string>): string {
  // Our CSV template prefixes formula-like subject headers with an apostrophe.
  // Match that literal header to a known subject without evaluating anything.
  const trimmed = header.trim().replace(/^'(?=[=+@-])/, '');
  const lower = trimmed.toLocaleLowerCase();
  const base = BASE_ALIAS_TO_COLUMN.get(lower);
  return base ?? subjects.get(lower) ?? trimmed;
}

function stripLeadingCsvComments(source: string): string {
  const text = source.replace(/^\uFEFF/, '');
  let start = 0;
  while (start < text.length) {
    const newline = text.indexOf('\n', start);
    const end = newline < 0 ? text.length : newline + 1;
    const line = text.slice(start, end).trim();
    if (line && !line.startsWith('#')) break;
    start = end;
  }
  return text.slice(start);
}

async function readMatrix(fileBuffer: Buffer, fileType: 'xlsx' | 'csv'): Promise<ExcelJS.CellValue[][]> {
  if (fileBuffer.length > MAX_IMPORT_BYTES) throw new Error('Invalid import file.');
  const workbook = new ExcelJS.Workbook();
  let worksheet: ExcelJS.Worksheet | undefined;
  if (fileType === 'xlsx') {
    validateXlsxArchive(fileBuffer);
    const workbookBytes = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    ) as ArrayBuffer;
    await workbook.xlsx.load(workbookBytes);
    worksheet = workbook.worksheets[0];
  } else {
    const source = stripLeadingCsvComments(new TextDecoder('utf-8', { fatal: true }).decode(fileBuffer));
    if ((source.match(/\n/g)?.length ?? 0) > 1100 || (source.match(/,/g)?.length ?? 0) > 275000) {
      throw new Error('Import file contains too many rows or cells.');
    }
    worksheet = await workbook.csv.read(Readable.from([source]), {
      // Identifiers are text: ExcelJS's default mapper removes leading zeros
      // and turns date-like school/centre values into dates.
      map: (value: string) => value,
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
      const value = row.getCell(column).value;
      cellString(value); // Inspect every cell, including unknown columns.
      values.push(value);
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
    const headers = matrix[0].map((cell) => normalizeHeader(plainTextSchema(200).parse(cellString(cell)), subjectMap));
    const rows: RawImportRow[] = [];

    for (const values of matrix.slice(1)) {
      if (values.every((cell) => !cellString(cell))) continue;
      if (rows.length >= 1000) {
        throw new Error('Import file contains too many rows (max 1000). Please split the file.');
      }
      const rawValues: Record<string, string> = Object.create(null);
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
