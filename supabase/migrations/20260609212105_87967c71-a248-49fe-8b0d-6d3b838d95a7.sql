DROP POLICY IF EXISTS "Invited or owner can update invites" ON public.list_invites;
CREATE POLICY "Owners can update invites" ON public.list_invites
FOR UPDATE
USING (public.get_list_role(auth.uid(), list_id) = 'owner'::list_role)
WITH CHECK (public.get_list_role(auth.uid(), list_id) = 'owner'::list_role);