const assert = require('node:assert/strict');
const { load } = require('./test-result-search.cjs');
const { validateImportRows, validateFileHeaders, summariseValidation } = load('src/lib/import-validator.ts');
const { buildPublicationValidation } = load('src/lib/publication-validator.ts');
const subjects = [{subject_name:'Required',required:true},{subject_name:'Optional',required:false}];
const row = {rowNumber:2,index_number:'FAKE1',nic_number:'',full_name:'Fake Student',school_name:'Fake School',examination_center:'',grades:{Required:'A'},rawValues:{}};
const validate = (rows, existingIndexes=[], existingNics=[]) => validateImportRows(rows,subjects,existingIndexes,existingNics);
for(const grade of ['A','B','C','S','W','AB',' a ','aB']) {
  const result = validate([{...row,grades:{Required:grade}}])[0];
  assert.equal(result.isValid,true); assert.equal(result.grades.Required,grade.trim().toUpperCase());
}
for(const [field,value] of [['index_number',''],['index_number','A/B'],['index_number','x'.repeat(51)],['nic_number','bad'],
  ['nic_number','0'.repeat(13)],['full_name',''],['school_name',' '],['full_name','<script>bad</script>'],
  ['school_name','=SUM(1)'],['examination_center','x'.repeat(201)]]) {
  const result = validate([{...row,[field]:value}])[0];
  assert.equal(result.isValid,false,field);
  assert(result.cellErrors.some(e=>e.column===field && e.severity==='error'));
}
for(const value of ['Z','AA','1','A\n','<b>A</b>']) {
  const result = validate([{...row,grades:{Required:value}}])[0];
  assert.equal(result.isValid,false); assert(result.cellErrors.some(e=>e.column==='Required' && e.severity==='error'));
}
for(const [field,value] of [['index_number','fake1'],['nic_number','000000000v']]) {
  const initial = {...row,[field]:value};
  const duplicate = {...row,rowNumber:3,index_number:'FAKE2',[field]:` ${value.toUpperCase()} `};
  const results = validate([initial,duplicate]);
  assert.equal(results[0].isValid,true); assert.equal(results[1].isValid,false);
  assert(results[1].cellErrors.some(e=>e.column===field && /first used on row 2/.test(e.message)));
}
assert(validate([{...row,nic_number:''},{...row,rowNumber:3,index_number:'FAKE2',nic_number:''}]).every(r=>r.isValid));
const update = validate([{...row,nic_number:'000000000000'}],[' fake1 '],['000000000000'])[0];
assert.equal(update.isValid,true); assert.equal(update.cellErrors.filter(e=>e.severity==='warning').length,2);
const missing = validate([{...row,grades:{Required:'',Optional:''}}])[0];
assert.equal(missing.isValid,true); assert.deepEqual(missing.cellErrors.map(e=>[e.column,e.severity]),[['Required','warning']]);
const mixed = validate([row,{...row,rowNumber:3,index_number:'FAKE2',grades:{Required:'Z'}},{...row,rowNumber:4,index_number:'FAKE3',grades:{}}]);
assert.deepEqual(summariseValidation(mixed),{totalRows:3,validRows:2,errorRows:1,warningRows:1,hasBlockingErrors:false});
assert.deepEqual(summariseValidation([mixed[1]]),{totalRows:1,validRows:0,errorRows:1,warningRows:0,hasBlockingErrors:true});
assert.deepEqual(summariseValidation([]),{totalRows:0,validRows:0,errorRows:0,warningRows:0,hasBlockingErrors:true});
assert.deepEqual(validate([row]),validate([row])); // Duplicate state cannot leak between calls.
const headers = ['index_number','full_name','school_name'];
assert.equal(validateFileHeaders(headers.map(h=>' '+h.toUpperCase()+' '),[]).valid,true);
for(const missing of headers) assert.deepEqual(validateFileHeaders(headers.filter(h=>h!==missing),[]).missingColumns,[missing]);
assert.equal(validateFileHeaders([...headers,' INDEX_NUMBER '],[]).valid,false);
assert.deepEqual(validateFileHeaders([...headers,'Ignored'],[]).unknownColumns,['Ignored']);
assert.equal(validateFileHeaders([...headers,'Ignored'],[]).valid,true);

