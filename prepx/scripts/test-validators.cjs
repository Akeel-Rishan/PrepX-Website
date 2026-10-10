const assert = require('node:assert/strict');
const { load } = require('./test-result-search.cjs');
const security = load('src/lib/security/input.ts');
const { studentSchema } = load('src/lib/validations/student.ts');
const { subjectSchema } = load('src/lib/validations/subject.ts');
const { examinationSchema } = load('src/lib/validations/examination.ts');
const { importRowSchema } = load('src/lib/validations/import.ts');
const { searchSchema, searchRequestSchema } = load('src/lib/validations/search.ts');
const { preparePublicSearch, normalizeSearchIdentifier, getPublicSearchErrorMessage } = load('src/lib/public-search.ts');
const { normalizeIndexNumber, maskNIC } = load('src/lib/utils.ts');
const id = '00000000-0000-4000-8000-000000000001';
// Synthetic format-only NICs: zero day/year sequences, never copied from student data.
const modern = '000000000000', old = '000000000V';
function rejected(schema, values, label) {
  for (const value of values) assert.equal(schema.safeParse(value).success, false, `${label}: ${JSON.stringify(value)}`);
}
const unsafe = ['<script>alert(1)</script>', '<img src=x onerror=alert(1)>', 'A\n', 'A\r', 'A\t', 'A\0', 'A\x7f', 'A\x85', 'A\u2028', 'A\u2029'];
const wrongTypes = [undefined, null, 123, true, {}, []];
for (const [input, output] of [[' fake001 ', 'FAKE001'], ['0','0'], ['a'.repeat(50),'A'.repeat(50)]]) {
  assert.equal(security.indexSchema.parse(input), output);
  assert.equal(normalizeIndexNumber(input), output);
  assert.equal(normalizeSearchIdentifier(input), output);
  assert.equal(searchSchema.parse({ indexNumber: input }).indexNumber, output);
  assert.equal(preparePublicSearch(input, '').indexNumber, output);
}
rejected(security.indexSchema, [...wrongTypes, ...unsafe, '', ' ', 'a'.repeat(51), 'A B', 'A-B', 'A/B', "A' OR 1=1", 'සිංහල', 'தமிழ்', 'Ａ１'], 'index');
for (const input of [modern, old, '000000000x', ' 000000000v ']) {
  const expected = input.trim().toUpperCase();
  assert.equal(security.optionalNicSchema.parse(input), expected);
  assert.equal(searchSchema.parse({ nicNumber: input }).nicNumber, expected);
  assert.equal(preparePublicSearch('', input).nicNumber, expected);
}
assert.equal(security.optionalNicSchema.parse(' '), '');
rejected(security.optionalNicSchema, [...wrongTypes, ...unsafe, '0'.repeat(9), '0'.repeat(11), '0'.repeat(13), '000000000Y', modern+'V', '000 000000V', '+00000000000'], 'NIC');
for (const input of [...wrongTypes, {}, { indexNumber: '' }, { nicNumber: ' ' }, { indexNumber: ' ', nicNumber: '' },
  { indexNumber: 'FAKE1', extra: true }, { indexNumber: 'FAKE1', nicNumber: 'bad' }, { indexNumber: 1 }, { nicNumber: null }]) {
  assert.equal(searchSchema.safeParse(input).success, false);
}
assert.equal(searchSchema.safeParse({ indexNumber: ' fake1 ', nicNumber: ' 000000000v ' }).success, false);
for (const examinationId of [...wrongTypes, '', 'bad', ' '+id, id+'x']) assert.equal(searchRequestSchema.safeParse({ examinationId, indexNumber: 'FAKE1' }).success, false);
assert.equal(searchRequestSchema.parse({ examinationId: id, nicNumber: modern }).examinationId, id);
for (const [index, nic] of [['',''],[' ',' '],['bad/index',''],['FAKE1','bad'],['FAKE1\n',''],['','000000000V\n']]) assert.equal(preparePublicSearch(index,nic).ok, false);
assert.notEqual(getPublicSearchErrorMessage('NOT_FOUND'), getPublicSearchErrorMessage('NOT_PUBLISHED'));
for (const value of [null, {}, '__proto__', 'constructor', '<script>secret</script>', 'INVALID_NIC']) assert.equal(getPublicSearchErrorMessage(value), getPublicSearchErrorMessage('SERVER_ERROR'));

const multilingual = ['සිංහල නම', 'தமிழ் பெயர்', "O’Neil-Silva (Jr.), A.", 'E\u0301cole'];
for (const input of multilingual) {
  assert.equal(security.plainTextSchema(200, 1).parse(input), input.normalize('NFC'));
  assert.equal(security.sanitizeSingleLineText('  '+input+'  '), input.normalize('NFC'));
}
assert.equal(security.sanitizeSingleLineText(' A\u00a0\u2003 B '), 'A B');
assert.equal(security.sanitizeSingleLineText('<b>A</b>'), '<b>A</b>'); // Normalization is not validation/HTML stripping.
rejected(security.plainTextSchema(10, 2), [...wrongTypes,...unsafe,'',' ','A','X'.repeat(11),' '.repeat(267)], 'plain text');
assert.equal(security.plainTextSchema(10,2).parse('X'.repeat(10)), 'X'.repeat(10));
assert.equal(security.plainTextSchema(10,2).parse('  AB  '), 'AB');
assert.equal(security.plainTextSchema(20,0,true).parse(' A\nB\r\nC\tD '), 'A\nB\r\nC\tD');
rejected(security.plainTextSchema(100,0,true), ['A\0B','A\x7fB','<b>notice</b>'], 'multiline');
assert.equal(security.identifierTextSchema(2).parse(' '.repeat(64)+'AB'), 'AB');
assert.equal(security.identifierTextSchema(2).safeParse(' '.repeat(65)+'AB').success, false);
const form = new FormData(); form.append('k','é');
assert.equal(security.isSmallFormData(form,3), true);
assert.equal(security.isSmallFormData(form,2), false);
form.append('k','é'); assert.equal(security.isSmallFormData(form,5), false);
const upload = new FormData(); upload.set('file',new Blob(['x']),'fake.txt'); assert.equal(security.isSmallFormData(upload),false);

