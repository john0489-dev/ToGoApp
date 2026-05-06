import { useEffect, useState, useCallback } from "react";

const TTL_MS = 30 * 60 * 1000;

type CacheEntry = { openNow: boolean | null; ts: number };

function readCache(id: string): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(`open_now_cache_${id}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > TTL_MS) return null;
    return entry;
  } catch {
    return null;
  }
}

function writeCache(id: string, openNow: boolean | null) {
  try {
    sessionStorage.setItem(
      `open_now_cache_${id}`,
      JSON.stringify({ openNow, ts: Date.now() } satisfies CacheEntry)
    );
  } catch {
    /* ignore */
  }
}

export type OpenNowMap = Record<string, boolean | null>;

type Restaurant = {
  id: string;
  name: string;
  address?: string | null;
  location?: string;
};

export function useOpenNow(restaurants: Restaurant[], enabled: boolean) {
  const [statuses, setStatuses] = useState<OpenNowMap>({});
  const [isLoading, setIsLoading] = useState(false);

  const fetchOne = useCallback(async (r: Restaurant): Promise<boolean | null> => {
    const cached = readCache(r.id);
    if (cached) return cached.openNow;
    const query = [r.name, r.address || r.location].filter(Boolean).join(" ");
    try {
      const res = await fetch("/api/maps/open-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { openNow: boolean | null };
      writeCache(r.id, data.openNow);
      return data.openNow;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || restaurants.length === 0) return;
    let cancelled = false;
    setIsLoading(true);

    const targets = restaurants.filter((r) => statuses[r.id] === undefined);
    if (targets.length === 0) {
      setIsLoading(false);
      return;
    }

    (async () => {
      // Limit concurrency to 4
      const queue = [...targets];
      const next: OpenNowMap = {};
      const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
        while (queue.length > 0 && !cancelled) {
          const r = queue.shift();
          if (!r) break;
          const result = await fetchOne(r);
          next[r.id] = result;
        }
      });
      await Promise.all(workers);
      if (!cancelled) {
        setStatuses((prev) => ({ ...prev, ...next }));
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, restaurants.map((r) => r.id).join(",")]);

  return { statuses, isLoading };
}
