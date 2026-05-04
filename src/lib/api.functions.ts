import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

type DB = SupabaseClient<Database>;

// Safe error helper — logs details server-side, returns generic message to client
function safeError(context: string, error: { message?: string; code?: string }): never {
  console.error(`[server] ${context}:`, error);
  throw new Error("Ocorreu um erro inesperado. Tente novamente.");
}

// Get all lists the user is a member of
export const getUserLists = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    // Query via list_members to avoid RLS issues with direct lists query
    const { data, error } = await supabase
      .from("list_members")
      .select("list_id, role, lists(*)")
      .eq("user_id", userId)
      .order("joined_at", { ascending: false });

    if (error) safeError("getUserLists", error);

    const lists = (data ?? []).map((m: any) => ({
      ...m.lists,
      role: m.role,
    }));
    return { lists };
  });

// Create a new list
export const createList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ name: z.string().min(1).max(100) }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Plan enforcement
    const plan = await fetchUserPlan(supabase, userId);
    if (plan === "free") {
      const used = await countUserOwnedLists(supabase, userId);
      if (used >= FREE_LIST_LIMIT) {
        throw new Error(
          `Limite do plano Free atingido (${FREE_LIST_LIMIT} listas). Faça upgrade para Pro para criar mais.`
        );
      }
    }

    const { data: list, error } = await supabase
      .from("lists")
      .insert({ name: data.name, created_by: userId })
      .select()
      .single();

    if (error) safeError("createList", error);
    return { list };
  });

// Delete a list (owner only — enforced by RLS)
// Dependents (restaurants, list_invites, list_members) are removed automatically via ON DELETE CASCADE.
export const deleteList = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ listId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase.from("lists").delete().eq("id", data.listId);
    if (error) safeError("deleteList", error);
    return { success: true };
  });

// Get restaurants for a list
export const getRestaurants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ listId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("list_id", data.listId)
      .order("created_at", { ascending: false });

    if (error) safeError("getRestaurants", error);
    return { restaurants: restaurants ?? [] };
  });

// Plan limits (kept in sync with src/lib/plan.ts)
const FREE_RESTAURANT_LIMIT = 20;
const FREE_LIST_LIMIT = 3;

async function fetchUserPlan(supabase: any, userId: string): Promise<"free" | "pro"> {
  const { data, error } = await supabase.rpc("get_user_plan", { _user_id: userId });
  if (error) {
    console.error("[fetchUserPlan]", error);
    return "free";
  }
  return data === "pro" ? "pro" : "free";
}

async function countUserRestaurants(supabase: any, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("restaurants")
    .select("*", { count: "exact", head: true })
    .eq("added_by", userId);
  if (error) {
    console.error("[countUserRestaurants]", error);
    return 0;
  }
  return count ?? 0;
}

async function countUserOwnedLists(supabase: any, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("lists")
    .select("*", { count: "exact", head: true })
    .eq("created_by", userId);
  if (error) {
    console.error("[countUserOwnedLists]", error);
    return 0;
  }
  return count ?? 0;
}

// Get current user's plan + usage stats
export const getCurrentPlan = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const plan = await fetchUserPlan(supabase, userId);
    const { data: profile } = await supabase
      .from("profiles")
      .select("plan, pro_expires_at")
      .eq("id", userId)
      .maybeSingle();

    const [restaurantCount, listCount] = await Promise.all([
      countUserRestaurants(supabase, userId),
      countUserOwnedLists(supabase, userId),
    ]);

    return {
      plan,
      proExpiresAt: profile?.pro_expires_at ?? null,
      usage: { restaurants: restaurantCount, lists: listCount },
      limits: {
        restaurants: plan === "pro" ? null : FREE_RESTAURANT_LIMIT,
        lists: plan === "pro" ? null : FREE_LIST_LIMIT,
      },
    };
  });

