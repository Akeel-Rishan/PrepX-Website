import 'server-only';
import { inflateRawSync } from 'node:zlib';

export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
const MAX_EXPANDED_BYTES = 32 * 1024 * 1024;

/** Bound actual ZIP expansion before ExcelJS constructs a workbook in memory.
 * Ordinary XLSX uses ZIP store/deflate; encrypted, ZIP64 and active content are
 * deliberately unsupported. Metadata sizes alone cannot stop forged ZIP bombs.
 */
export function validateXlsxArchive(bytes: Buffer): void {
  if (bytes.length > MAX_IMPORT_BYTES) throw new Error('Invalid import file.');
  let end = -1;
  for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset--) {
    if (bytes.readUInt32LE(offset) === 0x06054b50 && offset + 22 + bytes.readUInt16LE(offset + 20) === bytes.length) {
      end = offset;
      break;
    }
  }
  if (end < 0 || bytes.readUInt32LE(end + 4) !== 0) throw new Error('Invalid import file.');
  const entries = bytes.readUInt16LE(end + 10);
  const directorySize = bytes.readUInt32LE(end + 12);
  let cursor = bytes.readUInt32LE(end + 16);
  if (!entries || entries > 2000 || entries !== bytes.readUInt16LE(end + 8) || cursor + directorySize !== end) {
    throw new Error('Invalid import file.');
  }
  const directoryStart = cursor;
  const names = new Set<string>();
  let expanded = 0;
  for (let i = 0; i < entries; i++) {
    if (cursor + 46 > end || bytes.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Invalid import file.');
    const flags = bytes.readUInt16LE(cursor + 8);
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const expandedSize = bytes.readUInt32LE(cursor + 24);
    const nameSize = bytes.readUInt16LE(cursor + 28);
    const extraSize = bytes.readUInt16LE(cursor + 30);
    const commentSize = bytes.readUInt16LE(cursor + 32);
    const local = bytes.readUInt32LE(cursor + 42);
    const next = cursor + 46 + nameSize + extraSize + commentSize;
    if (next > end || flags & 1 || ![0, 8].includes(method) || expandedSize > MAX_EXPANDED_BYTES - expanded) {
      throw new Error('Invalid import file.');
    }
    const name = bytes.subarray(cursor + 46, cursor + 46 + nameSize).toString('utf8');
    if (names.has(name) || /[\\\u0000]/.test(name) || name.split('/').includes('..') || /(?:vbaProject|externalLinks|embeddings|activeX)|\.bin$/i.test(name)) {
      throw new Error('Invalid import file.');
    }
    names.add(name);
    if (local + 30 > directoryStart || bytes.readUInt32LE(local) !== 0x04034b50 || bytes.readUInt16LE(local + 8) !== method || bytes.readUInt16LE(local + 6) !== flags) {
      throw new Error('Invalid import file.');
    }
    const localNameSize = bytes.readUInt16LE(local + 26);
    const start = local + 30 + localNameSize + bytes.readUInt16LE(local + 28);
    if (start + compressedSize > directoryStart || bytes.subarray(local + 30, local + 30 + localNameSize).toString('utf8') !== name) {
      throw new Error('Invalid import file.');
    }
    const compressed = bytes.subarray(start, start + compressedSize);
    const content = method === 0 ? compressed : inflateRawSync(compressed, { maxOutputLength: Math.max(1, MAX_EXPANDED_BYTES - expanded) });
    if (content.length !== expandedSize) throw new Error('Invalid import file.');
    expanded += content.length;
    if (name.endsWith('.xml')) {
      const xml = content.toString('utf8');
      if (/<!DOCTYPE|<!ENTITY|macroEnabled/i.test(xml)) throw new Error('Invalid import file.');
      if (/^xl\/worksheets\//.test(name) && ((xml.match(/<row[\s>]/g)?.length ?? 0) > 1100 || (xml.match(/<c[\s>]/g)?.length ?? 0) > 275000)) {
        throw new Error('Import file contains too many rows or cells.');
      }
    }
    cursor = next;
  }
  if (cursor !== end || !names.has('[Content_Types].xml') || !names.has('xl/workbook.xml')) throw new Error('Invalid import file.');
}

export function safeImportCell(value: string): string {
  if (value.length > 1024 || /^[\s]*[=+@-]/.test(value)) throw new Error('Invalid import cell.');
  return value;
}
