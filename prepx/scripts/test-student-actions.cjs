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
  m._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
  return m.exports;
}
const { studentSchema } = load('src/lib/validations/student.ts');
const exam = '3a320000-0000-4000-8000-000000002026';
const id = '3a320000-0000-4000-8000-000000000099';
const valid = { examination_id: exam, full_name: 'Test Student', index_number: ' test99 ', school_name: 'Test School' };
for (const nic of ['', '   ', undefined, null]) assert.equal(studentSchema.parse({ ...valid, nic_number: nic }).nic_number, null);
assert.equal(studentSchema.parse({ ...valid, nic_number: '991234567v' }).nic_number, '991234567V');
assert.equal(studentSchema.parse({ ...valid, nic_number: '200312345678' }).nic_number, '200312345678');
assert.equal(studentSchema.parse(valid).index_number, 'TEST99');
for (const nic of ['12345', '991234567A', '2003123456789']) assert.equal(studentSchema.safeParse({ ...valid, nic_number: nic }).success, false);
assert.equal(studentSchema.safeParse({ ...valid, index_number: 'OL 2026' }).success, false);
assert.equal(studentSchema.safeParse({ ...valid, index_number: 'OL-2026' }).success, false);
function form(values) { const f = new FormData(); for (const [k, v] of Object.entries(values)) if (v !== undefined) f.set(k, v); return f; }
function harness({ user = true, profile = true, existing = { id, examination_id: exam }, status = 'DRAFT', databaseError = null } = {}) {
  let writes = 0;
  const audits = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: user ? { id: 'admin-id' } : null }, error: null }) },
    from(table) {
      let operation;
      const q = {
        select() { return q; }, eq() { return q; },
        insert() { writes++; operation = 'insert'; return q; },
        update() { writes++; operation = 'update'; return q; },
        delete() { writes++; operation = 'delete'; return q; },
        async single() {
          if (table === 'admin_profiles') return { data: profile ? { id: 'profile-id' } : null, error: null };
          if (table === 'examinations') return { data: { status }, error: null };
          if (operation) return { data: databaseError ? null : { id }, error: databaseError };
          return { data: existing ? { ...existing, examination: { status } } : null, error: null };
        },
        async maybeSingle() { return q.single(); },
      };
      return q;
    },
  };
  const actions = load('src/lib/actions/students.ts', {
    '@/lib/supabase/server': { createClient: async () => client, createAdminClient: () => client },
    '@/lib/audit': { createAuditLog: async entry => audits.push(entry) },
    'next/cache': { revalidatePath() {}, revalidateTag() {} },
    'next/navigation': { redirect(destination) { throw Object.assign(new Error('REDIRECT'), { destination }); } },
  });
  return { ...actions, writes: () => writes, audits };
}
async function main() {
  for (const options of [{ user: false }, { profile: false }]) {
    const h = harness(options);
    assert.equal((await h.saveStudentAction({}, form(valid))).error, 'Authentication required.');
    assert.equal((await h.deleteStudentAction(id)).error, 'Authentication required.');
    assert.equal(h.writes(), 0);
  }
  const invalid = harness();
  assert.equal((await invalid.saveStudentAction({}, form({ ...valid, id: 'invalid' }))).error, 'Invalid student ID.');
  assert.equal((await invalid.deleteStudentAction('invalid')).error, 'Invalid student ID.');
  assert.equal(invalid.writes(), 0);
  const tamper = harness();
  assert.match((await tamper.saveStudentAction({}, form({ ...valid, id, examination_id: '3a320000-0000-4000-8000-000000002027' }))).error, /cannot be changed/);
  assert.equal(tamper.writes(), 0);
  const missing = harness({ existing: null });
  assert.equal((await missing.saveStudentAction({}, form({ ...valid, id }))).error, 'Student not found.');
  assert.equal(missing.writes(), 0);
  const published = harness({ status: 'PUBLISHED' });
  assert.match((await published.deleteStudentAction(id)).error, /published or archived examinations/);
  assert.equal(published.writes(), 0);
  assert.match((await published.saveStudentAction({}, form({ ...valid, id }))).error, /read-only/);
  const archived = harness({ status: 'ARCHIVED' });
  assert.match((await archived.deleteStudentAction(id)).error, /published or archived examinations/);
  assert.match((await archived.saveStudentAction({}, form({ ...valid, id }))).error, /read-only/);
  for (const [constraint, field] of [['students_examination_id_index_number_key', 'index_number'], ['idx_students_exam_nic_unique', 'nic_number']]) {
    const h = harness({ databaseError: { code: '23505', message: constraint } });
    assert.match((await h.saveStudentAction({}, form(valid))).fieldErrors[field][0], /already registered/);
    assert.equal(h.audits.length, 0);
  }
  const create = harness();
  await assert.rejects(create.saveStudentAction({}, form(valid)), error => error.destination === '/admin/students/' + id);
  assert.equal(create.audits[0].action, 'STUDENT_CREATED');
  const edit = harness();
  assert.equal((await edit.saveStudentAction({}, form({ ...valid, id }))).success, true);
  assert.equal(edit.audits[0].action, 'STUDENT_UPDATED');
  const remove = harness();
  await assert.rejects(remove.deleteStudentAction(id), error => error.destination === '/admin/students');
  assert.equal(remove.audits[0].action, 'STUDENT_DELETED');
  console.log('PASS: validation, blank NICs, normalization, unauthenticated/non-admin rejection, ID tampering, locked examination, missing student, published deletion rejection, duplicate field mapping, audits and redirects.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
