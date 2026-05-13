-- Drop old Paddle-based subscriptions table
DROP TABLE IF EXISTS public.subscriptions CASCADE;

-- Recreate for Stripe
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_customer_id text NOT NULL,
  product_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Recreate has_active_subscription with new schema
CREATE OR REPLACE FUNCTION public.has_active_subscription(user_uuid uuid, check_env text DEFAULT 'live'::text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = user_uuid
      AND environment = check_env
      AND status IN ('active', 'trialing')
      AND (current_period_end IS NULL OR current_period_end > now())
  );
$$;

-- get_user_plan: rebuild to use new schema
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
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

-- Update profiles UPDATE policy to allow plan changes via early-adopter SECURITY DEFINER func
-- (The current policy locks plan to its previous value. We need the function to be able to update plan.)
-- The function already runs as SECURITY DEFINER bypassing RLS, so no policy change needed.

-- Rewrite activate_early_adopter_trial to grant Pro via profiles instead of subscriptions
CREATE OR REPLACE FUNCTION public.activate_early_adopter_trial(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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

  -- Grant Pro for 30 days via profiles (security definer bypasses RLS)
  UPDATE public.profiles
  SET plan = 'pro',
      pro_expires_at = now() + INTERVAL '30 days'
  WHERE id = p_user_id;

  RETURN v_slot;
END;
$$;