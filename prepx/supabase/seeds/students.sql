-- Step 5.1 development seed. Reruns preserve existing students.
DO $$
-- Synthetic local-development fixtures only. Never apply to Preview or Production.
DECLARE
  exam_id uuid;
BEGIN
  SELECT id INTO exam_id FROM public.examinations
  WHERE year = 2026 AND status = 'PUBLISHED' ORDER BY id LIMIT 1;
  IF exam_id IS NULL THEN
    RAISE EXCEPTION 'Run the dashboard seed first: no published 2026 examination.';
  END IF;
  INSERT INTO public.students
    (examination_id, full_name, index_number, nic_number, school_name, examination_center)
  SELECT exam_id, 'Fictional Student ' || LPAD(n::text, 3, '0'),
    'OL2026' || LPAD(n::text, 3, '0'),
    LPAD(n::text, 12, '0'),
    CASE (n % 4) WHEN 0 THEN 'Example Academy Alpha' WHEN 1 THEN 'Example Academy Beta'
      WHEN 2 THEN 'Example Academy Gamma' ELSE 'Example Academy Delta' END,
    CASE (n % 2) WHEN 0 THEN 'Example Centre A' ELSE 'Example Centre B' END
  FROM generate_series(6, 60) AS n
  ON CONFLICT (examination_id, index_number) DO NOTHING;
END $$;
