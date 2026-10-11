-- Synthetic development/test data only. This is not a migration and must not
-- be applied to Preview or Production projects.
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
  ('3a320000-0000-4000-8000-000000002026', 'Fictional Student 001', 'OL2026001', '000000000001', 'Example Academy Alpha'),
  ('3a320000-0000-4000-8000-000000002026', 'Fictional Student 002', 'OL2026002', '000000000002', 'Example Academy Beta'),
  ('3a320000-0000-4000-8000-000000002026', 'Fictional Student 003', 'OL2026003', '000000000003', 'Example Academy Gamma'),
  ('3a320000-0000-4000-8000-000000002026', 'Fictional Student 004', 'OL2026004', '000000000004', 'Example Academy Delta'),
  ('3a320000-0000-4000-8000-000000002026', 'Fictional Student 005', 'OL2026005', '000000000005', 'Example Academy Epsilon')
ON CONFLICT (examination_id, index_number) DO NOTHING;

COMMIT;
