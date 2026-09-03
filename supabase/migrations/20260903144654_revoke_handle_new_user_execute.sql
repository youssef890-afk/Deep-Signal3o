/*
# Revoke execute on handle_new_user from anon and authenticated

The handle_new_user() function is a trigger that fires on auth.users insert.
It should never be called directly via the REST API. Revoke EXECUTE from
anon and authenticated roles so it can only be invoked by the trigger.
*/

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;