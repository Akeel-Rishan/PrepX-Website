import 'server-only';

import { createAdminClient } from '@/lib/supabase/server';
import { maskNIC } from '@/lib/utils';
import type { AuditLogInsert } from '@/types';
import type { Json } from '@/types/database';

// Audit records persist independently of students. Never retain a full NIC.
function redact(value: Json): Json {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        key === 'nic_number' && typeof item === 'string'
          ? maskNIC(item)
          : item === undefined
            ? null
            : redact(item),
      ])
    );
  }
  return value;
}

export async function createAuditLog(entry: AuditLogInsert): Promise<void> {
  const { error } = await createAdminClient()
    .from('audit_logs')
    .insert({
      ...entry,
      old_value: redact(entry.old_value ?? null),
      new_value: redact(entry.new_value ?? null),
    });
  if (error) {
    console.error('[Audit Log Error]', { code: error.code });
    throw new Error('Audit log could not be recorded.');
  }
}
