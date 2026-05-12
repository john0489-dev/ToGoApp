import { supabase } from "@/integrations/supabase/client";

/**
 * fetch wrapper that automatically attaches the current Supabase access token
 * as a Bearer Authorization header for same-origin API routes that require auth.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const headers = new Headers(init.headers || {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}
