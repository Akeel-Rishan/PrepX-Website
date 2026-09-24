-- Development/test data requested for Step 3.2. This is not a migration.
-- Stable IDs and conflict handling make reruns safe without overwriting rows.
-- The matching scripts/seed-dashboard.ts provides an alternative via the API.
BEGIN;

INSERT INTO public.examinations (id, name, year, organization_name, status)
VALUES
  ('3a320000-0000-4000-8000-000000002026', 'PrepX O/L Model Exam', 2026, 'PrepX Institute', 'PUBLISHED'),
  ('3a320000-0000-4000-8000-000000002025', 'PrepX O/L Model Exam', 2025, 'PrepX Institute', 'ARCHIVED'),
  ('3a320000-0000-4000-8000-000000002027', 'PrepX O/L Model Exam', 2027, 'PrepX Institute', 'DRAFT')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (examination_id, full_name, index_number, nic_number, school_name)
VALUES
  ('3a320000-0000-4000-8000-000000002026', 'Mohamed Akeel', 'OL2026001', '200312345678', 'Zahira College'),
  ('3a320000-0000-4000-8000-000000002026', 'Amali Perera', 'OL2026002', '200456789012', 'Visakha Vidyalaya'),
  ('3a320000-0000-4000-8000-000000002026', 'Kasun Fernando', 'OL2026003', '200387654321', 'Royal College'),
  ('3a320000-0000-4000-8000-000000002026', 'Fathima Rizna', 'OL2026004', '200398765432', 'Muslim Ladies College'),
  ('3a320000-0000-4000-8000-000000002026', 'Dinusha Silva', 'OL2026005', '200312398765', 'Mahanama College')
ON CONFLICT (examination_id, index_number) DO NOTHING;

COMMIT;
