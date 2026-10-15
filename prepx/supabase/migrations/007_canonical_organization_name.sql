-- Keep examination records and future inserts aligned with UGSM's canonical name.
ALTER TABLE public.examinations
  ALTER COLUMN organization_name
  SET DEFAULT 'Undergraduate Society of Mawanella';

UPDATE public.examinations
SET
  organization_name = 'Undergraduate Society of Mawanella',
  updated_at = now()
WHERE organization_name IN ('PrepX', 'PrepX Institute');
