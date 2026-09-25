-- Step 6.1 seed; preserves existing subjects and appends missing entries.
DO $$
DECLARE
  exam_id uuid;
  next_order integer;
  item record;
BEGIN
  SELECT id INTO exam_id FROM public.examinations
    WHERE year = 2026 AND status = 'PUBLISHED' ORDER BY id LIMIT 1;
  IF exam_id IS NULL THEN RAISE EXCEPTION 'A published 2026 examination is required.'; END IF;
  -- Serialize reruns of this seed for this examination.
  PERFORM 1 FROM public.examinations WHERE id = exam_id FOR UPDATE;
  SELECT COALESCE(MAX(display_order), -1) + 1 INTO next_order FROM public.subjects WHERE examination_id = exam_id;
  FOR item IN SELECT * FROM (VALUES
    ('Tamil', 'TML', true), ('English', 'ENG', true), ('Mathematics', 'MAT', true),
    ('Science', 'SCI', true), ('History', 'HIS', true), ('Religion', 'REL', false),
    ('ICT', 'ICT', false), ('Commerce', 'COM', false)
  ) AS seed(name, code, required)
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE examination_id = exam_id
      AND (upper(subject_code) = item.code OR lower(subject_name) = lower(item.name))) THEN
      INSERT INTO public.subjects (examination_id, subject_name, subject_code, display_order, required, active)
      VALUES (exam_id, item.name, item.code, next_order, item.required, true);
      next_order := next_order + 1;
    END IF;
  END LOOP;
END $$;