// Add a restaurant
export const addRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      listId: z.string().uuid(),
      name: z.string().min(1).max(200),
      location: z.string().max(200),
      cuisine: z.string().max(100),
      visited: z.boolean().optional(),
      rating: z.number().min(0).max(10).optional(),
      address: z.string().max(300).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      notes: z.string().max(2000).optional(),
      photo_url: z.string().url().max(1000).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
      price_range: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
      occasion: z.string().max(100).optional(),
      visited_at: z.string().datetime().optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Plan enforcement
    const plan = await fetchUserPlan(supabase, userId);
    if (plan === "free") {
      const used = await countUserRestaurants(supabase, userId);
      if (used >= FREE_RESTAURANT_LIMIT) {
        throw new Error(
          `Limite do plano Free atingido (${FREE_RESTAURANT_LIMIT} restaurantes). Faça upgrade para Pro para adicionar mais.`
        );
      }
    }

    const insert: Record<string, any> = {
      list_id: data.listId,
      name: data.name,
      location: data.location,
      cuisine: data.cuisine,
      visited: data.visited ?? false,
      rating: data.rating ?? 0,
      address: data.address ?? null,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      added_by: userId,
    };

    // Pro-only fields: silently dropped for free users
    if (plan === "pro") {
      if (data.notes !== undefined) insert.notes = data.notes;
      if (data.photo_url !== undefined) insert.photo_url = data.photo_url;
      if (data.tags !== undefined) insert.tags = data.tags;
      if (data.price_range !== undefined) insert.price_range = data.price_range;
      if (data.occasion !== undefined) insert.occasion = data.occasion;
      if (data.visited_at !== undefined) insert.visited_at = data.visited_at;
    }

    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .insert(insert as any)
      .select()
      .single();

    if (error) {
      // RLS policy violation = plan limit hit at the DB level (defense in depth)
      if (error.code === "42501" || /row-level security/i.test(error.message ?? "")) {
        throw new Error(
          `Limite do plano Free atingido (${FREE_RESTAURANT_LIMIT} restaurantes). Faça upgrade para Pro para adicionar mais.`
        );
      }
      // Unique constraint: restaurant with same name already exists in this list
      if (error.code === "23505") {
        throw new Error(
          `Já existe um restaurante com este nome nesta lista. Use um nome diferente ou edite o existente.`
        );
      }
      safeError("addRestaurant", error);
    }
    return { restaurant };
  });

// Update a restaurant
export const updateRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      visited: z.boolean().optional(),
      rating: z.number().min(0).max(10).optional(),
      location: z.string().max(300).optional(),
      address: z.string().max(300).optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      photos: z.array(z.string().url().max(1000)).max(3).optional(),
      notes: z.string().max(2000).optional(),
      tags: z.array(z.string().max(40)).max(20).optional(),
      occasion: z.string().max(100).optional(),
      price_range: z.enum(["$", "$$", "$$$", "$$$$"]).optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const update: {
      visited?: boolean;
      rating?: number;
      location?: string;
      address?: string;
      latitude?: number;
      longitude?: number;
      photos?: string[];
      notes?: string;
      tags?: string[];
      occasion?: string;
      price_range?: string;
    } = {};
    if (data.visited !== undefined) update.visited = data.visited;
    if (data.rating !== undefined) update.rating = data.rating;
    if (data.location !== undefined) update.location = data.location;
    if (data.address !== undefined) update.address = data.address;
    if (data.latitude !== undefined) update.latitude = data.latitude;
    if (data.longitude !== undefined) update.longitude = data.longitude;
    if (data.photos !== undefined) update.photos = data.photos;
    if (data.notes !== undefined) update.notes = data.notes;
    if (data.tags !== undefined) update.tags = data.tags;
    if (data.occasion !== undefined) update.occasion = data.occasion;
    if (data.price_range !== undefined) update.price_range = data.price_range;

    const { error } = await supabase
      .from("restaurants")
      .update(update)
      .eq("id", data.id);

    if (error) safeError("updateRestaurant", error);
    return { success: true };
  });

// ----- Geocoding via Nominatim (OpenStreetMap) -----
type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  class?: string;
};

const stopWords = new Set([
  "de",
  "da",
  "do",
  "dos",
  "das",
  "e",
  "di",
  "del",
  "la",
  "el",
  "the",
  "of",
  "y",
  "a",
  "o",
]);

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getNameTokens(name: string) {
  return normalizeSearchText(name)
    .split(" ")
    .filter((token) => token.length >= 4 && !stopWords.has(token));
}

function isLikelyInSaoPaulo(lat: number, lon: number) {
  return lat >= -24.2 && lat <= -23.2 && lon >= -46.95 && lon <= -46.2;
}

