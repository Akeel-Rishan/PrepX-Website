const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
// Same TypeScript transpilation convention as the existing unit tests; no network/module downloads.
function load(file, globals = {}, overrides = {}) {
  const filename = path.resolve(file);
  const source = fs.readFileSync(filename, 'utf8');
  const parsed = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.ES2020,
    true,
    ts.ScriptKind.JS
  );
  if (parsed.parseDiagnostics.length) throw new Error('Load script syntax check failed.');
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(
    output,
    {
      exports,
      ...globals,
      require(name) {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (name.startsWith('./'))
          return load(path.join(path.dirname(filename), name), globals, overrides);
        throw new Error('Unexpected import in k6 script.');
      },
    },
    { filename }
  );
  return exports;
}
module.exports = { load };
