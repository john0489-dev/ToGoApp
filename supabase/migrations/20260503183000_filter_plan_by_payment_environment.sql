-- Keep sandbox subscriptions from granting Pro in live unless the caller
-- explicitly asks for the sandbox payment environment.
CREATE OR REPLACE FUNCTION public.get_user_plan(
  _user_id uuid,
  _environment text DEFAULT 'live'
)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND s.environment = _environment
        AND s.status IN ('active', 'trialing', 'past_due')
        AND (s.current_period_end IS NULL OR s.current_period_end > now())
    ) THEN 'pro'
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = _user_id
        AND p.plan = 'pro'
        AND (p.pro_expires_at IS NULL OR p.pro_expires_at > now())
    ) THEN 'pro'
    ELSE 'free'
  END
$$;

REVOKE ALL ON FUNCTION public.get_user_plan(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.get_user_plan(_user_id, 'live')
$$;

REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated;
