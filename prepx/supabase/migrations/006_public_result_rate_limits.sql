-- Distributed fixed-window protection for the public result lookup endpoint.
-- Only the service role can access this table or execute the function.

CREATE TABLE IF NOT EXISTS public.result_search_rate_limits (
  key_hash          text        PRIMARY KEY,
  window_started_at timestamptz NOT NULL,
  request_count     integer     NOT NULL CHECK (request_count > 0),
  expires_at        timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_result_search_rate_limits_expires
  ON public.result_search_rate_limits (expires_at);

ALTER TABLE public.result_search_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.result_search_rate_limits FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.check_result_search_rate_limit(
  p_key_hash text,
  p_max_requests integer,
  p_window_seconds integer
)
RETURNS TABLE (allowed boolean, retry_after_seconds integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_time timestamptz := clock_timestamp();
  current_count integer;
  current_expiry timestamptz;
BEGIN
  IF length(p_key_hash) <> 64 OR p_max_requests < 1 OR p_window_seconds < 1 THEN
    RAISE EXCEPTION 'Invalid rate-limit input' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.result_search_rate_limits AS limits (
    key_hash,
    window_started_at,
    request_count,
    expires_at
  )
  VALUES (
    p_key_hash,
    current_time,
    1,
    current_time + make_interval(secs => p_window_seconds)
  )
  ON CONFLICT (key_hash) DO UPDATE
  SET
    window_started_at = CASE
      WHEN limits.expires_at <= current_time THEN current_time
      ELSE limits.window_started_at
    END,
    request_count = CASE
      WHEN limits.expires_at <= current_time THEN 1
      ELSE limits.request_count + 1
    END,
    expires_at = CASE
      WHEN limits.expires_at <= current_time
        THEN current_time + make_interval(secs => p_window_seconds)
      ELSE limits.expires_at
    END
  RETURNING request_count, expires_at
  INTO current_count, current_expiry;

  DELETE FROM public.result_search_rate_limits
  WHERE expires_at < current_time - interval '1 day';

  allowed := current_count <= p_max_requests;
  retry_after_seconds := CASE
    WHEN allowed THEN 0
    ELSE GREATEST(1, CEIL(EXTRACT(EPOCH FROM (current_expiry - current_time)))::integer)
  END;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.check_result_search_rate_limit(text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_result_search_rate_limit(text, integer, integer)
  TO service_role;