const examination = {id:'fake-exam',name:'Fake Examination',year:2026,status:'DRAFT'};
const pubSubjects = [{id:'required',subject_name:'Required',subject_code:'REQ',required:true,display_order:1}];
const students = Array.from({length:20},(_,i)=>({id:`fake-${i}`,full_name:`Fake Student ${i}`,index_number:`FAKE${i}`,nic_number:null,school_name:'Fake School'}));
const results = students.map(s=>({student_id:s.id,subject_id:'required',grade:'A'}));
const base = {examination,subjects:pubSubjects,students,results,validatedAt:'2026-01-01T00:00:00.000Z'};
function check(report,id) { return report.checks.find(c=>c.id===id); }
const ready = buildPublicationValidation(base);
assert.equal(ready.canPublish,true); assert.equal(ready.validatedAt,base.validatedAt);
assert.deepEqual(buildPublicationValidation(base),ready);
for(const [count,expected,canPublish] of [[0,'pass',true],[1,'warn',true],[2,'warn',true],[3,'fail',false],[20,'fail',false]]) {
  const report = buildPublicationValidation({...base,results:results.slice(count)});
  assert.equal(check(report,'check_3_1').status,expected); assert.equal(report.canPublish,canPublish);
  assert.equal(report.incompleteStudents,count); assert.equal(report.completeStudents,20-count);
  assert.equal(report.statusDistribution.incomplete,count);
}
// The existing threshold rounds UP: 3 incomplete out of 21 warn; 4 block.
for(const [count,expected] of [[3,'warn'],[4,'fail']]) {
  const extra = {...students[0],id:'fake-extra',index_number:'FAKEEXTRA'};
  const report = buildPublicationValidation({...base,students:[...students,extra],results:[...results,{student_id:extra.id,subject_id:'required',grade:'B'}].slice(count)});
  assert.equal(check(report,'check_3_1').status,expected);
}
for(const [patch,id] of [[{subjects:[]},'check_1_3'],[{students:[],results:[]},'check_2_1'],
  [{examination:{...examination,status:'ARCHIVED'}},'check_1_1'],
  [{students:[{...students[0],index_number:' '}]},'check_2_4'],
  [{students:[students[0],{...students[1],index_number:' fake0 '}]},'check_2_2'],
  [{students:[{...students[0],nic_number:'000000000v'},{...students[1],nic_number:' 000000000V '}]},'check_2_3'],
  [{results:[...results,{student_id:students[0].id,subject_id:'inactive',grade:'INVALID'}]},'check_3_3']]) {
  const report = buildPublicationValidation({...base,...patch});
  assert.equal(check(report,id).status,'fail'); assert.equal(report.canPublish,false);
  assert(!JSON.stringify(report).includes('000000000V'));
}
for(const status of ['DRAFT','READY','PUBLISHED']) {
  const report = buildPublicationValidation({...base,examination:{...examination,status}});
  assert.equal(report.canPublish,true); // Readiness is separate from transition permission.
  assert.equal(check(report,'check_1_2').status,status==='PUBLISHED'?'info':'pass');
}
for(const [grade,status] of [[' a ','PASSED'],['w','NOT_PASSED'],['ab','ABSENT']]) {
  const report = buildPublicationValidation({...base,results:results.map(r=>({...r,grade}))});
  assert.equal(report.studentRows[0].overallStatus,status);
}
for(const [coverage,expected] of [[9,'warn'],[10,'pass']]) assert.equal(check(buildPublicationValidation({...base,results:results.slice(0,coverage)}),'check_4_3').status,expected);
const optional = buildPublicationValidation({...base,subjects:pubSubjects.map(s=>({...s,required:false})),results:[]});
assert.equal(check(optional,'check_1_4').status,'warn'); assert.equal(optional.canPublish,true);
assert.equal(optional.statusDistribution.incomplete,20);
console.log('PASS: import validity/duplicates/partial summaries/header rules and publication completeness thresholds, coverage, corruption, masked duplicates and readiness states.');
