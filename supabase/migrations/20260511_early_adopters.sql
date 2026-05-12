-- Early Adopters Program
-- Tracks the first 100 users who activate the 30-day Pro trial

-- Table to track early adopter slots
CREATE TABLE IF NOT EXISTS public.early_adopters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_number INTEGER NOT NULL, -- 1 to 100
  activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  trial_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  UNIQUE(user_id),
  UNIQUE(slot_number)
);

ALTER TABLE public.early_adopters ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users can view own early adopter record"
  ON public.early_adopters FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Only system (service role) can insert
CREATE POLICY "Service role can insert early adopters"
  ON public.early_adopters FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to get current early adopter count
CREATE OR REPLACE FUNCTION public.get_early_adopter_count()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COUNT(*)::INTEGER FROM public.early_adopters;
$$;

-- Function to activate early adopter trial
-- Returns: slot_number if successful, -1 if already activated, 0 if no slots left
CREATE OR REPLACE FUNCTION public.activate_early_adopter_trial(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
  v_slot INTEGER;
  v_existing INTEGER;
BEGIN
  -- Check if user already activated
  SELECT slot_number INTO v_existing
  FROM public.early_adopters
  WHERE user_id = p_user_id;

  IF v_existing IS NOT NULL THEN
    RETURN -1; -- Already activated
  END IF;

  -- Get current count with lock
  SELECT COUNT(*) INTO v_count FROM public.early_adopters FOR UPDATE;

  IF v_count >= 100 THEN
    RETURN 0; -- No slots left
  END IF;

  -- Get next slot number
  v_slot := v_count + 1;

  -- Insert early adopter record
  INSERT INTO public.early_adopters (user_id, slot_number)
  VALUES (p_user_id, v_slot);

  -- Update subscription to pro for 30 days
  INSERT INTO public.subscriptions (
    user_id,
    status,
    plan,
    environment,
    trial_ends_at,
    paddle_subscription_id,
    paddle_customer_id
  )
  VALUES (
    p_user_id,
    'active',
    'pro',
    'early_adopter',
    now() + INTERVAL '30 days',
    'early_adopter_' || v_slot::TEXT,
    'early_adopter_' || p_user_id::TEXT
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    status = 'active',
    plan = 'pro',
    trial_ends_at = now() + INTERVAL '30 days',
    paddle_subscription_id = 'early_adopter_' || v_slot::TEXT;

  RETURN v_slot;
END;
$$;

-- Function to check if user's early adopter trial is still valid
CREATE OR REPLACE FUNCTION public.check_early_adopter_trial(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.early_adopters
    WHERE user_id = p_user_id
    AND trial_ends_at > now()
  );
$$;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_early_adopters_user_id ON public.early_adopters(user_id);
CREATE INDEX IF NOT EXISTS idx_early_adopters_slot ON public.early_adopters(slot_number);
