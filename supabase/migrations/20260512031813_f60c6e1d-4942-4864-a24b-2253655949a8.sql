-- Early Adopters Program (with security hardening from the start)
CREATE TABLE IF NOT EXISTS public.early_adopters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  UNIQUE(user_id),
  UNIQUE(slot_number)
);

ALTER TABLE public.early_adopters ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='early_adopters' AND policyname='Users can view own early adopter record') THEN
    CREATE POLICY "Users can view own early adopter record"
      ON public.early_adopters FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='early_adopters' AND policyname='Service role can insert early adopters') THEN
    CREATE POLICY "Service role can insert early adopters"
      ON public.early_adopters FOR INSERT
      TO service_role
      WITH CHECK (true);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.get_early_adopter_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER FROM public.early_adopters;
$$;

CREATE OR REPLACE FUNCTION public.activate_early_adopter_trial(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
  v_slot INTEGER;
  v_existing INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'Forbidden';
  END IF;

  SELECT slot_number INTO v_existing
  FROM public.early_adopters
  WHERE user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN -1;
  END IF;

  SELECT COUNT(*) INTO v_count FROM public.early_adopters FOR UPDATE;

  IF v_count >= 100 THEN
    RETURN 0;
  END IF;

  v_slot := v_count + 1;

  INSERT INTO public.early_adopters (user_id, slot_number)
  VALUES (p_user_id, v_slot);

  RETURN v_slot;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_early_adopter_trial(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.early_adopters
    WHERE user_id = p_user_id
    AND trial_ends_at > now()
  );
$$;

REVOKE ALL ON FUNCTION public.get_early_adopter_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_early_adopter_count() TO authenticated;

REVOKE ALL ON FUNCTION public.activate_early_adopter_trial(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.activate_early_adopter_trial(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.check_early_adopter_trial(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_early_adopter_trial(uuid) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_early_adopters_user_id ON public.early_adopters(user_id);
CREATE INDEX IF NOT EXISTS idx_early_adopters_slot ON public.early_adopters(slot_number);