DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND plan = (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
  AND pro_expires_at IS NOT DISTINCT FROM (SELECT p.pro_expires_at FROM public.profiles p WHERE p.id = auth.uid())
);