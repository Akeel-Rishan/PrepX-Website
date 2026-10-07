const assert = require('node:assert/strict');
const fs = require('node:fs');
const { NextRequest, NextResponse } = require('next/server');
const { load, harness, search, valid } = require('./test-result-search.cjs');

async function main() {
  const { securityHeaders } = load('src/lib/security/headers.ts');
  const production = { NODE_ENV: 'production', NEXT_PUBLIC_SUPABASE_URL: 'https://project.supabase.co/path' };
  for (const pathname of ['/', '/results', '/results/not-found', '/results/not-published', '/admin/login', '/admin/students', '/api/results/search', '/api/health']) {
    const headers = securityHeaders(pathname, 'testNonce', 'http://localhost:3000', production);
    assert.equal(headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(headers['X-Frame-Options'], 'DENY');
    assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
    assert.equal(headers['Permissions-Policy'], 'camera=(), microphone=(), geolocation=()');
    assert.equal(headers['Cross-Origin-Opener-Policy'], 'same-origin');
    assert.equal(headers['Cross-Origin-Resource-Policy'], 'same-origin');
    assert.match(headers['Cache-Control'], /no-store/);
    if (pathname !== '/') assert.equal(headers['X-Robots-Tag'], 'noindex, nofollow, noarchive');
    const csp = headers['Content-Security-Policy'];
    assert.match(csp, /script-src 'self' 'nonce-testNonce' 'strict-dynamic';/);
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /connect-src 'self' https:\/\/project.supabase.co$/);
    assert(!csp.includes('unsafe-eval') && !csp.includes('*'));
    assert.equal(headers['Strict-Transport-Security'], undefined);
  }
  assert.equal(securityHeaders('/', 'nonce', 'http://localhost', { ...production, SECURITY_HTTPS_ONLY: 'true' })['Strict-Transport-Security'], 'max-age=31536000');
  assert.equal(securityHeaders('/', 'nonce', 'https://app.example', { ...production, VERCEL: '1', SECURITY_HSTS_INCLUDE_SUBDOMAINS: 'true' })['Strict-Transport-Security'], 'max-age=31536000; includeSubDomains');
  const dev = securityHeaders('/', 'nonce', 'http://localhost:3000', { NODE_ENV: 'development', SECURITY_HTTPS_ONLY: 'true' });
  assert.equal(dev['Strict-Transport-Security'], undefined);
  assert.match(dev['Content-Security-Policy'], /'unsafe-eval'/);
  assert.match(dev['Content-Security-Policy'], /ws:\/\/localhost:3000/);
  assert(!securityHeaders('/', 'nonce', 'https://app.example', { NODE_ENV: 'development', VERCEL: '1' })['Content-Security-Policy'].includes('unsafe-eval'));
  const { middleware } = load('src/middleware.ts', {
    '@supabase/ssr': { createServerClient() { throw new Error('Public middleware must not access authentication or database'); } },
  });
  const nonces = new Set();
  for (const pathname of ['/', '/results', '/api/results/search']) {
    const request = new NextRequest('http://localhost' + pathname, { method: 'POST', headers: { 'x-nonce': 'attacker', 'Content-Security-Policy': 'attacker' }, body: '{}' });
    const response = await middleware(request);
    const nonce = request.headers.get('x-nonce');
    assert.match(nonce, /^[A-Za-z0-9+/]{22}==$/);
    assert(!nonces.has(nonce));
    nonces.add(nonce);
    assert.equal(request.bodyUsed, false);
    assert.equal(response.headers.get('x-middleware-request-x-nonce'), nonce);
    assert(response.headers.get('content-security-policy').includes(nonce));
  }
  console.log('PASS: security headers, nonce forwarding/uniqueness, production CSP, HSTS gating and body-free public middleware.');

  const { plainTextSchema, isSmallFormData } = load('src/lib/security/input.ts');
  const text = plainTextSchema(200, 1);
  for (const name of ['සිංහල නම', 'தமிழ் பெயர்', "Anne O’Neil-Silva (Jr.), A.", 'École']) assert.equal(text.parse('  ' + name + '  '), name);
  assert.equal(text.parse('E\u0301cole   School'), 'École School');
  for (const bad of ['', ' ', 'a'.repeat(201), 'A\nB', 'A\rB', '\tAnne', 'A\0B', 'A\x7fB', 'A\x85B', 'A\u2028B', '<script>alert(1)</script>', 'School<img src=x onerror=alert(1)>', 5, null]) assert.equal(text.safeParse(bad).success, false);
  assert.equal(plainTextSchema(1000, 0, true).parse('First line\nSecond line'), 'First line\nSecond line');
  const { studentSchema } = load('src/lib/validations/student.ts');
  const { examinationSchema } = load('src/lib/validations/examination.ts');
  const { subjectSchema } = load('src/lib/validations/subject.ts');
  const { gradeSchema } = load('src/lib/validations/grade.ts');
  const student = { examination_id: valid.examinationId, full_name: 'සිංහල නම', index_number: ' ol001 ', nic_number: ' 991234567v ', school_name: 'தமிழ் பள்ளி', examination_center: null };
  assert.equal(studentSchema.parse(student).nic_number, '991234567V');
  assert.equal(studentSchema.parse(student).index_number, 'OL001');
  assert.equal(studentSchema.safeParse({ ...student, full_name: '<b>Name</b>' }).success, false);
  assert.equal(subjectSchema.safeParse({ examination_id: valid.examinationId, subject_name: '<svg/onload=alert(1)>' }).success, false);
  assert.equal(examinationSchema.safeParse({ name: 'Exam', year: 2026, organization_name: 'School', result_notice: '<a>link</a>' }).success, false);
  for (const grade of ['A', 'B', 'C', 'S', 'W', 'AB']) assert.equal(gradeSchema.parse(' ' + grade.toLowerCase() + ' '), grade);
  for (const grade of ['Z', 'Passed', 'A\n', '<b>A</b>', 1]) assert.equal(gradeSchema.safeParse(grade).success, false);
  const form = new FormData(); form.set('password', ' '.repeat(10) + 'secret ');
  assert(isSmallFormData(form));
  assert.equal(form.get('password'), ' '.repeat(10) + 'secret ');
  form.set('extra', 'x'.repeat(16385)); assert.equal(isSmallFormData(form), false);
  console.log('PASS: Unicode/punctuation preservation, NFC, whitespace, bounds, controls, markup, canonical identifiers/grades and unchanged passwords.');

  for (const body of [
    { type: 'sql', value: 'anything', examinationId: valid.examinationId },
    { ...valid, type: 'sql' },
    { ...valid, indexNumber: "OL1' OR 1=1 --" },
    { ...valid, indexNumber: 'x),nic_number.neq.null' },
    { ...valid, indexNumber: 'OL1\n' },
    { ...valid, indexNumber: 'A'.repeat(51) },
    { examinationId: valid.examinationId, nicNumber: '991234567V\n' },
    { examinationId: valid.examinationId, nicNumber: '<svg>' },
    '{', 'x'.repeat(8193),
  ]) {
    const h = harness(); const response = await search(h, body);
    assert.equal(response.status, 400); assert.equal(h.clientCount(), 0);
    assert.deepEqual(response.body, { error: 'VALIDATION_ERROR', message: 'Please enter the required information.' });
  }
  let counted = 0;
  const wrongType = harness({ limiter: async () => { counted++; return { allowed: true, headers: { 'X-RateLimit-Remaining': '9' } }; } });
  assert.equal((await search(wrongType, valid, { 'Content-Type': 'text/plain' })).status, 400);
  assert.equal(counted, 1); assert.equal(wrongType.clientCount(), 0);
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH', 'OPTIONS']) {
    const response = await harness().route[method](); assert.equal(response.status, 405); assert.equal(response.headers.get('allow'), 'POST');
  }
  const limited = harness({ limiter: async () => ({ allowed: false, status: 429, headers: { 'Retry-After': '20', 'X-RateLimit-Limit': '5', 'X-RateLimit-Remaining': '0', 'X-RateLimit-Reset': '2000000000' } }) });
  const denied = await search(limited);
  const combined = new NextResponse(JSON.stringify(denied.body), { status: denied.status, headers: denied.headers });
  for (const [key, value] of Object.entries(securityHeaders('/api/results/search', 'nonce', 'https://app.example', production))) combined.headers.set(key, value);
  assert.equal(combined.headers.get('retry-after'), '20'); assert.equal(combined.headers.get('x-ratelimit-remaining'), '0');
  assert.equal(combined.status, 429); assert.equal(limited.clientCount(), 0);
  console.log('PASS: API injection/invalid JSON/size/content-type rejection, counted failures, method checks and preserved 429 headers.');

  const overrides = {
    '@/lib/auth/admin': { getAdminUserId: async () => 'admin', isAdmin: async () => true },
    '@/lib/supabase/server': { createAdminClient() { throw new Error('Invalid input reached database'); } },
    'next/cache': { revalidatePath() {}, revalidateTag() {} },
    '@/lib/audit': { createAuditLog() {} },
  };
  for (const [module, action, fields] of [
    ['students', 'saveStudentAction', { ...student, full_name: '<script>bad</script>' }],
    ['subjects', 'saveSubjectAction', { examination_id: valid.examinationId, subject_name: 'Subject\nName' }],
    ['examinations', 'saveExaminationAction', { name: '<b>Exam</b>', year: '2026', organization_name: 'School' }],
  ]) {
    const data = new FormData(); for (const [key, value] of Object.entries(fields)) if (value !== null) data.set(key, value);
    const result = await load(`src/lib/actions/${module}.ts`, overrides)[action]({}, data);
    assert(result.fieldErrors, 'Invalid fields must fail validation before database access');
  }
  const importAction = load('src/lib/actions/import.ts', overrides);
  const invalidImport = await importAction.runImportAction({ examinationId: valid.examinationId, rows: [{ index_number: 'OL001', nic_number: null, full_name: '<b>Name</b>', school_name: 'School', examination_center: null, grades: {} }] });
  assert.equal(invalidImport.success, false); assert(!invalidImport.error.includes('<b>'));
  console.log('PASS: student, subject, examination and final import actions reject unsafe text before database mutation.');

  const ExcelJS = require('exceljs');
  const { parseImportFile } = load('src/lib/import-parser.ts');
  const { validateImportRows } = load('src/lib/import-validator.ts');
  for (const value of ['=HYPERLINK("https://bad.example")', '+SUM(1)', '@SUM(1)', '-1+1', 'x'.repeat(1025)]) {
    await assert.rejects(parseImportFile(Buffer.from(`index_number,full_name,school_name\nOL001,Name,"${value.replaceAll('"', '""')}"`), 'csv', []), /Could not read/);
  }
  for (const value of [{ formula: '1+1', result: 2 }, { text: 'Link', hyperlink: 'https://bad.example' }]) {
    const book = new ExcelJS.Workbook(); const sheet = book.addWorksheet('Results');
    sheet.addRow(['index_number', 'full_name', 'school_name']); sheet.addRow(['OL001', value, 'School']);
    await assert.rejects(parseImportFile(Buffer.from(await book.xlsx.writeBuffer()), 'xlsx', []), /Could not read/);
  }
  const multilingual = await parseImportFile(Buffer.from('index_number,full_name,school_name\nOL001,සිංහල නම,தமிழ் பள்ளி'), 'csv', []);
  assert.equal(validateImportRows(multilingual.rows, [], [], [])[0].isValid, true);
  const markup = await parseImportFile(Buffer.from('index_number,full_name,school_name\nOL001,<b>Name</b>,School'), 'csv', []);
  assert.equal(validateImportRows(markup.rows, [], [], [])[0].isValid, false);
  const controlGrade = { ...multilingual.rows[0], grades: { Maths: '\n' } };
  assert.equal(validateImportRows([controlGrade], [{ subject_name: 'Maths', required: false }], [], [])[0].isValid, false);
  await assert.rejects(parseImportFile(Buffer.alloc(10 * 1024 * 1024 + 1), 'xlsx', []));
  const bomb = new ExcelJS.Workbook(); bomb.addWorksheet('Data').getCell('A1').value = 'x'.repeat(33 * 1024 * 1024);
  const compressedBomb = Buffer.from(await bomb.xlsx.writeBuffer());
  assert(compressedBomb.length < 10 * 1024 * 1024);
  await assert.rejects(parseImportFile(compressedBomb, 'xlsx', []), /Could not read/);
  // A forged small declared size must not bypass the actual decompression cap.
  let cursor = compressedBomb.readUInt32LE(compressedBomb.length - 6);
  while (compressedBomb.readUInt32LE(cursor) === 0x02014b50) {
    const nameSize = compressedBomb.readUInt16LE(cursor + 28);
    const name = compressedBomb.subarray(cursor + 46, cursor + 46 + nameSize).toString();
    if (name === 'xl/sharedStrings.xml') compressedBomb.writeUInt32LE(1, cursor + 24);
    cursor += 46 + nameSize + compressedBomb.readUInt16LE(cursor + 30) + compressedBomb.readUInt16LE(cursor + 32);
  }
  await assert.rejects(parseImportFile(compressedBomb, 'xlsx', []), /Could not read/);
  const root = fs.readFileSync('src/app/layout.tsx', 'utf8');
  assert.match(root, /nonce=\{nonce\} suppressHydrationWarning dangerouslySetInnerHTML=\{\{ __html: themeScript \}\}/);
  console.log('PASS: import formula/hyperlink/oversize/ZIP-bomb rejection, safe multilingual preview and nonce on the existing fixed theme script.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
