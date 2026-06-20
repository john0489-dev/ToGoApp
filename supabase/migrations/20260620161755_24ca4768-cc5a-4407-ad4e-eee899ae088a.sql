DROP POLICY IF EXISTS "Members can add restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Members can update restaurants" ON public.restaurants;
DROP POLICY IF EXISTS "Members can delete restaurants" ON public.restaurants;

CREATE POLICY "Editors and owners can add restaurants"
ON public.restaurants
FOR INSERT
TO authenticated
WITH CHECK (
  public.get_list_role(auth.uid(), list_id) IN ('owner','editor')
  AND added_by = auth.uid()
  AND public.can_add_restaurant(auth.uid())
);

CREATE POLICY "Editors and owners can update restaurants"
ON public.restaurants
FOR UPDATE
TO authenticated
USING (public.get_list_role(auth.uid(), list_id) IN ('owner','editor'))
WITH CHECK (public.get_list_role(auth.uid(), list_id) IN ('owner','editor'));

CREATE POLICY "Editors and owners can delete restaurants"
ON public.restaurants
FOR DELETE
TO authenticated
USING (public.get_list_role(auth.uid(), list_id) IN ('owner','editor'));