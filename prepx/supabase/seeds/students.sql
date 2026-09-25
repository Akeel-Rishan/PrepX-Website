-- Step 5.1 development seed. Reruns preserve existing students.
DO $$
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
  SELECT exam_id, 'Student ' || n, 'OL2026' || LPAD(n::text, 3, '0'),
    (2003 + (n % 5))::text || LPAD(n::text, 8, '0'),
    CASE (n % 4) WHEN 0 THEN 'Zahira College' WHEN 1 THEN 'Royal College'
      WHEN 2 THEN 'Visakha Vidyalaya' ELSE 'Muslim Ladies College' END,
    CASE (n % 2) WHEN 0 THEN 'Centre A' ELSE 'Centre B' END
  FROM generate_series(6, 60) AS n
  ON CONFLICT (examination_id, index_number) DO NOTHING;
END $$;
