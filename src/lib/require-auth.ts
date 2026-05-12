// Server-side helper to require a Supabase-authenticated user in API route handlers.
import { createClient } from "@supabase/supabase-js";

export type AuthCheckResult =
  | { ok: true; userId: string }
  | { ok: false; response: Response };

export async function requireAuthFromRequest(request: Request): Promise<AuthCheckResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return {
      ok: false,
      response: Response.json({ error: "Server misconfigured" }, { status: 500 }),
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) {
    return {
      ok: false,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, userId: data.claims.sub as string };
}
