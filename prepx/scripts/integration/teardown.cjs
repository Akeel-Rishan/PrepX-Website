const fs = require('node:fs');
const path = require('node:path');
const { cleanup, configuration, root } = require('./helpers.cjs');
(async () => {
  const id = process.argv[2];
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id ?? ''))
    throw new Error('Pass one run UUID from .integration/runs; broad cleanup is not supported.');
  const filename = path.join(root, '.integration/runs', id + '.json');
  const manifest = JSON.parse(fs.readFileSync(filename, 'utf8'));
  if (manifest.runId !== id) throw new Error('Manifest mismatch.');
  await cleanup(configuration(), manifest);
  fs.unlinkSync(filename);
  console.log('Owned test-run fixtures removed. Local stack and other data retained.');
})().catch(() => {
  console.error(
    'Teardown failed. Check local setup and the run manifest; no provider details printed.'
  );
  process.exitCode = 1;
});
