-- Lock down all SECURITY DEFINER functions: revoke from PUBLIC and grant
-- EXECUTE only to the roles that legitimately need to call them.

-- Functions called by authenticated users only (RPC + RLS helpers)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.count_user_restaurants(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_user_restaurants(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.can_add_restaurant(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_add_restaurant(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.is_list_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_list_member(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.get_list_role(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_list_role(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO authenticated;

-- Trigger-only functions: no role should call these directly via RPC.
-- Triggers execute regardless of EXECUTE grants on the function.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_follow() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_unfollow() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_add_list_owner() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_restaurant_photos() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.validate_profile_bio() FROM PUBLIC;