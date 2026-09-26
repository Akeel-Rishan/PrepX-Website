-- Index the sort/filter combinations used by the admin dashboard and list pages.
-- These are deliberately conventional B-tree indexes: they are inexpensive to
-- maintain and improve the common queries without requiring extra extensions.

CREATE INDEX IF NOT EXISTS idx_examinations_year_created
  ON public.examinations (year DESC, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_students_created
  ON public.students (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_students_exam_created
  ON public.students (examination_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_results_subject
  ON public.student_results (subject_id);
