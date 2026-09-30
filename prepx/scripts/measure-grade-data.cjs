// Read-only comparison with the pre-audit grade module in Git HEAD.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { execFileSync } = require('node:child_process');
const ts = require('typescript');
const { createClient } = require('@supabase/supabase-js');
require('@next/env').loadEnvConfig(process.cwd());
let requests = 0;
const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { fetch: (...args) => { requests++; return fetch(...args); } },
});
const repo = path.resolve('..').replaceAll('\\', '/');
const legacy = execFileSync('git', ['-c', 'safe.directory=' + repo, 'show', 'HEAD:prepx/src/lib/data/grades.ts'], { encoding: 'utf8' });
function loader(version) {
  const modules = new Map();
  const cache = new Map();
  function load(file) {
    const filename = path.resolve(file);
    if (modules.has(filename)) return modules.get(filename).exports;
    const m = new Module(filename, module);
    modules.set(filename, m);
    m.filename = filename;
    m.paths = module.paths;
    m.require = name => {
      if (name === 'server-only') return {};
      if (name === '@/lib/supabase/server') return { createAdminClient: () => client };
      if (name === 'next/cache') return { unstable_cache: (fn, keys) => async (...args) => {
        const key = JSON.stringify([keys, args]);
        if (cache.has(key)) return cache.get(key);
        const value = await fn(...args); cache.set(key, value); return value;
      } };
      if (name.startsWith('@/')) return load('src/' + name.slice(2) + '.ts');
      return require(name);
    };
    const source = version === 'before' && file === 'src/lib/data/grades.ts' ? legacy : fs.readFileSync(filename, 'utf8');
    m._compile(ts.transpileModule(source, { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true,
    } }).outputText, filename);
    return m.exports;
  }
  return load('src/lib/data/grades.ts');
}
async function main() {
  const { data: exams, error } = await client.from('examinations').select('id, students(count)');
  if (error) throw new Error('Fixture read failed');
  const exam = exams.sort((a, b) => b.students[0].count - a.students[0].count)[0];
  assert.ok(exam && exam.students[0].count > 0);
  const measurements = [];
  for (let pass = 0; pass < 3; pass++) {
    const output = {};
    for (const version of pass % 2 ? ['after', 'before'] : ['before', 'after']) {
      const { getGradeGridData } = loader(version);
      output[version] = [];
      for (const [scenario, filters] of [
        ['cold', {}], ['page-change', { page: 2 }], ['search-change', { search: 'OL' }],
      ]) {
        requests = 0;
        const start = performance.now();
        const data = await getGradeGridData({ examinationId: exam.id, ...filters });
        measurements.push({ version, scenario, milliseconds: Math.round(performance.now() - start), requests });
        assert.equal(data.error, undefined);
        output[version].push(data);
      }
    }
    assert.deepEqual(output.after, output.before, 'Optimization must preserve returned grades, pagination and summaries');
  }
  const report = { students: exam.students[0].count, measurements };
  fs.mkdirSync('node_modules/.cache/prepx-performance', { recursive: true });
  fs.writeFileSync('node_modules/.cache/prepx-performance/grade-data-audit.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
main().catch(() => { console.error('Grade data benchmark failed; no record data logged.'); process.exitCode = 1; });
