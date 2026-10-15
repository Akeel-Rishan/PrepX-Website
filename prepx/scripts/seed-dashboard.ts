import { loadEnvConfig } from '@next/env';
import { createClient } from '@supabase/supabase-js';
import type { ExaminationInsert, StudentInsert } from '../src/types';

// Synthetic fixtures only. Stable IDs make this development seed repeatable
// without changing existing rows. Never run against Preview or Production.
const examinations: ExaminationInsert[] = [
  {
    id: '3a320000-0000-4000-8000-000000002026',
    name: 'PrepX O/L Model Exam',
    year: 2026,
    organization_name: 'Undergraduate Society of Mawanella',
    status: 'PUBLISHED',
  },
  {
    id: '3a320000-0000-4000-8000-000000002025',
    name: 'PrepX O/L Model Exam',
    year: 2025,
    organization_name: 'Undergraduate Society of Mawanella',
    status: 'ARCHIVED',
  },
  {
    id: '3a320000-0000-4000-8000-000000002027',
    name: 'PrepX O/L Model Exam',
    year: 2027,
    organization_name: 'Undergraduate Society of Mawanella',
    status: 'DRAFT',
  },
];

const students: StudentInsert[] = [
  {
    full_name: 'Fictional Student 001',
    index_number: 'OL2026001',
    nic_number: '000000000001',
    school_name: 'Example Academy Alpha',
  },
  {
    full_name: 'Fictional Student 002',
    index_number: 'OL2026002',
    nic_number: '000000000002',
    school_name: 'Example Academy Beta',
  },
  {
    full_name: 'Fictional Student 003',
    index_number: 'OL2026003',
    nic_number: '000000000003',
    school_name: 'Example Academy Gamma',
  },
  {
    full_name: 'Fictional Student 004',
    index_number: 'OL2026004',
    nic_number: '000000000004',
    school_name: 'Example Academy Delta',
  },
  {
    full_name: 'Fictional Student 005',
    index_number: 'OL2026005',
    nic_number: '000000000005',
    school_name: 'Example Academy Epsilon',
  },
].map((student) => ({ ...student, examination_id: '3a320000-0000-4000-8000-000000002026' }));

async function seedDashboard(): Promise<void> {
  loadEnvConfig(process.cwd());
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('Supabase URL and secret key are required.');
  const supabase = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: examsError } = await supabase
    .from('examinations')
    .upsert(examinations, { onConflict: 'id', ignoreDuplicates: true });
  if (examsError) throw new Error(`Examination seed failed (${examsError.code}).`);

  const { error: studentsError } = await supabase
    .from('students')
    .upsert(students, { onConflict: 'examination_id,index_number', ignoreDuplicates: true });
  if (studentsError)
    throw new Error(`Student seed failed (${studentsError.code}); rerunning is safe.`);

  console.log(
    'Dashboard seed complete: three examination records and five student records ensured. Existing rows were not overwritten.'
  );
}

seedDashboard().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Dashboard seed failed.');
  process.exitCode = 1;
});
