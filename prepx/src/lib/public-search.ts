export const NIC_REGEX = /^([0-9]{9}[VvXx]|[0-9]{12})$/;

/** Canonical form shared by validation, lookup inputs and rate-limit fingerprints. */
export function normalizeSearchIdentifier(value: string): string {
  return value.trim().toUpperCase();
}

export const PUBLIC_SEARCH_ERROR_MESSAGES = {
  NOT_FOUND:
    'The provided information does not match any available result. Please check your Index Number or NIC and try again.',
  NOT_PUBLISHED:
    'Results have not been published yet. Please check back after the official announcement.',
  RATE_LIMITED: 'Too many attempts. Please wait a moment and try again.',
  VALIDATION_ERROR: 'Please enter your Index Number or NIC Number.',
  INVALID_NIC:
    'Please enter a valid NIC number. Use 9 digits followed by V or X, or enter 12 digits.',
  SERVER_ERROR: 'Something went wrong. Please try again.',
} as const;

export type PublicSearchApiErrorCode = Exclude<
  keyof typeof PUBLIC_SEARCH_ERROR_MESSAGES,
  'INVALID_NIC'
>;

export type PreparedPublicSearch =
  | {
      ok: true;
      indexNumber?: string;
      nicNumber?: string;
    }
  | {
      ok: false;
      message: string;
    };

/** Normalize and validate public lookup fields before sending any network request. */
export function preparePublicSearch(indexNumber: string, nicNumber: string): PreparedPublicSearch {
  const normalizedIndex = normalizeSearchIdentifier(indexNumber);
  const normalizedNic = normalizeSearchIdentifier(nicNumber);

  if (!normalizedIndex && !normalizedNic) {
    return { ok: false, message: PUBLIC_SEARCH_ERROR_MESSAGES.VALIDATION_ERROR };
  }

  if (normalizedNic && !NIC_REGEX.test(normalizedNic)) {
    return { ok: false, message: PUBLIC_SEARCH_ERROR_MESSAGES.INVALID_NIC };
  }

  return {
    ok: true,
    indexNumber: normalizedIndex || undefined,
    nicNumber: normalizedNic || undefined,
  };
}

/** Convert an untrusted API error code into a safe, non-enumerating student message. */
export function getPublicSearchErrorMessage(code: unknown): string {
  if (
    typeof code === 'string' &&
    Object.hasOwn(PUBLIC_SEARCH_ERROR_MESSAGES, code) &&
    code !== 'INVALID_NIC'
  ) {
    return PUBLIC_SEARCH_ERROR_MESSAGES[code as PublicSearchApiErrorCode];
  }
  return PUBLIC_SEARCH_ERROR_MESSAGES.SERVER_ERROR;
}
