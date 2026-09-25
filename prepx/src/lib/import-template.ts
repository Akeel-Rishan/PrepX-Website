const COMMENT = '# Valid grades: A, B, C, S, W, AB | Do not remove or rename column headers';
const EXAMPLE_GRADES = ['A', 'B', 'C', 'S', 'W', 'AB'];

function escapeCsv(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Generates a CSV import template with subject columns in the supplied order. */
export function generateCsvTemplate(subjects: Array<{ subject_name: string }>): string {
  const columns = [
    'index_number',
    'nic_number',
    'full_name',
    'school_name',
    ...subjects.map((subject) => subject.subject_name),
  ];
  const example = [
    'OL2026001',
    '200312345678',
    'Student Full Name',
    'School Name',
    ...subjects.map((_, index) => EXAMPLE_GRADES[index % EXAMPLE_GRADES.length]),
  ];
  return [COMMENT, columns.map(escapeCsv).join(','), example.map(escapeCsv).join(',')].join('\r\n');
}
