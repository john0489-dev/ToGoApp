import { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  EMPTY_ADVANCED_FILTERS,
  countActiveFilters,
  type AdvancedFilters,
} from "@/components/AdvancedFiltersSheet";
import type { Restaurant } from "@/hooks/useRestaurants";
import { isOpenNow } from "@/lib/openingHours";

export type StatusFilter = "all" | "visited" | "to-visit";

export function useFilters(restaurants: Restaurant[], activeListId?: string | null) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cuisineFilter, setCuisineFilter] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);

  // Reset all filters whenever the active list changes
  useEffect(() => {
    setSearch("");
    setStatusFilter("all");
    setCuisineFilter([]);
    setAdvancedFilters(EMPTY_ADVANCED_FILTERS);
  }, [activeListId]);

  const deferredSearch = useDeferredValue(search);

  const cuisines = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.cuisine));
    return Array.from(set).sort();
  }, [restaurants]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const r of restaurants) {
      if (Array.isArray(r.tags)) {
        for (const t of r.tags) if (t) set.add(t);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [restaurants]);

  const availableNeighborhoods = useMemo(() => {
    const set = new Set<string>();
    for (const r of restaurants) {
      const loc = (r.location ?? "").trim();
      if (loc) set.add(loc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [restaurants]);

  const advancedActiveCount = useMemo(
    () => countActiveFilters(advancedFilters),
    [advancedFilters]
  );

  const filteredRestaurants = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    const adv = advancedFilters;
    const effectiveStatus = adv.status !== "all" ? adv.status : statusFilter;
    return restaurants
      .filter((r) => {
        if (q && !r.name.toLowerCase().includes(q)) return false;
        if (effectiveStatus === "visited" && !r.visited) return false;
        if (effectiveStatus === "to-visit" && r.visited) return false;
        if (cuisineFilter.length > 0 && !cuisineFilter.includes(r.cuisine)) return false;

        if (adv.neighborhoods.length > 0 && !adv.neighborhoods.includes(r.location)) return false;
        if (adv.occasions.length > 0 && (!r.occasion || !adv.occasions.includes(r.occasion))) return false;
        if (adv.cuisines.length > 0 && !adv.cuisines.includes(r.cuisine)) return false;
        if (adv.minRating > 0 && (r.rating ?? 0) < adv.minRating) return false;
        if (adv.tags.length > 0) {
          const rt = r.tags ?? [];
          const hasAll = adv.tags.every((t) => rt.includes(t));
          if (!hasAll) return false;
        }
        if (adv.openNow) {
          const open = isOpenNow(r.opening_hours ?? null);
          if (open !== true) return false;
        }
        return true;
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" })
      );
  }, [restaurants, deferredSearch, statusFilter, cuisineFilter, advancedFilters]);

  return {
    search,
    setSearch,
    deferredSearch,
    statusFilter,
    setStatusFilter,
    cuisineFilter,
    setCuisineFilter,
    advancedFilters,
    setAdvancedFilters,
    advancedActiveCount,
    cuisines,
    availableTags,
    availableNeighborhoods,
    filteredRestaurants,
  };
}
