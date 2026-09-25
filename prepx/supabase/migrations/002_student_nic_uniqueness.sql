-- Enforce the Step 5.2 per-examination NIC uniqueness requirement.
-- Blank legacy NICs are treated as absent; old-format V/X is case-insensitive.
-- If duplicate NICs already exist, this migration fails without deleting data.
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_exam_nic_unique
  ON public.students (examination_id, upper(btrim(nic_number)))
  WHERE nic_number IS NOT NULL AND btrim(nic_number) <> '';
