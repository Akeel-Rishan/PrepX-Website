-- ============================================================
-- PrepX O/L Examination Results System
-- Migration: 001_initial_schema
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- TABLE: admin_profiles
-- Links Supabase Auth users to the admin role.
-- The admin user is created via Supabase Auth dashboard.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.admin_profiles (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.admin_profiles IS
  'Maps Supabase Auth users to admin access. Insert a row here to grant admin access.';


-- ============================================================
-- TABLE: examinations
-- Each row is one O/L model examination event.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.examinations (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  name              text        NOT NULL,
  year              integer     NOT NULL CHECK (year >= 2000 AND year <= 2100),
  organization_name text        NOT NULL DEFAULT 'PrepX',
  status            text        NOT NULL DEFAULT 'DRAFT'
                                CHECK (status IN ('DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED')),
  publication_date  timestamptz,
  result_notice     text,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.examinations IS
  'One row per examination event. Status drives the publication workflow.';
COMMENT ON COLUMN public.examinations.status IS
  'DRAFT → READY → PUBLISHED → ARCHIVED';


-- ============================================================
-- TABLE: students
-- One row per student per examination.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.students (
  id                   uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  examination_id       uuid        REFERENCES public.examinations(id) ON DELETE CASCADE NOT NULL,
  full_name            text        NOT NULL,
  index_number         text        NOT NULL,
  nic_number           text,
  school_name          text        NOT NULL,
  examination_center   text,
  created_at           timestamptz DEFAULT now() NOT NULL,
  updated_at           timestamptz DEFAULT now() NOT NULL,

  -- Index number must be unique within an examination
  UNIQUE (examination_id, index_number)
);

COMMENT ON TABLE public.students IS
  'Student records. index_number is unique per examination.';
COMMENT ON COLUMN public.students.nic_number IS
  'Sensitive identifier. Never expose fully on public pages. Masked in API responses.';


-- ============================================================
-- TABLE: subjects
-- Subjects offered in a given examination.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.subjects (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  examination_id uuid        REFERENCES public.examinations(id) ON DELETE CASCADE NOT NULL,
  subject_name   text        NOT NULL,
  subject_code   text,
  display_order  integer     NOT NULL DEFAULT 0,
  required       boolean     NOT NULL DEFAULT true,
  active         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now() NOT NULL,
  updated_at     timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.subjects IS
  'Subjects for each examination. display_order controls result card order.';


-- ============================================================
-- TABLE: student_results
-- One grade row per student per subject.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.student_results (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid        REFERENCES public.students(id) ON DELETE CASCADE NOT NULL,
  subject_id uuid        REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  grade      text        NOT NULL CHECK (grade IN ('A', 'B', 'C', 'S', 'W', 'AB')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,

  -- One grade per student per subject — enforced at DB level
  UNIQUE (student_id, subject_id)
);

COMMENT ON TABLE public.student_results IS
  'Grade per student per subject. Raw marks, totals, and rankings are never stored here.';
COMMENT ON COLUMN public.student_results.grade IS
  'A=Distinction, B=Very Good, C=Credit, S=Pass, W=Fail, AB=Absent';


-- ============================================================
-- TABLE: audit_logs
-- Immutable record of important admin actions.
-- Never store secrets, passwords, or complete NIC numbers here.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  action      text        NOT NULL,
  entity_type text,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.audit_logs IS
  'Immutable audit trail. Rows are inserted server-side; never deleted.';
COMMENT ON COLUMN public.audit_logs.action IS
  'E.g. STUDENT_CREATED, RESULT_UPDATED, EXAMINATION_PUBLISHED, IMPORT_COMPLETED';


-- ============================================================
-- INDEXES
-- Critical for fast result lookup during peak traffic.
-- ============================================================

-- Fast student lookup by index_number (primary search credential)
CREATE INDEX IF NOT EXISTS idx_students_exam_index
  ON public.students (examination_id, index_number);

-- Fast student lookup by nic_number (alternate search credential)
-- Partial index: only index rows where nic_number is not null
CREATE INDEX IF NOT EXISTS idx_students_exam_nic
  ON public.students (examination_id, nic_number)
  WHERE nic_number IS NOT NULL;

-- Fast grade retrieval for a student
CREATE INDEX IF NOT EXISTS idx_results_student
  ON public.student_results (student_id);

-- Fast subject listing in display order
CREATE INDEX IF NOT EXISTS idx_subjects_exam_order
  ON public.subjects (examination_id, display_order ASC)
  WHERE active = true;

-- Fast exam lookup by status (for publication check)
CREATE INDEX IF NOT EXISTS idx_examinations_status
  ON public.examinations (status);

-- Audit log retrieval (newest first)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs (action, created_at DESC);


-- ============================================================
-- TRIGGER: auto-update updated_at on every row change
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_examinations_updated_at
  BEFORE UPDATE ON public.examinations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_student_results_updated_at
  BEFORE UPDATE ON public.student_results
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();


-- ============================================================
-- is_admin() HELPER
-- Used in RLS policies to check if the current auth user is an admin.
-- SECURITY DEFINER: runs with the function owner's privileges,
-- so it can query admin_profiles even when the caller cannot.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_profiles
    WHERE user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_admin() IS
  'Returns true if the current authenticated user has an admin_profiles row.';


-- ============================================================
-- ROW LEVEL SECURITY
-- Enable RLS on all tables first, then define policies.
-- The API server uses the service_role key for trusted server
-- operations (bypasses RLS). The anon key is restricted here.
-- ============================================================

ALTER TABLE public.admin_profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examinations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs        ENABLE ROW LEVEL SECURITY;

-- admin_profiles: only the admin can see their own profile row
CREATE POLICY "admin_profiles: own row read"
  ON public.admin_profiles FOR SELECT
  USING (user_id = auth.uid());

-- examinations: anon users can only read PUBLISHED exams
CREATE POLICY "examinations: public read published"
  ON public.examinations FOR SELECT
  USING (status = 'PUBLISHED');

-- examinations: admin has full access
CREATE POLICY "examinations: admin all"
  ON public.examinations FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- students: no public access (served only via server-side API)
-- admin has full access
CREATE POLICY "students: admin all"
  ON public.students FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- subjects: anon can read active subjects from published exams
CREATE POLICY "subjects: public read active published"
  ON public.subjects FOR SELECT
  USING (
    active = true
    AND EXISTS (
      SELECT 1 FROM public.examinations e
      WHERE e.id = examination_id
        AND e.status = 'PUBLISHED'
    )
  );

-- subjects: admin has full access
CREATE POLICY "subjects: admin all"
  ON public.subjects FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- student_results: no public access
CREATE POLICY "student_results: admin all"
  ON public.student_results FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- audit_logs: admin can read; server inserts via service_role (bypasses RLS)
CREATE POLICY "audit_logs: admin read"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin());
