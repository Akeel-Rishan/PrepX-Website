const assert = require('node:assert/strict');
const { load, harness, search, valid } = require('./test-result-search.cjs');
const { publicResultSchema } = load('src/lib/validations/public-result.ts');
const nic = '000000000000'; // Synthetic format-only identifier, not student data.
const limiter = async () => ({ allowed:true, headers:{} });
const fake = options => harness({ nic, limiter, ...options });
async function main() {
  for(const [grade,expected] of [['A','Passed'],['B','Passed'],['C','Passed'],['S','Passed'],['W','Not Passed'],['AB','Absent'],[null,'Incomplete']]) {
    const h = fake({ grades: grade ? [{subject_id:'s1',grade,marks:987,total:876,average:765,rank:654}] : [],
      studentFields:{overallStatus:'CLIENT_OR_DATABASE_CLAIM',marks:987,total:876,average:765,rank:654,nicNumber:nic} });
    const response = await search(h);
    assert.equal(response.status,200);
    assert.equal(response.body.overallStatus,expected); // Actual route invokes the real status function.
    assert.deepEqual(publicResultSchema.parse(response.body),response.body);
    assert.deepEqual(Object.keys(response.body).sort(),['studentName','indexNumber','maskedNic','schoolName','examinationCenter','examinationName','examinationYear','grades','overallStatus'].sort());
    for(const entry of response.body.grades) assert.deepEqual(Object.keys(entry).sort(),['subjectName','subjectCode','displayOrder','grade'].sort());
    const json = JSON.stringify(response.body);
    for(const secret of [nic,'CLIENT_OR_DATABASE_CLAIM','987','876','765','654']) assert(!json.includes(secret));
    assert.equal(response.body.maskedNic,'********0000');
    const contaminated = {...response.body,nicNumber:nic,marks:987,total:876,average:765,rank:654,
      grades:response.body.grades.map(g=>({...g,marks:987,subjectId:'PRIVATE'}))};
    assert.deepEqual(publicResultSchema.parse(contaminated),response.body);
    for(const maskedNic of [nic,'000000000V','********00000','plain']) assert.equal(publicResultSchema.safeParse({...response.body,maskedNic}).success,false);
    for(const overallStatus of ['PASSED','unknown',null]) assert.equal(publicResultSchema.safeParse({...response.body,overallStatus}).success,false);
  }
  for(const input of [{indexNumber:' fake001 '},{nicNumber:nic},{nicNumber:' 000000000v '}]) {
    const h = fake({nic:input.nicNumber?.trim().toUpperCase() ?? nic});
    const result = await search(h,{examinationId:valid.examinationId,...input});
    assert.equal(result.status,200);
    const field = input.indexNumber ? 'index_number' : 'nic_number';
    assert.equal(h.calls.find(c=>c.table==='students').filters[field],(input.indexNumber ?? input.nicNumber).trim().toUpperCase());
    if(input.nicNumber) assert(!JSON.stringify(result.body).includes(input.nicNumber.trim().toUpperCase()));
  }
  for(const status of ['DRAFT','READY','ARCHIVED']) {
    const response = await search(fake({status}));
    assert.equal(response.status,403); assert.equal(response.body.error,'NOT_PUBLISHED');
  }
  assert.equal((await search(fake({missingStudent:true}))).body.error,'NOT_FOUND');
  for(const body of [{...valid,indexNumber:''},{...valid,indexNumber:'A/B'},{...valid,indexNumber:'<script>'},
    {...valid,indexNumber:1},{examinationId:valid.examinationId,nicNumber:'bad'}, {...valid,overallStatus:'Passed'}]) {
    const h = fake(); assert.equal((await search(h,body)).status,400); assert.equal(h.clientCount(),0);
  }
  console.log('PASS: real server status derivation, lookup normalization, unpublished/not-found separation and nested public allowlists/masking without network calls.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