function scoreGeocodeResult(result: NominatimResult, name: string, location?: string | null) {
  const display = normalizeSearchText(result.display_name);
  const nameNormalized = normalizeSearchText(name);
  const locationNormalized = normalizeSearchText(location || "");
  const tokens = getNameTokens(name);

  let score = 0;

  if (display.includes(nameNormalized) && nameNormalized.length >= 5) score += 30;

  const matchedTokens = tokens.filter((token) => display.includes(token));
  score += matchedTokens.length * 10;

  if (tokens.length === 1 && matchedTokens.length === 1 && !display.includes(nameNormalized)) {
    score -= 8;
  }

  if (locationNormalized && display.includes(locationNormalized)) score += 10;
  if (display.includes("sao paulo") || display.includes("são paulo")) score += 4;

  if (result.class === "amenity" || result.class === "shop" || result.class === "tourism") score += 5;
  if (
    result.type === "restaurant" ||
    result.type === "cafe" ||
    result.type === "bar" ||
    result.type === "fast_food" ||
    result.type === "pub" ||
    result.type === "bakery" ||
    result.type === "ice_cream"
  ) {
    score += 8;
  }

  const lat = parseFloat(result.lat);
  const lon = parseFloat(result.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) {
    if ((locationNormalized.includes("sao paulo") || locationNormalized === "") && isLikelyInSaoPaulo(lat, lon)) {
      score += 6;
    }
    if ((locationNormalized.includes("sao paulo") || locationNormalized === "") && !isLikelyInSaoPaulo(lat, lon)) {
      score -= 18;
    }
  }

  return score;
}

function pickBestGeocodeResult(results: NominatimResult[], name: string, location?: string | null) {
  if (results.length === 0) return null;

  const sorted = [...results].sort(
    (a, b) => scoreGeocodeResult(b, name, location) - scoreGeocodeResult(a, name, location)
  );
  const best = sorted[0];
  const bestScore = scoreGeocodeResult(best, name, location);

  return bestScore >= 14 ? best : null;
}

