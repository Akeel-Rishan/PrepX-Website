const grades = ['A', 'B', 'C', 'S', 'W', 'AB'];
const statuses = ['Passed', 'Not Passed', 'Absent', 'Incomplete'];
function keys(value, expected) {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.keys(value).sort().join('|') === expected.slice().sort().join('|')
  );
}
const text = (value) => typeof value === 'string' && value.trim().length > 0;
export function header(response, name) {
  const key = Object.keys(response.headers || {}).find(
    (key) => key.toLowerCase() === name.toLowerCase()
  );
  return key ? String(response.headers[key]) : '';
}
export function securityHeaders(response) {
  return (
    /application\/json/i.test(header(response, 'content-type')) &&
    /no-store/i.test(header(response, 'cache-control')) &&
    header(response, 'x-content-type-options') === 'nosniff' &&
    header(response, 'x-frame-options') === 'DENY' &&
    /noindex/.test(header(response, 'x-robots-tag'))
  );
}
export function parseJson(response) {
  try {
    return JSON.parse(response.body);
  } catch {
    return null;
  }
}
export function publicResult(body, c) {
  if (
    !keys(body, [
      'studentName',
      'indexNumber',
      'maskedNic',
      'schoolName',
      'examinationCenter',
      'examinationName',
      'examinationYear',
      'grades',
      'overallStatus',
    ])
  )
    return false;
  if (
    ![body.studentName, body.indexNumber, body.schoolName, body.examinationName].every(text) ||
    (c.index && body.indexNumber !== c.index)
  )
    return false;
  if (body.examinationCenter !== null && typeof body.examinationCenter !== 'string') return false;
  if (
    !Number.isInteger(body.examinationYear) ||
    body.examinationYear < 2000 ||
    body.examinationYear > 2100 ||
    !statuses.includes(body.overallStatus)
  )
    return false;
  if (
    body.maskedNic !== null &&
    (typeof body.maskedNic !== 'string' || !/^\*+[0-9VX]{0,4}$/i.test(body.maskedNic))
  )
    return false;
  if (c.nic && body.maskedNic !== '*'.repeat(c.nic.length - 4) + c.nic.slice(-4)) return false;
  if (!Array.isArray(body.grades) || !body.grades.length) return false;
  return body.grades.every(
    (g) =>
      keys(g, ['subjectName', 'subjectCode', 'displayOrder', 'grade']) &&
      text(g.subjectName) &&
      (g.subjectCode === null || typeof g.subjectCode === 'string') &&
      Number.isInteger(g.displayOrder) &&
      (g.grade === null || grades.includes(g.grade))
  );
}
export function privateDataAbsent(response, c) {
  const raw = typeof response.body === 'string' ? response.body : '';
  return (
    ![c.nic, c.authorization, c.examinationId]
      .filter(Boolean)
      .some((value) => raw.includes(value)) &&
    !/(?:\b(?:sb_secret_|sb_publishable_|service_role|postgres(?:ql)?:\/\/)|\b(?:stack|digest|sql|nic_number|nicNumber|marks|total|average|rank|audit)"\s*:|supabase\.co|upstash\.io)/i.test(
      raw
    )
  );
}
export function limitedResponse(body, response) {
  return (
    keys(body, ['error', 'message']) &&
    body.error === 'RATE_LIMITED' &&
    body.message === 'Too many search attempts. Please try again later.' &&
    /^\d+$/.test(header(response, 'retry-after')) &&
    Number(header(response, 'retry-after')) > 0 &&
    header(response, 'x-ratelimit-remaining') === '0' &&
    /^[1-9]\d*$/.test(header(response, 'x-ratelimit-limit')) &&
    /^\d+$/.test(header(response, 'x-ratelimit-reset'))
  );
}
export function healthResponse(body) {
  return (
    keys(body, ['status', 'service', 'timestamp']) &&
    body.status === 'ok' &&
    body.service === 'prepx' &&
    typeof body.timestamp === 'string' &&
    Number.isFinite(Date.parse(body.timestamp))
  );
}
