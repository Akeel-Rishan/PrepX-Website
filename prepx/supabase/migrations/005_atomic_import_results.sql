-- ============================================================
-- PrepX atomic result import
-- Migration: 005_atomic_import_results
-- Student upserts, grade upserts, and the audit entry either all
-- commit together or all roll back together.
-- ============================================================

CREATE OR REPLACE FUNCTION public.import_exam_results(
  p_examination_id uuid,
  p_rows jsonb,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status text;
  v_row jsonb;
  v_student_id uuid;
  v_index_number text;
  v_nic_number text;
  v_full_name text;
  v_school_name text;
  v_examination_center text;
  v_subject_key text;
  v_subject_id uuid;
  v_grade text;
  v_rows_processed integer := 0;
  v_grades_written integer := 0;
  v_seen_indexes text[] := ARRAY[]::text[];
  v_seen_nics text[] := ARRAY[]::text[];
BEGIN
  IF p_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = p_admin_id
  ) THEN
    RAISE EXCEPTION 'Administrator authorization required.' USING ERRCODE = '42501';
  END IF;

  SELECT status
  INTO v_status
  FROM public.examinations
  WHERE id = p_examination_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Examination not found.' USING ERRCODE = 'P0002';
  END IF;

  IF v_status NOT IN ('DRAFT', 'READY') THEN
    RAISE EXCEPTION 'Published and archived examinations are read-only.'
      USING ERRCODE = '55000';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' THEN
    RAISE EXCEPTION 'Import rows must be a JSON array.' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_rows) = 0 OR jsonb_array_length(p_rows) > 1000 THEN
    RAISE EXCEPTION 'Import must contain between 1 and 1000 rows.'
      USING ERRCODE = '22023';
  END IF;

  FOR v_row IN SELECT value FROM jsonb_array_elements(p_rows)
  LOOP
    IF jsonb_typeof(v_row) <> 'object' THEN
      RAISE EXCEPTION 'Every import row must be an object.' USING ERRCODE = '22023';
    END IF;

    v_index_number := upper(btrim(COALESCE(v_row->>'index_number', '')));
    v_nic_number := NULLIF(upper(btrim(COALESCE(v_row->>'nic_number', ''))), '');
    v_full_name := btrim(COALESCE(v_row->>'full_name', ''));
    v_school_name := btrim(COALESCE(v_row->>'school_name', ''));
    v_examination_center := NULLIF(btrim(COALESCE(v_row->>'examination_center', '')), '');

    IF v_index_number = '' OR length(v_index_number) > 50
       OR v_index_number !~ '^[A-Z0-9]+$' THEN
      RAISE EXCEPTION 'Invalid index number in import row.' USING ERRCODE = '22023';
    END IF;
    IF v_index_number = ANY(v_seen_indexes) THEN
      RAISE EXCEPTION 'Duplicate index number in import payload: %.', v_index_number
        USING ERRCODE = '22023';
    END IF;
    v_seen_indexes := array_append(v_seen_indexes, v_index_number);

    IF v_full_name = '' OR length(v_full_name) > 200 THEN
      RAISE EXCEPTION 'Invalid student name in import row.' USING ERRCODE = '22023';
    END IF;
    IF v_school_name = '' OR length(v_school_name) > 200 THEN
      RAISE EXCEPTION 'Invalid school name in import row.' USING ERRCODE = '22023';
    END IF;
    IF v_examination_center IS NOT NULL AND length(v_examination_center) > 200 THEN
      RAISE EXCEPTION 'Invalid examination center in import row.' USING ERRCODE = '22023';
    END IF;

    IF v_nic_number IS NOT NULL THEN
      IF v_nic_number !~ '^([0-9]{9}[VX]|[0-9]{12})$' THEN
        RAISE EXCEPTION 'Invalid NIC format in import row.' USING ERRCODE = '22023';
      END IF;
      IF v_nic_number = ANY(v_seen_nics) THEN
        RAISE EXCEPTION 'Duplicate NIC in import payload.' USING ERRCODE = '22023';
      END IF;
      v_seen_nics := array_append(v_seen_nics, v_nic_number);
    END IF;

    IF v_row->'grades' IS NULL OR jsonb_typeof(v_row->'grades') <> 'object' THEN
      RAISE EXCEPTION 'Grades must be a JSON object.' USING ERRCODE = '22023';
    END IF;

    INSERT INTO public.students (
      examination_id,
      full_name,
      index_number,
      nic_number,
      school_name,
      examination_center
    )
    VALUES (
      p_examination_id,
      v_full_name,
      v_index_number,
      v_nic_number,
      v_school_name,
      v_examination_center
    )
    ON CONFLICT (examination_id, index_number)
    DO UPDATE SET
      full_name = EXCLUDED.full_name,
      nic_number = EXCLUDED.nic_number,
      school_name = EXCLUDED.school_name,
      examination_center = EXCLUDED.examination_center,
      updated_at = now()
    RETURNING id INTO v_student_id;

    v_rows_processed := v_rows_processed + 1;

    FOR v_subject_key, v_grade IN
      SELECT key, upper(btrim(value))
      FROM jsonb_each_text(v_row->'grades')
    LOOP
      IF v_subject_key !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        RAISE EXCEPTION 'Invalid subject identifier in import row.' USING ERRCODE = '22023';
      END IF;
      v_subject_id := v_subject_key::uuid;

      IF NOT EXISTS (
        SELECT 1
        FROM public.subjects
        WHERE id = v_subject_id
          AND examination_id = p_examination_id
          AND active = true
      ) THEN
        RAISE EXCEPTION 'An imported subject is not active for this examination.'
          USING ERRCODE = '23514';
      END IF;

      IF v_grade = '' THEN
        CONTINUE;
      END IF;
      IF v_grade NOT IN ('A', 'B', 'C', 'S', 'W', 'AB') THEN
        RAISE EXCEPTION 'Invalid grade value in import row.' USING ERRCODE = '23514';
      END IF;

      INSERT INTO public.student_results (student_id, subject_id, grade)
      VALUES (v_student_id, v_subject_id, v_grade)
      ON CONFLICT (student_id, subject_id)
      DO UPDATE SET grade = EXCLUDED.grade, updated_at = now();

      v_grades_written := v_grades_written + 1;
    END LOOP;
  END LOOP;

  INSERT INTO public.audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    new_value
  )
  VALUES (
    p_admin_id,
    'IMPORT_COMPLETED',
    'examination',
    p_examination_id,
    jsonb_build_object(
      'rows_processed', v_rows_processed,
      'grades_written', v_grades_written,
      'file_rows_received', jsonb_array_length(p_rows)
    )
  );

  RETURN jsonb_build_object(
    'rows_processed', v_rows_processed,
    'grades_written', v_grades_written
  );
END;
$$;

COMMENT ON FUNCTION public.import_exam_results(uuid, jsonb, uuid) IS
  'Atomically imports students and grades and records an IMPORT_COMPLETED audit event.';

REVOKE ALL ON FUNCTION public.import_exam_results(uuid, jsonb, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.import_exam_results(uuid, jsonb, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.import_exam_results(uuid, jsonb, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.import_exam_results(uuid, jsonb, uuid) TO service_role;
