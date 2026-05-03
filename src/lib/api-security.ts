import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type ApiAuthOptions = {
  bucket: string;
  limit: number;
  windowMs: number;
};

type RateEntry = {
  count: number;
  resetAt: number;
};

const rateBuckets = new Map<string, RateEntry>();

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = rateBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return Response.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      }
    );
  }

  current.count += 1;
  return null;
}

export async function requireApiAuth(
  request: Request,
  options: ApiAuthOptions
): Promise<{ userId?: string; error?: Response }> {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    return { error: jsonError("Configuração de autenticação ausente.", 500) };
  }

  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: jsonError("Não autorizado.", 401) };
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) {
    return { error: jsonError("Não autorizado.", 401) };
  }

  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (error || !userId) {
    return { error: jsonError("Não autorizado.", 401) };
  }

  const ip = getClientIp(request);
  const rateError = checkRateLimit(
    `${options.bucket}:${userId}:${ip}`,
    options.limit,
    options.windowMs
  );
  if (rateError) {
    return { error: rateError };
  }

  return { userId };
}
