-- Subject headers must be unambiguous for CSV/XLSX imports.
-- These indexes deliberately fail on pre-existing duplicates instead of deleting data.
CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_exam_name_unique
  ON public.subjects (examination_id, lower(btrim(subject_name)));

CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_exam_code_unique
  ON public.subjects (examination_id, lower(btrim(subject_code)))
  WHERE subject_code IS NOT NULL AND btrim(subject_code) <> '';

-- Pin the function search path because it executes with the owner's privileges.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = auth.uid()
  );
$$;

-- A result must connect a student and subject from the same examination.
-- Independent foreign keys alone cannot enforce this cross-table invariant.
CREATE OR REPLACE FUNCTION public.enforce_result_same_examination()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  student_examination uuid;
  subject_examination uuid;
BEGIN
  SELECT examination_id INTO student_examination
  FROM public.students
  WHERE id = NEW.student_id;

  SELECT examination_id INTO subject_examination
  FROM public.subjects
  WHERE id = NEW.subject_id;

  IF student_examination IS DISTINCT FROM subject_examination THEN
    RAISE EXCEPTION 'Student and subject must belong to the same examination'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_results_same_examination ON public.student_results;
CREATE TRIGGER trg_results_same_examination
  BEFORE INSERT OR UPDATE OF student_id, subject_id ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION public.enforce_result_same_examination();