const student = { examination_id:id, full_name:'Fake Student', index_number:'FAKE1', school_name:'Fake School' };
const subject = { examination_id:id, subject_name:'Fake Subject' };
const exam = { name:'Fake Examination', year:2026, organization_name:'Fake Organization' };
const row = { index_number:'FAKE1', full_name:'Fake Student', school_name:'Fake School' };
for (const [schema, base] of [[studentSchema, student], [importRowSchema, row]]) {
  assert.equal(schema.parse({ ...base, index_number: ' fake001 ', nic_number: ' 000000000v ' }).index_number, 'FAKE001');
  assert.equal(schema.parse({ ...base, nic_number: ' 000000000v ' }).nic_number, old);
  for (const index_number of ['', 'A/B', 'x'.repeat(51), null, 1]) assert.equal(schema.safeParse({ ...base, index_number }).success, false);
  for (const nic_number of ['bad', '0'.repeat(13), '000000000V\n', 1, {}]) assert.equal(schema.safeParse({ ...base, nic_number }).success, false);
}
for (const [schema, base, fields] of [[studentSchema,student,[['full_name',2,200],['school_name',2,200]]],
  [subjectSchema,subject,[['subject_name',1,100]]], [examinationSchema,exam,[['name',2,200],['organization_name',2,200]]],
  [importRowSchema,row,[['full_name',1,200],['school_name',1,200]]]]) {
  assert(schema.safeParse(base).success);
  for (const [field,min,max] of fields) {
    for (const value of [...wrongTypes,...unsafe,' '.repeat(3),'x'.repeat(min-1),'x'.repeat(max+1)]) assert.equal(schema.safeParse({...base,[field]:value}).success,false,field);
    for (const value of ['x'.repeat(min),'x'.repeat(max),...multilingual]) assert.equal(schema.safeParse({...base,[field]:value}).success,true,field);
  }
}
for (const [schema,base] of [[studentSchema,student],[subjectSchema,subject]]) for (const examination_id of [...wrongTypes,'bad','']) assert.equal(schema.safeParse({...base,examination_id}).success,false);
for (const value of [undefined,null,'',' ']) {
  assert.equal(studentSchema.parse({...student,nic_number:value}).nic_number,null);
  assert.equal(studentSchema.parse({...student,examination_center:value}).examination_center,null);
  assert.equal(subjectSchema.parse({...subject,subject_code:value}).subject_code,null);
  assert.equal(examinationSchema.parse({...exam,result_notice:value}).result_notice,null);
}
for (const [schema,base,field,max] of [[studentSchema,student,'examination_center',200],[subjectSchema,subject,'subject_code',10],[examinationSchema,exam,'result_notice',1000],[importRowSchema,row,'examination_center',200]]) {
  assert(schema.safeParse({...base,[field]:'x'.repeat(max)}).success);
  assert.equal(schema.safeParse({...base,[field]:'x'.repeat(max+1)}).success,false);
  for(const value of [123,{},[], '<script>bad</script>']) assert.equal(schema.safeParse({...base,[field]:value}).success,false);
}
assert.equal(subjectSchema.parse({...subject,subject_code:' mat ',required:'true'}).subject_code,'MAT');
// Uppercasing can expand Unicode text; the post-normalization limit still applies.
assert.equal(subjectSchema.safeParse({...subject,subject_code:'ß'.repeat(6)}).success,false);
for(const [required,expected] of [[undefined,false],['false',false],['true',true]]) assert.equal(subjectSchema.parse({...subject,required}).required,expected);
for(const required of [true,false,'TRUE',1,null]) assert.equal(subjectSchema.safeParse({...subject,required}).success,false);
for(const year of [2000,2100,'2026']) assert.equal(examinationSchema.parse({...exam,year}).year,Number(year));
for(const year of [1999,2101,2026.5,'no',null,undefined,{},[]]) assert.equal(examinationSchema.safeParse({...exam,year}).success,false);
for(const field of ['full_name','school_name','examination_center']) for(const value of ['=SUM(1)', '+SUM(1)', '@formula', '-formula']) assert.equal(importRowSchema.safeParse({...row,[field]:value}).success,false);
for(const [input,expected] of [[null,null],[undefined,null],[' ',null],['0','*'],['0000','****'],[modern,'********0000'],[old,'******000V'],[' '+old+' ','******000V']]) assert.equal(maskNIC(input),expected);
console.log('PASS: identifier/search parity, field types/length boundaries, UUIDs, Unicode/NFC, markup/control rejection, formula rejection, form byte limits and NIC masking.');
