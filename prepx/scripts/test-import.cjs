const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function load(file, overrides = {}) {
  const filename = path.resolve(file);
  const m = new Module(filename, module);
  m.filename = filename;
  m.paths = module.paths;
  m.require = name => {
    if (Object.hasOwn(overrides, name)) return overrides[name];
    if (name === 'server-only') return {};
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts', overrides);
    return require(name);
  };
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText, filename);
  return m.exports;
}

async function main() {
  const ExcelJS = require('exceljs');
  const { generateCsvTemplate } = load('src/lib/import-template.ts');
  const { parseImportFile } = load('src/lib/import-parser.ts');
  const { validateFileHeaders, validateImportRows } = load('src/lib/import-validator.ts');
  const subjects = [
    { subject_name: 'Mathematics', subject_code: 'MAT', required: true },
    { subject_name: 'English', subject_code: 'ENG', required: false },
  ];

  const template = generateCsvTemplate(subjects);
  const parsedTemplate = await parseImportFile(Buffer.from(template), 'csv', subjects);
  assert.deepEqual(parsedTemplate.headers.slice(0, 5), [
    'index_number', 'nic_number', 'full_name', 'school_name', 'examination_center',
  ]);
  assert.equal(validateFileHeaders(parsedTemplate.headers, subjects.map(s => s.subject_name)).valid, true);

  const codeHeaders = [
    'index_number,nic_number,full_name,school_name,examination_center,MAT,ENG',
    'OL001,,Student Name,School Name,Center A,A,B',
  ].join('\n');
  const parsedCodes = await parseImportFile(Buffer.from(codeHeaders), 'csv', subjects);
  assert.ok(parsedCodes.headers.includes('Mathematics'));
  assert.equal(parsedCodes.rows[0].grades.Mathematics, 'A');
  const rows = validateImportRows(parsedCodes.rows, subjects, [], []);
  assert.equal(rows[0].isValid, true);
  assert.equal(rows[0].nic_number, '');
  assert.equal(rows[0].examination_center, 'Center A');

  const optionalBlank = await parseImportFile(
    Buffer.from('index_number,full_name,school_name,MAT,ENG\nOL003,Optional Blank,School,A,'),
    'csv',
    subjects
  );
  const optionalRows = validateImportRows(optionalBlank.rows, subjects, [], []);
  assert.equal(optionalRows[0].cellErrors.some(issue => issue.column === 'English'), false);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Students');
  worksheet.addRow(['index_number', 'full_name', 'school_name', 'examination_center', 'MAT']);
  worksheet.addRow(['OL002', 'Spreadsheet Student', 'Spreadsheet School', 'Center B', 'B']);
  const workbookBuffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const parsedWorkbook = await parseImportFile(workbookBuffer, 'xlsx', subjects);
  assert.equal(parsedWorkbook.rows[0].index_number, 'OL002');
  assert.equal(parsedWorkbook.rows[0].grades.Mathematics, 'B');
  assert.equal(parsedWorkbook.rows[0].examination_center, 'Center B');

  const duplicate = await parseImportFile(
    Buffer.from('index_number,index_number,full_name,school_name,MAT\nA01,A02,Name,School,A'),
    'csv',
    subjects
  );
  const duplicateResult = validateFileHeaders(duplicate.headers, subjects.map(s => s.subject_name));
  assert.equal(duplicateResult.valid, false);
  assert.deepEqual(duplicateResult.duplicateColumns, ['index_number']);

  console.log('PASS: CSV/XLSX parsing, templates, optional NIC/center columns, subject-code aliases, row validation, and duplicate-header rejection.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
