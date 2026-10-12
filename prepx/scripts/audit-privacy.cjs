const { createClient } = require('@supabase/supabase-js');

const PAGE_SIZE = 1000;

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error('configuration');
  return value;
}

function isNicKey(key) {
  return key.replaceAll('_', '').replaceAll('-', '').toLowerCase() === 'nicnumber';
}

function isMaskedNic(value) {
  return typeof value === 'string' && (/^\*+$/.test(value) || /^\*+[0-9A-Z]{4}$/i.test(value));
}

function countUnmaskedNicFields(value) {
  if (Array.isArray(value)) {
    return value.reduce((count, item) => count + countUnmaskedNicFields(item), 0);
  }
  if (!value || typeof value !== 'object') return 0;
  return Object.entries(value).reduce((count, [key, item]) => {
    if (isNicKey(key)) return count + (item === null || isMaskedNic(item) ? 0 : 1);
    return count + countUnmaskedNicFields(item);
  }, 0);
}

async function loadAuditPage(client, from) {
  let lastError = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const result = await client
      .from('audit_logs')
      .select('old_value,new_value')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (!result.error) return result.data ?? [];
    lastError = result.error;
  }
  throw new Error(`query:${lastError?.code || 'network'}`);
}

async function main() {
  const client = createClient(
    required('NEXT_PUBLIC_SUPABASE_URL'),
    required('SUPABASE_SECRET_KEY'),
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  let auditRowsChecked = 0;
  let unmaskedNicFieldsFound = 0;

  for (let from = 0; ; from += PAGE_SIZE) {
    const data = await loadAuditPage(client, from);
    for (const row of data) {
      auditRowsChecked += 1;
      unmaskedNicFieldsFound += countUnmaskedNicFields(row.old_value);
      unmaskedNicFieldsFound += countUnmaskedNicFields(row.new_value);
    }
    if (data.length < PAGE_SIZE) break;
  }

  console.log(JSON.stringify({ auditRowsChecked, unmaskedNicFieldsFound }));
  if (unmaskedNicFieldsFound > 0) process.exitCode = 2;
}

main().catch((error) => {
  const reason = error instanceof Error ? error.message : 'configuration';
  const [stage, code] = reason.split(':', 2);
  console.error(
    `Audit-log privacy verification failed at the ${stage === 'query' ? 'query' : 'configuration'} stage${code ? ` (${code})` : ''} without exposing row data.`
  );
  process.exitCode = 1;
});