async function nominatimSearch(query: string, limit = 5): Promise<NominatimResult[]> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=${limit}&accept-language=pt-BR`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "ToGo-Restaurants-App/1.0 (lovable.dev)",
      "Accept-Language": "pt-BR,pt;q=0.9",
    },
  });
  if (!res.ok) return [];
  return (await res.json()) as NominatimResult[];
}

// Search restaurant address suggestions by name (+ optional location bias)
export const searchRestaurantAddress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      name: z.string().min(2).max(200),
      location: z.string().max(200).optional(),
    })
  )
  .handler(async ({ data }) => {
    const bias = data.location?.trim() || "São Paulo, Brasil";
    const queries = [`${data.name}, ${bias}`, `restaurante ${data.name}, ${bias}`, data.name];

    try {
      const seen = new Set<string>();
      const combined: NominatimResult[] = [];

      for (const query of queries) {
        const results = await nominatimSearch(query, 5);
        for (const result of results) {
          const key = `${result.lat},${result.lon},${result.display_name}`;
          if (!seen.has(key)) {
            seen.add(key);
            combined.push(result);
          }
        }
      }

      const suggestions = combined
        .sort((a, b) => scoreGeocodeResult(b, data.name, data.location) - scoreGeocodeResult(a, data.name, data.location))
        .slice(0, 5)
        .map((r) => ({
          display_name: r.display_name,
          latitude: parseFloat(r.lat),
          longitude: parseFloat(r.lon),
        }));

      return { suggestions };
    } catch (err) {
      console.error("[searchRestaurantAddress]", err);
      return { suggestions: [] };
    }
  });

// Geocode a batch of restaurants in a list that don't yet have coordinates.
// Processes up to BATCH_SIZE per call to stay within Worker timeout limits.
// Client should call repeatedly until `remaining` is 0.
export const geocodeListRestaurants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ listId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const BATCH_SIZE = 8; // ~9s per batch (1.1s × 8) — well under Worker limits
    const { supabase } = context;
    const { data: rows, error } = await supabase
      .from("restaurants")
      .select("id, name, location, latitude, longitude")
      .eq("list_id", data.listId)
      .or("latitude.is.null,longitude.is.null")
      .neq("address", "__not_found__")
      .limit(BATCH_SIZE);

    if (error) safeError("geocodeListRestaurants:fetch", error);

    const pending = rows ?? [];
    let updated = 0;
    let failed = 0;

    for (let i = 0; i < pending.length; i++) {
      const r: any = pending[i];
      const bias = r.location?.trim() || "São Paulo, Brasil";
      const queries = [`${r.name}, ${bias}`, `restaurante ${r.name}, ${bias}`, `${r.name} ${bias}`];

      try {
        let best: NominatimResult | null = null;

        for (let qIndex = 0; qIndex < queries.length; qIndex++) {
          const results = await nominatimSearch(queries[qIndex], 5);
          best = pickBestGeocodeResult(results, r.name, r.location);
          if (best) break;

          if (qIndex < queries.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1100));
          }
        }

        if (best) {
          const { error: upErr } = await supabase
            .from("restaurants")
            .update({
              latitude: parseFloat(best.lat),
              longitude: parseFloat(best.lon),
              address: best.display_name,
            })
            .eq("id", r.id);

          if (upErr) {
            console.error("[geocodeListRestaurants:update]", upErr);
            failed++;
          } else {
            updated++;
          }
        } else {
          await supabase
            .from("restaurants")
            .update({ address: "__not_found__" })
            .eq("id", r.id);
          failed++;
        }
      } catch (err) {
        console.error("[geocodeListRestaurants:fetch]", err);
        failed++;
      }

      if (i < pending.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1100));
      }
    }

    const { count: remaining } = await supabase
      .from("restaurants")
      .select("*", { count: "exact", head: true })
      .eq("list_id", data.listId)
      .or("latitude.is.null,longitude.is.null")
      .neq("address", "__not_found__");

    return { processed: pending.length, updated, failed, remaining: remaining ?? 0 };
  });

// Delete a restaurant
export const deleteRestaurant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { error } = await supabase
      .from("restaurants")
      .delete()
      .eq("id", data.id);

    if (error) safeError("deleteRestaurant", error);
    return { success: true };
  });

// Create invite link
export const createInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      listId: z.string().uuid(),
      email: z.string().email().optional(),
      role: z.enum(["editor", "viewer"]).optional(),
    })
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: invite, error } = await supabase
      .from("list_invites")
      .insert({
        list_id: data.listId,
        email: data.email ?? null,
        role: data.role ?? "editor",
        created_by: userId,
      })
      .select()
      .single();

    if (error) safeError("createInvite", error);
    return { invite };
  });

// Get list members with profile info
export const getListMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ listId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    // Use security-definer RPC so emails are only returned to actual list members.
    const { data: members, error } = await supabase.rpc("get_list_member_emails", {
      _list_id: data.listId,
    });

    if (error) safeError("getListMembers", error);

    const result = (members ?? []).map((m: any) => ({
      user_id: m.user_id,
      role: m.role,
      joined_at: m.joined_at,
      email: m.email ?? null,
    }));
    return { members: result };
  });

// Check whether the current user is an admin
export const isAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (error) {
      console.error("[isAdmin]", error);
      return { isAdmin: false };
    }
    return { isAdmin: !!data };
  });

// Get all user signups (admin only)
export const getAdminSignups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verify admin role
    const { data: hasAdminRole, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) safeError("getAdminSignups:role", roleErr);
    if (!hasAdminRole) {
      throw new Error("Acesso negado.");
    }

    // RPC enforces admin role server-side and is the only way to read all emails.
    const { data, error } = await supabase.rpc("get_all_signups_admin");

    if (error) safeError("getAdminSignups", error);
    return { signups: data ?? [] };
  });

// Seed default restaurants into a list
export const seedDefaultRestaurants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ listId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Check if list already has restaurants
    const { count } = await supabase
      .from("restaurants")
      .select("*", { count: "exact", head: true })
      .eq("list_id", data.listId);

    if (count && count > 0) return { seeded: false };

    // Respect Free plan limit: only seed up to remaining quota
    const plan = await fetchUserPlan(supabase, userId);
    let availableSlots = Number.MAX_SAFE_INTEGER;
    if (plan === "free") {
      const used = await countUserRestaurants(supabase, userId);
      availableSlots = Math.max(0, FREE_RESTAURANT_LIMIT - used);
      if (availableSlots === 0) return { seeded: false };
    }

    // Import default data
    const { default: defaultData } = await import("@/lib/restaurant-defaults");
    const rows = defaultData.slice(0, availableSlots).map((r) => ({
      list_id: data.listId,
      name: r.name,
      location: r.location,
      cuisine: r.cuisine,
      visited: r.visited,
      rating: r.rating,
      added_by: userId,
    }));

    const { error } = await supabase.from("restaurants").insert(rows);
    if (error) safeError("seedDefaultRestaurants", error);
    return { seeded: true };
  });
