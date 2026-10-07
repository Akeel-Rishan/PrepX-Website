const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { NextRequest } = require('next/server');
const { context, configuration } = require('./helpers.cjs');
async function search(route, exam, input = { indexNumber: 'FAKE1' }) {
  const body =
    typeof input === 'string' ? input : JSON.stringify({ examinationId: exam.id, ...input });
  const response = await route.POST(
    new NextRequest('http://integration.invalid/api/results/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '192.0.2.44' },
      body,
    })
  );
  return { status: response.status, body: await response.json(), headers: response.headers };
}
function success(result) {
  assert(!result.error, 'Action unexpectedly rejected request');
}
async function publicFlow(c) {
  const exam = await c.exam('Fake Public Exam'),
    subject = await c.subject(exam),
    student = await c.student(exam);
  const route = c.searchRoute();
  const publication = c.app('src/lib/actions/publication.ts');
  const grades = c.app('src/lib/actions/grades.ts');
  for (const status of ['DRAFT', 'READY']) {
    c.data(await c.db.from('examinations').update({ status }).eq('id', exam.id));
    const response = await search(route, exam);
    assert.equal(response.status, 403);
    assert.equal(response.body.error, 'NOT_PUBLISHED');
  }
  success(await publication.publishExaminationAction(exam.id));
  assert((await publication.publishExaminationAction(exam.id)).error);
  assert.equal((await search(route, exam)).body.overallStatus, 'Incomplete');
  const readiness = await c.app('src/lib/data/publication.ts').getPublicationValidation(exam.id);
  assert.equal(readiness.stats.emptyStudents, 1);
  assert(readiness.warnings.length);
  const unknown = await search(route, exam, { indexNumber: 'UNKNOWN' });
  assert.equal(unknown.status, 404);
  assert.equal(unknown.body.error, 'NOT_FOUND');
  for (const [grade, status] of [
    ['A', 'Passed'],
    ['B', 'Passed'],
    ['C', 'Passed'],
    ['S', 'Passed'],
    ['W', 'Not Passed'],
    ['AB', 'Absent'],
  ]) {
    success(await publication.unpublishExaminationAction(exam.id));
    const hidden = await search(route, exam);
    assert.equal(hidden.status, 403);
    assert.equal(hidden.body.error, 'NOT_PUBLISHED');
    assert.equal(
      (
        await grades.saveGradesAction(exam.id, [
          { studentId: student.id, subjectId: subject.id, grade },
        ])
      ).savedCount,
      1
    );
    assert.equal(
      c.data(
        await c.db
          .from('student_results')
          .select('grade')
          .eq('student_id', student.id)
          .eq('subject_id', subject.id)
          .single()
      ).grade,
      grade
    );
    success(await publication.publishExaminationAction(exam.id));
    for (const input of [{ indexNumber: ' fake1 ' }, { nicNumber: ' 000000000000 ' }]) {
      const response = await search(route, exam, input);
      assert.equal(response.status, 200);
      assert.equal(response.body.overallStatus, status);
      assert.equal(response.body.studentName, 'Fictional Student');
      assert.equal(response.body.maskedNic, '********0000');
      assert.equal(response.body.schoolName, 'Fictional School');
      assert.equal(response.body.examinationName, exam.name);
      assert.equal(response.body.examinationYear, 2026);
      assert.deepEqual(
        Object.keys(response.body).sort(),
        [
          'studentName',
          'indexNumber',
          'maskedNic',
          'schoolName',
          'examinationCenter',
          'examinationName',
          'examinationYear',
          'grades',
          'overallStatus',
        ].sort()
      );
      assert.equal(response.body.grades.length, 1);
      assert.equal(response.body.grades[0].grade, grade);
      assert.deepEqual(
        Object.keys(response.body.grades[0]).sort(),
        ['subjectName', 'subjectCode', 'displayOrder', 'grade'].sort()
      );
      for (const value of [
        student.nic_number,
        student.id,
        subject.id,
        exam.id,
        '192.0.2.44',
        c.config.service,
      ])
        assert(!JSON.stringify(response.body).includes(value));
      assert.match(response.headers.get('cache-control'), /no-store/);
    }
    assert(
      (
        await grades.saveGradesAction(exam.id, [
          { studentId: student.id, subjectId: subject.id, grade: 'A' },
        ])
      ).error
    );
  }
  for (const input of [
    '{',
    'null',
    '[]',
    'x'.repeat(8193),
    {},
    { indexNumber: '' },
    { indexNumber: 'A/B' },
    { indexNumber: 'A'.repeat(51) },
    { nicNumber: 'bad' },
    { indexNumber: 123 },
    { indexNumber: '<script>' },
    { indexNumber: 'FAKE1', extra: true },
  ]) {
    const response = await search(route, exam, input);
    assert.equal(response.status, 400);
    assert.equal(response.body.error, 'VALIDATION_ERROR');
  }
  assert((await c.app('src/lib/actions/examinations.ts').archiveExaminationAction(exam.id)).error);
  success(await publication.unpublishExaminationAction(exam.id));
  const second = await c.subject(exam, 'Fake Second');
  for (const [firstGrade, secondGrade, status] of [
    ['A', 'W', 'Not Passed'],
    ['AB', 'AB', 'Absent'],
    ['AB', 'S', 'Passed'],
    ['W', null, 'Incomplete'],
  ]) {
    assert.equal(
      (
        await grades.saveGradesAction(exam.id, [
          { studentId: student.id, subjectId: subject.id, grade: firstGrade },
          { studentId: student.id, subjectId: second.id, grade: secondGrade },
        ])
      ).savedCount,
      2
    );
    success(await publication.publishExaminationAction(exam.id));
    assert.equal((await search(route, exam)).body.overallStatus, status);
    success(await publication.unpublishExaminationAction(exam.id));
  }
  assert((await publication.unpublishExaminationAction(exam.id)).error);
  assert(
    (await c.action(c.app('src/lib/actions/examinations.ts').archiveExaminationAction(exam.id)))
      .redirect
  );
  assert.equal((await search(route, exam)).status, 403);
  assert.equal(
    c.data(await c.db.from('examinations').select('status').eq('id', exam.id).single()).status,
    'ARCHIVED'
  );
  assert((await c.audit('EXAMINATION_PUBLISHED')).some((a) => a.entity_id === exam.id));
  assert((await c.audit('EXAMINATION_UNPUBLISHED')).some((a) => a.entity_id === exam.id));
  assert((await c.audit('EXAMINATION_ARCHIVED')).some((a) => a.entity_id === exam.id));
}
async function adminFlow(c) {
  const exam = await c.exam('Fake Admin Exam');
  const examinations = c.app('src/lib/actions/examinations.ts');
  assert(
    (
      await examinations.saveExaminationAction(
        {},
        c.form({ name: '', year: 1999, organization_name: c.marker })
      )
    ).fieldErrors
  );
  assert.equal(
    (
      await examinations.saveExaminationAction(
        {},
        c.form({ id: exam.id, name: 'Edited Fake Exam', year: 2027, organization_name: c.marker })
      )
    ).success,
    true
  );
  assert.equal(
    c.data(await c.db.from('examinations').select('name,year').eq('id', exam.id).single()).year,
    2027
  );
  const student = await c.student(exam),
    subjects = c.app('src/lib/actions/subjects.ts'),
    students = c.app('src/lib/actions/students.ts');
  const first = await c.subject(exam, 'Fake Alpha'),
    second = await c.subject(exam, 'Fake Beta', false);
  const values = {
    id: student.id,
    examination_id: exam.id,
    index_number: student.index_number,
    nic_number: student.nic_number,
    full_name: 'Edited Fictional Student',
    school_name: 'Fictional School',
  };
  assert.equal((await students.saveStudentAction({}, c.form(values))).success, true);
  assert.equal(
    c.data(await c.db.from('students').select('full_name').eq('id', student.id).single()).full_name,
    values.full_name
  );
  for (const patch of [
    { index_number: student.index_number, nic_number: '' },
    { index_number: 'FAKE2', nic_number: student.nic_number },
  ]) {
    const duplicate = await students.saveStudentAction(
      {},
      c.form({ ...values, id: undefined, ...patch })
    );
    assert(duplicate.error);
    const { id, created_at, updated_at, ...insert } = student;
    void id;
    void created_at;
    void updated_at;
    assert.equal(
      (await c.db.from('students').insert({ ...insert, ...patch })).error?.code,
      '23505'
    );
  }
  success(
    await subjects.saveSubjectAction(
      {},
      c.form({
        id: first.id,
        examination_id: exam.id,
        subject_name: 'Edited Alpha',
        subject_code: 'ALPHA',
        required: 'true',
      })
    )
  );
  success(await subjects.moveSubjectAction(second.id, 'up'));
  let list = await c.app('src/lib/data/subjects.ts').getSubjectsByExamination(exam.id);
  assert.equal(list[0].id, second.id);
  success(await subjects.toggleSubjectActiveAction(second.id));
  assert.equal(
    c.data(await c.db.from('subjects').select('active').eq('id', second.id).single()).active,
    false
  );
  success(await subjects.toggleSubjectActiveAction(second.id));
  assert.equal(
    (
      await c.db
        .from('subjects')
        .insert({ examination_id: exam.id, subject_name: ' edited alpha ', subject_code: 'OTHER' })
    ).error?.code,
    '23505'
  );
  const gradeAction = c.app('src/lib/actions/grades.ts');
  const change = { studentId: student.id, subjectId: first.id, grade: ' a ' };
  assert.equal((await gradeAction.saveGradesAction(exam.id, [change])).savedCount, 1);
  assert.equal(
    (await gradeAction.saveGradesAction(exam.id, [{ ...change, grade: 'B' }])).savedCount,
    1
  );
  assert.equal(
    c.data(await c.db.from('student_results').select('grade').eq('student_id', student.id).single())
      .grade,
    'B'
  );
  for (const [examinationId, item] of [
    [exam.id, { ...change, grade: 'Z' }],
    [randomUUID(), change],
    [exam.id, { ...change, studentId: randomUUID() }],
    [exam.id, { ...change, subjectId: randomUUID() }],
  ])
    assert((await gradeAction.saveGradesAction(examinationId, [item])).error);
  assert.equal(
    (
      await c.db
        .from('student_results')
        .insert({ student_id: student.id, subject_id: first.id, grade: 'A' })
    ).error?.code,
    '23505'
  );
  assert.equal(
    (await c.db.from('student_results').update({ grade: 'Z' }).eq('student_id', student.id)).error
      ?.code,
    '23514'
  );
  assert.equal(
    (
      await c.db
        .from('student_results')
        .insert({ student_id: randomUUID(), subject_id: randomUUID(), grade: 'A' })
    ).error?.code,
    '23503'
  );
  const other = await c.exam('Fake Other Exam'),
    foreign = await c.subject(other, 'Foreign Fake');
  assert.equal(
    (
      await c.db
        .from('student_results')
        .insert({ student_id: student.id, subject_id: foreign.id, grade: 'A' })
    ).error?.code,
    '23514'
  );
  assert(
    (await gradeAction.saveGradesAction(exam.id, [{ ...change, subjectId: foreign.id }])).error
  );
  assert.equal(
    (await gradeAction.saveGradesAction(exam.id, [{ ...change, grade: null }])).savedCount,
    1
  );
  assert.equal(
    c.data(await c.db.from('student_results').select('id').eq('student_id', student.id)).length,
    0
  );
  assert((await c.action(students.deleteStudentAction(student.id))).redirect);
  assert.equal(c.data(await c.db.from('students').select('id').eq('id', student.id)).length, 0);
  success(await subjects.deleteSubjectAction(second.id));
  for (const event of [
    'EXAMINATION_CREATED',
    'EXAMINATION_UPDATED',
    'STUDENT_CREATED',
    'STUDENT_UPDATED',
    'STUDENT_DELETED',
    'SUBJECT_CREATED',
    'SUBJECT_UPDATED',
    'SUBJECT_REORDERED',
    'SUBJECT_DELETED',
    'GRADES_UPDATED',
  ])
    assert((await c.audit(event)).length, event);
  const audits = c.data(await c.db.from('audit_logs').select('*').eq('admin_id', c.adminId));
  assert(!JSON.stringify(audits).includes(student.nic_number));
}
async function authorizationFlow(c) {
  const exam = await c.exam('Fake Authorization Exam'),
    subject = await c.subject(exam),
    student = await c.student(exam);
  for (const session of [c.anonymous, c.member]) {
    const app = c.as(session);
    assert.equal(await app('src/lib/auth/admin.ts').getAdminUserId(), null);
    for (const result of [
      await app('src/lib/actions/examinations.ts').saveExaminationAction(
        {},
        c.form({ name: 'Denied', year: 2026, organization_name: c.marker })
      ),
      await app('src/lib/actions/examinations.ts').archiveExaminationAction(exam.id),
      await app('src/lib/actions/students.ts').deleteStudentAction(student.id),
      await app('src/lib/actions/subjects.ts').toggleSubjectActiveAction(subject.id),
      await app('src/lib/actions/grades.ts').saveGradesAction(exam.id, [
        { studentId: student.id, subjectId: subject.id, grade: 'A' },
      ]),
      await app('src/lib/actions/publication.ts').publishExaminationAction(exam.id),
      await app('src/lib/actions/import.ts').runImportAction({ examinationId: exam.id, rows: [] }),
    ])
      assert.match(result.error, /Authentication/);
    assert(
      (
        await session
          .from('examinations')
          .insert({ name: 'Denied', year: 2026, organization_name: c.marker })
      ).error,
      'RLS must reject non-admin writes'
    );
    assert.equal(
      c.data(await session.from('students').select('id').eq('id', student.id)).length,
      0
    );
    assert(
      (
        await session.rpc('import_exam_results', {
          p_examination_id: exam.id,
          p_admin_id: c.adminId,
          p_rows: [],
        })
      ).error
    );
  }
  assert.equal(await c.app('src/lib/auth/admin.ts').getAdminUserId(), c.adminId);
  assert.equal(c.data(await c.admin.from('students').select('id').eq('id', student.id)).length, 1);
  assert.equal(
    c.data(await c.db.from('examinations').select('status').eq('id', exam.id).single()).status,
    'DRAFT'
  );
}
async function importFlow(c) {
  const exam = await c.exam('Fake Import Exam'),
    subject = await c.subject(exam);
  const imports = c.app('src/lib/actions/import.ts');
  const row = (index, nic = '') => ({
    index_number: index,
    nic_number: nic,
    full_name: 'Fictional Import Student',
    school_name: 'Fictional School',
    examination_center: null,
    grades: { [subject.id]: 'A' },
  });
  for (const rows of [
    [row('BAD1'), { ...row('BAD2'), grades: { [subject.id]: 'Z' } }],
    [row('DUP'), row('DUP')],
    [row('NIC1', '000000000V'), row('NIC2', '000000000V')],
  ]) {
    assert.equal((await imports.runImportAction({ examinationId: exam.id, rows })).success, false);
    assert.equal(
      c.data(await c.db.from('students').select('id').eq('examination_id', exam.id)).length,
      0
    );
  }
  const upload = c.form({ examinationId: exam.id });
  upload.set(
    'file',
    new File(
      [
        'index_number,nic_number,full_name,school_name,Fake Subject\nIMPORT1,000000000V,Fictional Import Student,Fictional School,A\nIMPORT2,,Fictional Import Student,Fictional School,A',
      ],
      'fictional.csv',
      { type: 'text/csv' }
    )
  );
  const preview = await imports.parseAndValidateImportAction(upload);
  assert.equal(preview.canImport, true);
  assert.equal(preview.validRows, 2);
  assert.equal(preview.parseError, null);
  const rows = preview.rows.map((item) => ({
    index_number: item.index_number,
    nic_number: item.nic_number,
    full_name: item.full_name,
    school_name: item.school_name,
    examination_center: item.examination_center,
    grades: { [subject.id]: item.grades['Fake Subject'] },
  }));
  const imported = await imports.runImportAction({ examinationId: exam.id, rows });
  assert.equal(imported.success, true);
  assert.deepEqual(imported.stats, { rowsProcessed: 2, gradesWritten: 2 });
  const stored = c.data(
    await c.db.from('students').select('id,index_number').eq('examination_id', exam.id)
  );
  assert.equal(stored.length, 2);
  assert.equal(
    c.data(
      await c.db
        .from('student_results')
        .select('grade')
        .in(
          'student_id',
          stored.map((s) => s.id)
        )
    ).length,
    2
  );
  const route = c.searchRoute();
  assert.equal((await search(route, exam, { indexNumber: 'IMPORT1' })).status, 403);
  const beforeAudit = (await c.audit('IMPORT_COMPLETED')).filter(
    (a) => a.entity_id === exam.id
  ).length;
  // Row one writes, row two conflicts with an existing NIC inside the RPC. Both must roll back.
  assert.equal(
    (
      await imports.runImportAction({
        examinationId: exam.id,
        rows: [row('ROLLBACK1'), row('ROLLBACK2', '000000000V')],
      })
    ).success,
    false
  );
  assert.equal(
    c.data(await c.db.from('students').select('id').eq('examination_id', exam.id)).length,
    2
  );
  assert.equal(
    (await c.audit('IMPORT_COMPLETED')).filter((a) => a.entity_id === exam.id).length,
    beforeAudit
  );
  assert.equal(
    c.data(
      await c.db
        .from('student_results')
        .select('id')
        .in(
          'student_id',
          stored.map((s) => s.id)
        )
    ).length,
    2
  );
  // Existing index imports are intentional upserts, never duplicate grade rows.
  assert.equal(
    (
      await imports.runImportAction({
        examinationId: exam.id,
        rows: [{ ...rows[0], grades: { [subject.id]: 'W' } }],
      })
    ).success,
    true
  );
  assert.equal(
    c.data(await c.db.from('students').select('id').eq('examination_id', exam.id)).length,
    2
  );
  success(await c.app('src/lib/actions/publication.ts').publishExaminationAction(exam.id));
  const response = await search(route, exam, { nicNumber: ' 000000000v ' });
  assert.equal(response.status, 200);
  assert.equal(response.body.maskedNic, '******000V');
  assert.equal(response.body.overallStatus, 'Not Passed');
  assert.equal(
    (await imports.runImportAction({ examinationId: exam.id, rows: [row('LOCKED')] })).success,
    false
  );
}
async function securityFlow(c) {
  const exam = await c.exam('Fake Rate Limit Exam');
  await c.subject(exam);
  await c.student(exam);
  success(await c.app('src/lib/actions/publication.ts').publishExaminationAction(exam.id));
  const route = c.searchRoute(2);
  for (const expected of [200, 200, 429]) {
    const response = await search(route, exam);
    assert.equal(response.status, expected);
    assert.equal(response.headers.get('x-ratelimit-limit'), '2');
    if (expected === 429) {
      assert.equal(response.body.error, 'RATE_LIMITED');
      assert.equal(response.headers.get('x-ratelimit-remaining'), '0');
      assert(Number(response.headers.get('retry-after')) > 0);
    }
  }
  assert.equal((await search(c.searchRoute(2), exam)).status, 200);
  const previous = process.env;
  try {
    process.env = { NODE_ENV: 'test' };
    const health = c.load('src/app/api/health/route.ts');
    const response = await health.GET(new Request('http://integration.invalid/api/health'));
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.service, 'prepx');
    assert.equal(body.status, 'ok');
    assert.deepEqual(Object.keys(body).sort(), ['service', 'status', 'timestamp']);
    assert.match(response.headers.get('cache-control'), /no-store/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert(Number.isFinite(Date.parse(body.timestamp)));
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD']) {
      const denied = await health[method]();
      assert.equal(denied.status, 405);
      assert.equal(denied.headers.get('allow'), 'GET');
    }
  } finally {
    process.env = previous;
  }
}
const groups = {
  public: publicFlow,
  admin: adminFlow,
  authorization: authorizationFlow,
  import: importFlow,
  security: securityFlow,
};
async function main() {
  // Fail before touching SDKs or loading application modules when configuration is absent.
  configuration();
  const selected = process.argv.slice(2);
  for (const name of selected) assert(Object.hasOwn(groups, name), 'Unknown integration group');
  for (const name of selected.length ? selected : Object.keys(groups)) {
    let c;
    const messages = [];
    const saved = { warn: console.warn, error: console.error };
    try {
      console.warn = (...args) => messages.push(args);
      console.error = (...args) => messages.push(args);
      c = await context();
      await groups[name](c);
      const logs = JSON.stringify(messages);
      for (const secret of [
        '000000000000',
        '000000000V',
        '192.0.2.44',
        c.config.service,
        c.config.anon,
      ])
        assert(!logs.includes(secret), 'Sensitive integration log content');
    } catch {
      throw new Error(
        `Integration group ${name} failed; provider responses and credentials suppressed. Inspect assertions locally.`
      );
    } finally {
      console.warn = saved.warn;
      console.error = saved.error;
      if (c) await c.cleanup();
    }
    console.log(`PASS: real-database integration group ${name}; owned fixtures cleaned.`);
  }
}
if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
module.exports = { groups, search };
