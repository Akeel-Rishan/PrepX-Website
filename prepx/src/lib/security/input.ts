import { z } from 'zod';
import '@/lib/security/zod';
import { normalizeSearchIdentifier, NIC_REGEX } from '@/lib/public-search';

// Pure helpers are shared with previews, but every write validates again on the
// server. NFC preserves Sinhala/Tamil combining sequences; never HTML-encode.
export function sanitizeSingleLineText(value: string): string {
  return value.normalize('NFC').trim().replace(/\p{Zs}+/gu, ' ');
}

export function isSafePlainText(value: string, multiline = false): boolean {
  const controls = multiline
    ? /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/
    : /[\u0000-\u001f\u007f-\u009f\u2028\u2029]/;
  // These fields never store HTML. Preserve punctuation and all writing systems.
  return !controls.test(value) && !/[<>]/.test(value);
}

export function plainTextSchema(max: number, min = 0, multiline = false) {
  return z.string()
    .max(max + 256, 'Text is too long.')
    .refine((value) => isSafePlainText(value, multiline), 'Enter plain text without markup or control characters.')
    .transform((value) => multiline ? value.normalize('NFC').trim() : sanitizeSingleLineText(value))
    .pipe(z.string().min(min, 'This field is required.').max(max, 'Text is too long.'));
}

/** Reject controls BEFORE trim, so a line break cannot become a valid lookup. */
export function identifierTextSchema(max: number) {
  return z.string().max(max + 64, 'Identifier is too long.')
    .refine((value) => isSafePlainText(value), 'Invalid identifier.')
    .transform(normalizeSearchIdentifier)
    .pipe(z.string().max(max, 'Identifier is too long.'));
}

export const indexSchema = identifierTextSchema(50)
  .refine((value) => /^[A-Z0-9]+$/.test(value), 'Index number must contain only letters and numbers.');
export const optionalNicSchema = identifierTextSchema(12)
  .refine((value) => value === '' || NIC_REGEX.test(value), 'Invalid NIC format.');

/** Bound non-upload FormData independently of the framework's import envelope. */
export function isSmallFormData(data: FormData, maxBytes = 16 * 1024): boolean {
  let size = 0;
  for (const [key, value] of data.entries()) {
    if (typeof value !== 'string') return false;
    size += new TextEncoder().encode(key).byteLength + new TextEncoder().encode(value).byteLength;
    if (size > maxBytes) return false;
  }
  return true;
}
