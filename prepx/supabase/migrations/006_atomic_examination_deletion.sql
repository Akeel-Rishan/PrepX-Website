-- ============================================================
-- PrepX atomic examination deletion
-- The audit entry and cascading examination deletion either both
-- commit or both roll back.
-- ============================================================

CREATE OR REPLACE FUNCTION public.delete_examination(
  p_examination_id uuid,
  p_confirmation text,
  p_admin_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_examination public.examinations%ROWTYPE;
  v_expected_confirmation text;
  v_student_count integer;
  v_subject_count integer;
  v_result_count integer;
BEGIN
  IF p_admin_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = p_admin_id
  ) THEN
    RAISE EXCEPTION 'Administrator authorization required.' USING ERRCODE = '42501';
  END IF;

  SELECT *
  INTO v_examination
  FROM public.examinations
  WHERE id = p_examination_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Examination not found.' USING ERRCODE = 'P0002';
  END IF;

  v_expected_confirmation := v_examination.name || ' ' || v_examination.year::text;
  IF btrim(COALESCE(p_confirmation, '')) <> v_expected_confirmation THEN
    RAISE EXCEPTION 'Deletion confirmation does not match.' USING ERRCODE = '22023';
  END IF;

  SELECT count(*)::integer
  INTO v_student_count
  FROM public.students
  WHERE examination_id = p_examination_id;

  SELECT count(*)::integer
  INTO v_subject_count
  FROM public.subjects
  WHERE examination_id = p_examination_id;

  SELECT count(*)::integer
  INTO v_result_count
  FROM public.student_results AS result
  INNER JOIN public.students AS student ON student.id = result.student_id
  WHERE student.examination_id = p_examination_id;

  INSERT INTO public.audit_logs (
    admin_id,
    action,
    entity_type,
    entity_id,
    old_value,
    new_value
  )
  VALUES (
    p_admin_id,
    'EXAMINATION_DELETED',
    'examination',
    p_examination_id,
    jsonb_build_object(
      'name', v_examination.name,
      'year', v_examination.year,
      'organization_name', v_examination.organization_name,
      'status', v_examination.status
    ),
    jsonb_build_object(
      'deleted', true,
      'students_deleted', v_student_count,
      'subjects_deleted', v_subject_count,
      'results_deleted', v_result_count
    )
  );

  DELETE FROM public.examinations
  WHERE id = p_examination_id;

  RETURN jsonb_build_object(
    'students_deleted', v_student_count,
    'subjects_deleted', v_subject_count,
    'results_deleted', v_result_count
  );
END;
$$;

COMMENT ON FUNCTION public.delete_examination(uuid, text, uuid) IS
  'Atomically records an EXAMINATION_DELETED audit event and deletes the examination with its cascading child records.';

REVOKE ALL ON FUNCTION public.delete_examination(uuid, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_examination(uuid, text, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.delete_examination(uuid, text, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.delete_examination(uuid, text, uuid) TO service_role;
