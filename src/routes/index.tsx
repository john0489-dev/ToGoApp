import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useMemo, useCallback, useEffect, useRef, useDeferredValue } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, List, MapPin, Navigation, LogOut, Users, ChevronDown, Wand2, Trash2, Shield, Sparkles } from "lucide-react";
import { lazy, Suspense } from "react";
import { RestaurantCard } from "@/components/RestaurantCard";
import { AddRestaurantDialog } from "@/components/AddRestaurantDialog";
import { InviteDialog } from "@/components/InviteDialog";
import { useAuth } from "@/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { useUpgradeModal } from "@/hooks/useUpgradeModal";
import { supabase } from "@/integrations/supabase/client";

import { ProLockBadge } from "@/components/ProLockBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { AdvancedFiltersSheet, EMPTY_ADVANCED_FILTERS, countActiveFilters, type AdvancedFilters } from "@/components/AdvancedFiltersSheet";
import { SlidersHorizontal, FileDown } from "lucide-react";
import type { ExportPdfOptionsValue } from "@/components/ExportPdfDialog";
import type { ExportSection, ExportRestaurant } from "@/lib/exportPdf";
import { toast } from "sonner";

const LazyMapView = lazy(() => import("@/components/MapView").then(m => ({ default: m.MapView })));
const LazyNearMeView = lazy(() => import("@/components/NearMeView").then(m => ({ default: m.NearMeView })));
const LazyExportPdfDialog = lazy(() => import("@/components/ExportPdfDialog").then(m => ({ default: m.ExportPdfDialog })));
const LazyChefAIWidget = lazy(() => import("@/components/ChefAIWidget").then(m => ({ default: m.ChefAIWidget })));

const PAGE_SIZE = 20;
import {
  getUserLists,
  getRestaurants,
  addRestaurant,
  updateRestaurant,
  deleteRestaurant,
  createList,
  deleteList,
  seedDefaultRestaurants,
  geocodeListRestaurants,
  isAdmin as isAdminFn,
} from "@/lib/api.functions";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    list: typeof search.list === "string" ? search.list : undefined,
  }),
  head: () => ({
    meta: [
      { title: "To Go — Sua lista pessoal de restaurantes" },
      { name: "description", content: "Gerencie sua lista pessoal de restaurantes e bares para visitar." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500&display=swap",
      },
    ],
  }),
  component: IndexWrapper,
});

type Tab = "list" | "location" | "nearme";
type StatusFilter = "all" | "visited" | "to-visit";
type Restaurant = {
  id: string;
  name: string;
  location: string;
  cuisine: string;
  visited: boolean;
  rating: number;
  list_id: string;
  added_by: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  price_range?: string | null;
  occasion?: string | null;
  tags?: string[] | null;
  photos?: string[] | null;
};
type ListItem = {
  id: string;
  name: string;
  created_by: string;
};

function IndexWrapper() {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return <Index />;
}

function Index() {
  const { user, session, isAuthenticated } = useAuth();
  const { plan, usage, limits, refresh: refreshPlan } = usePlan();
  const { open: openUpgrade } = useUpgradeModal();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const routeSearch = Route.useSearch();
  const [activeListId, setActiveListId] = useState<string | null>(routeSearch.list ?? null);
  const [tab, setTab] = useState<Tab>("list");
  const [mountedTabs, setMountedTabs] = useState<{ location: boolean; nearme: boolean }>({ location: false, nearme: false });

  const switchTab = useCallback((next: Tab) => {
    setTab(next);
    if (next === "location" || next === "nearme") {
      setMountedTabs((prev) => (prev[next] ? prev : { ...prev, [next]: true }));
    }
  }, []);

  // Listen for "open restaurant" events from the map InfoWindow
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent<{ id: string }>).detail?.id;
      setTab("list");
      if (id) {
        setTimeout(() => {
          const el = document.querySelector(`[data-restaurant-id="${id}"]`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
            el.classList.add("ring-2", "ring-[#c4844a]");
            setTimeout(() => el.classList.remove("ring-2", "ring-[#c4844a]"), 1800);
          }
        }, 100);
      }
    };
    window.addEventListener("togo:open-restaurant", handler);
    return () => window.removeEventListener("togo:open-restaurant", handler);
  }, []);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [cuisineFilter, setCuisineFilter] = useState<string[]>([]);
  const [cuisineDropdownOpen, setCuisineDropdownOpen] = useState(false);
  const cuisineDropdownRef = useRef<HTMLDivElement>(null);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(EMPTY_ADVANCED_FILTERS);
  const [advancedSheetOpen, setAdvancedSheetOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [listDropdown, setListDropdown] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  // Stable token reference for effect deps
  const accessToken = session?.access_token;
  const userId = user?.id;

  // Lists query — keyed on userId so it refetches when user changes,
  // and only enabled once auth is fully resolved.
  const listsQueryKey = useMemo(() => ["lists", userId] as const, [userId]);
  const listsQuery = useQuery({
    queryKey: listsQueryKey,
    enabled: !!isAuthenticated && !!accessToken && !!userId,
    queryFn: async () => {
      const { lists: data } = await getUserLists({
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return (data ?? [])
        .map((l: any) => ({ id: l.id, name: l.name, created_by: l.created_by }))
        .filter((l: ListItem) => !!l.id) as ListItem[];
    },
  });
  const lists = listsQuery.data ?? [];

  const setLists = useCallback(
    (updater: ListItem[] | ((prev: ListItem[]) => ListItem[])) => {
      queryClient.setQueryData<ListItem[]>(listsQueryKey, (prev) => {
        const base = prev ?? [];
        return typeof updater === "function" ? (updater as (p: ListItem[]) => ListItem[])(base) : updater;
      });
    },
    [queryClient, listsQueryKey]
  );

  // Restaurants are cached by [list_id]. Switching lists and coming back is instant.
  const restaurantsQueryKey = useMemo(
    () => ["restaurants", activeListId] as const,
    [activeListId]
  );

  const restaurantsQuery = useQuery({
    queryKey: restaurantsQueryKey,
    enabled: !!activeListId && !!accessToken,
    queryFn: async () => {
      if (!activeListId || !accessToken) return [] as Restaurant[];
      const { restaurants: data } = await getRestaurants({
        data: { listId: activeListId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return (data ?? []) as Restaurant[];
    },
  });

  const restaurants = restaurantsQuery.data ?? [];
  const loading = restaurantsQuery.isLoading;

  // [Debug] temporary logs to diagnose dashboard load
  if (typeof window !== "undefined") {
    console.log("[Debug] isAuthenticated:", isAuthenticated, "accessToken:", !!accessToken);
    console.log("[Debug] lists:", lists);
    console.log("[Debug] activeListId:", activeListId);
    console.log("[Debug] restaurants:", restaurants.length);
  }

  // Helper to update the cached list for the active list (used by optimistic mutations)
  const setRestaurants = useCallback(
    (updater: Restaurant[] | ((prev: Restaurant[]) => Restaurant[])) => {
      queryClient.setQueryData<Restaurant[]>(restaurantsQueryKey, (prev) => {
        const base = prev ?? [];
        return typeof updater === "function" ? (updater as (p: Restaurant[]) => Restaurant[])(base) : updater;
      });
    },
    [queryClient, restaurantsQueryKey]
  );

  const loadRestaurants = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: restaurantsQueryKey });
  }, [queryClient, restaurantsQueryKey]);

  // Prefetch a list's restaurants on hover/focus of the list selector
  const prefetchList = useCallback(
    (listId: string) => {
      const token = tokenRef.current;
      if (!listId || !token || listId === activeListId) return;
      queryClient.prefetchQuery({
        queryKey: ["restaurants", listId],
        queryFn: async () => {
          const { restaurants: data } = await getRestaurants({
            data: { listId },
            headers: { Authorization: `Bearer ${token}` },
          });
          return (data ?? []) as Restaurant[];
        },
      });
    },
    [queryClient, activeListId]
  );

  // Refs to keep callbacks stable across re-renders.
  // Updated synchronously during render so callbacks always read the latest
  // values without needing dedicated effects (which would schedule extra work).
  const restaurantsRef = useRef(restaurants);
  const tokenRef = useRef(accessToken);
  restaurantsRef.current = restaurants;
  tokenRef.current = accessToken;

  useEffect(() => {
    if (!accessToken) return;
    isAdminFn({ headers: { Authorization: `Bearer ${accessToken}` } })
      .then(({ isAdmin }) => setIsUserAdmin(isAdmin))
      .catch(() => setIsUserAdmin(false));
  }, [accessToken]);

  const totalCount = restaurants.length;
  const visitedCount = useMemo(() => restaurants.filter((r) => r.visited).length, [restaurants]);
  const toVisitCount = totalCount - visitedCount;
  const cuisines = useMemo(() => {
    const set = new Set(restaurants.map((r) => r.cuisine));
    return Array.from(set).sort();
  }, [restaurants]);

  // Auto-select the first list as soon as lists arrive (if none picked yet).
  useEffect(() => {
    if (activeListId) return;
    if (lists.length > 0) {
      setActiveListId(lists[0].id);
    }
  }, [lists, activeListId]);

  // First-time user with zero lists: create a default list + seed restaurants.
  // Guarded by a ref so we never trigger the create twice for the same session.
  const defaultListBootstrappedRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated || !accessToken) return;
    if (listsQuery.isLoading || listsQuery.isFetching) return;
    if (!listsQuery.isSuccess) return;
    if (lists.length > 0) return;
    if (defaultListBootstrappedRef.current) return;
    defaultListBootstrappedRef.current = true;
    (async () => {
      try {
        const { list } = await createList({
          data: { name: "Minha Lista" },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        setLists([{ id: list.id, name: list.name, created_by: list.created_by }]);
        setActiveListId(list.id);
        await seedDefaultRestaurants({
          data: { listId: list.id },
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        await queryClient.invalidateQueries({ queryKey: listsQueryKey });
      } catch (err) {
        console.error("Error creating default list:", err);
        defaultListBootstrappedRef.current = false;
      }
    })();
  }, [isAuthenticated, accessToken, listsQuery.isLoading, listsQuery.isFetching, listsQuery.isSuccess, lists.length, setLists, queryClient, listsQueryKey]);

  // Restaurants are fetched declaratively by useQuery (queryKey: ['restaurants', activeListId])
  // so switching lists and coming back is instant from cache.

  const deferredSearch = useDeferredValue(search);

  // Tags available across the user's restaurants — feeds the advanced filter sheet
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const r of restaurants) {
      if (Array.isArray(r.tags)) {
        for (const t of r.tags) if (t) set.add(t);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [restaurants]);

  // Neighborhoods (location field) available across the user's restaurants
  const availableNeighborhoods = useMemo(() => {
    const set = new Set<string>();
    for (const r of restaurants) {
      const loc = (r.location ?? "").trim();
      if (loc) set.add(loc);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [restaurants]);

  const advancedActiveCount = useMemo(() => countActiveFilters(advancedFilters), [advancedFilters]);

  const filtered = useMemo(() => {
    const q = deferredSearch.toLowerCase();
    const adv = advancedFilters;
    // Advanced status overrides the basic chip status when set
    const effectiveStatus = adv.status !== "all" ? adv.status : statusFilter;
    return restaurants
      .filter((r) => {
        if (q && !r.name.toLowerCase().includes(q)) return false;
        if (effectiveStatus === "visited" && !r.visited) return false;
        if (effectiveStatus === "to-visit" && r.visited) return false;
        if (cuisineFilter.length > 0 && !cuisineFilter.includes(r.cuisine)) return false;

        // Advanced filters
        if (adv.neighborhoods.length > 0 && !adv.neighborhoods.includes(r.location)) return false;
        if (adv.occasions.length > 0 && (!r.occasion || !adv.occasions.includes(r.occasion))) return false;
        if (adv.cuisines.length > 0 && !adv.cuisines.includes(r.cuisine)) return false;
        if (adv.minRating > 0 && (r.rating ?? 0) < adv.minRating) return false;
        if (adv.tags.length > 0) {
          const rt = r.tags ?? [];
          const hasAll = adv.tags.every((t) => rt.includes(t));
          if (!hasAll) return false;
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }, [restaurants, deferredSearch, statusFilter, cuisineFilter, advancedFilters]);

  // Pagination: render only first N items, load more on scroll
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [deferredSearch, statusFilter, cuisineFilter, advancedFilters, restaurants.length]);
  const visibleRestaurants = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount]
  );
  const hasMore = visibleCount < filtered.length;

  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!hasMore) return;
    const node = sentinelRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((c) => Math.min(c + PAGE_SIZE, filtered.length));
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [hasMore, filtered.length]);

  const handleToggleVisited = useCallback(async (id: string) => {
    const r = restaurantsRef.current.find((r) => r.id === id);
    const token = tokenRef.current;
    if (!r || !token) return;
    setRestaurants((prev) => prev.map((x) => (x.id === id ? { ...x, visited: !x.visited } : x)));
    try {
      await updateRestaurant({
        data: { id, visited: !r.visited },
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      setRestaurants((prev) => prev.map((x) => (x.id === id ? { ...x, visited: r.visited } : x)));
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const token = tokenRef.current;
    if (!token) return;
    const prev = restaurantsRef.current;
    setRestaurants((p) => p.filter((r) => r.id !== id));
    try {
      await deleteRestaurant({
        data: { id },
        headers: { Authorization: `Bearer ${token}` },
      });
      refreshPlan();
    } catch {
      setRestaurants(prev);
    }
  }, [refreshPlan]);

  const handleRate = useCallback(async (id: string, rating: number) => {
    const token = tokenRef.current;
    if (!token) return;
    setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, rating } : r)));
    try {
      await updateRestaurant({
        data: { id, rating },
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {}
  }, []);


  const handleExportPdf = useCallback(async (opts: ExportPdfOptionsValue) => {
    const token = tokenRef.current;
    if (!token) return;
    try {
      const sections: ExportSection[] = [];
      const activeList = lists.find((l) => l.id === activeListId);

      if (opts.scope === "current" || lists.length <= 1) {
        sections.push({
          listName: activeList?.name ?? "Minha Lista",
          restaurants: restaurantsRef.current as unknown as ExportRestaurant[],
        });
      } else {
        const results = await Promise.all(
          lists.map(async (l) => {
            try {
              const { restaurants: data } = await getRestaurants({
                data: { listId: l.id },
                headers: { Authorization: `Bearer ${token}` },
              });
              return { listName: l.name, restaurants: (data ?? []) as ExportRestaurant[] };
            } catch {
              return { listName: l.name, restaurants: [] as ExportRestaurant[] };
            }
          })
        );
        sections.push(...results);
      }

      const filenameBase =
        opts.scope === "all" && lists.length > 1
          ? "todas-as-listas"
          : activeList?.name ?? "minha-lista";

      const { exportRestaurantsToPdf } = await import("@/lib/exportPdf");
      exportRestaurantsToPdf({
        sections,
        includeNotes: opts.includeNotes,
        sortBy: opts.sortBy,
        includeStatus: opts.includeStatus,
        filenameBase,
      });

      setExportOpen(false);
      toast.success("PDF exportado com sucesso!");
    } catch (err) {
      console.error("[exportPdf] failed:", err);
      toast.error("Não foi possível gerar o PDF.");
    }
  }, [activeListId, lists]);

  const handleAdd = useCallback(async (data: {
    name: string;
    location: string;
    cuisine: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  }) => {
    if (!activeListId || !session) return;
    // Client-side guard (server enforces too)
    if (plan === "free" && limits.restaurants !== null && usage.restaurants >= limits.restaurants) {
      openUpgrade({ reason: "restaurants" });
      return;
    }
    try {
      await addRestaurant({
        data: {
          listId: activeListId,
          name: data.name,
          location: data.location,
          cuisine: data.cuisine,
          address: data.address,
          latitude: data.latitude,
          longitude: data.longitude,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      loadRestaurants();
      refreshPlan();
    } catch (err: any) {
      console.error("Error adding restaurant:", err);
      // Server-side limit hit (race condition) — show modal
      if (typeof err?.message === "string" && err.message.toLowerCase().includes("limite")) {
        openUpgrade({ reason: "restaurants" });
      } else {
        window.alert(err?.message ?? "Erro ao adicionar restaurante.");
      }
    }
  }, [activeListId, session, plan, limits.restaurants, usage.restaurants, refreshPlan, openUpgrade]);

  const [geocoding, setGeocoding] = useState(false);
  const [geocodeMsg, setGeocodeMsg] = useState<string | null>(null);
  const autoGeocodeStartedRef = useRef<string | null>(null);

  const runGeocode = useCallback(async (interactive = false) => {
    if (!activeListId || !session || geocoding) return;
    const missing = restaurants.filter((r) => r.latitude == null || r.longitude == null).length;
    if (missing === 0) {
      if (interactive) {
        setGeocodeMsg("Todos os restaurantes já estão geolocalizados.");
        setTimeout(() => setGeocodeMsg(null), 3500);
      }
      return;
    }
    if (
      interactive &&
      !window.confirm(`Buscar endereços reais para ${missing} restaurante(s)? Isso pode levar alguns minutos.`)
    ) {
      return;
    }
    setGeocoding(true);
    let totalUpdated = 0;
    let totalFailed = 0;
    let safety = 50;
    try {
      while (safety-- > 0) {
        const res = await geocodeListRestaurants({
          data: { listId: activeListId },
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        totalUpdated += res.updated;
        totalFailed += res.failed;
        setGeocodeMsg(`Corrigindo endereços... ${totalUpdated} atualizados, ${res.remaining} restantes.`);
        if (res.processed === 0 || res.remaining === 0) break;
      }
      setGeocodeMsg(`✓ ${totalUpdated} atualizado(s), ${totalFailed} sem resultado.`);
      await loadRestaurants();
    } catch (err) {
      console.error("Geocode error:", err);
      if (interactive) {
        setGeocodeMsg("Erro ao buscar endereços. Tente novamente.");
      }
    } finally {
      setGeocoding(false);
      setTimeout(() => setGeocodeMsg(null), 6000);
    }
  }, [activeListId, session, geocoding, restaurants]);

  const handleGeocodeAll = useCallback(async () => {
    await runGeocode(true);
  }, [runGeocode]);

  useEffect(() => {
    if (!activeListId || !session || geocoding || restaurants.length === 0) return;
    const hasMissing = restaurants.some((r) => r.latitude == null || r.longitude == null);
    if (!hasMissing) return;
    if (autoGeocodeStartedRef.current === activeListId) return;

    autoGeocodeStartedRef.current = activeListId;
    void runGeocode(false);
  }, [activeListId, session, geocoding, restaurants, runGeocode]);

  useEffect(() => {
    if (!cuisineDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (cuisineDropdownRef.current && !cuisineDropdownRef.current.contains(e.target as Node)) {
        setCuisineDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [cuisineDropdownOpen]);

  const handleCreateList = async () => {
    if (!newListName.trim() || !session) return;
    if (plan === "free" && limits.lists !== null && usage.lists >= limits.lists) {
      setListDropdown(false);
      openUpgrade({ reason: "lists" });
      return;
    }
    try {
      const { list } = await createList({
        data: { name: newListName.trim() },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      setLists((prev) => [{ id: list.id, name: list.name, created_by: list.created_by }, ...prev]);
      setActiveListId(list.id);
      autoGeocodeStartedRef.current = null;
      setNewListName("");
      setListDropdown(false);
      refreshPlan();
    } catch (err: any) {
      console.error("Error creating list:", err);
      if (typeof err?.message === "string" && err.message.toLowerCase().includes("limite")) {
        setListDropdown(false);
        openUpgrade({ reason: "lists" });
      } else {
        window.alert(err?.message ?? "Erro ao criar lista.");
      }
    }
  };

  const handleDeleteList = async (listId: string, listName: string) => {
    if (!session) return;
    if (!window.confirm(`Excluir a lista "${listName}"? Todos os restaurantes dela serão removidos. Esta ação não pode ser desfeita.`)) return;
    const prevLists = lists;
    const remaining = lists.filter((l) => l.id !== listId);
    setLists(remaining);
    if (activeListId === listId) {
      const next = remaining[0]?.id ?? null;
      setActiveListId(next);
      autoGeocodeStartedRef.current = null;
      if (!next) setRestaurants([]);
    }
    try {
      await deleteList({
        data: { listId },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
    } catch (err) {
      console.error("Error deleting list:", err);
      setLists(prevLists);
      window.alert("Não foi possível excluir a lista. Tente novamente.");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/login" });
  };

  const activeList = lists.find((l) => l.id === activeListId);

  return (
    <div className="min-h-[100dvh] flex flex-col" style={{ background: "#faf9f7" }}>
      {/* Header */}
      <header
        className="shrink-0"
        style={{
          background: "#faf9f7",
          borderBottom: "1px solid #ede9e3",
          padding: "max(52px, calc(env(safe-area-inset-top) + 16px)) 20px 20px",
        }}
      >
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex items-center gap-2.5">
              <h1
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 22,
                  fontWeight: 400,
                  color: "#1a1a18",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                }}
              >
                To Go
              </h1>
              <Link
                to="/pricing"
                title={
                  plan === "free" && limits.restaurants !== null
                    ? `${usage.restaurants}/${limits.restaurants} restaurantes · ${usage.lists}/${limits.lists} listas`
                    : "Plano Pro"
                }
                style={
                  plan === "pro"
                    ? {
                        background: "#f5efe0",
                        border: "1px solid #e8d9b0",
                        color: "#c4844a",
                        fontSize: 10,
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        lineHeight: 1.2,
                      }
                    : {
                        background: "#f0ede8",
                        border: "1px solid #e3ddd3",
                        color: "#999",
                        fontSize: 10,
                        padding: "3px 8px",
                        borderRadius: 6,
                        fontWeight: 600,
                        letterSpacing: "0.04em",
                        lineHeight: 1.2,
                      }
                }
              >
                {plan === "pro" ? "✦ PRO" : "FREE"}
              </Link>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {isUserAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center justify-center transition-colors"
                  style={{
                    width: 36,
                    height: 36,
                    background: "#fff",
                    border: "1px solid #ede9e3",
                    borderRadius: 10,
                    color: "#888",
                  }}
                  aria-label="Painel admin"
                >
                  <Shield size={16} />
                </Link>
              )}
              {activeListId && activeList?.created_by === user?.id && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="flex items-center justify-center transition-colors"
                  style={{
                    width: 36,
                    height: 36,
                    background: "#fff",
                    border: "1px solid #ede9e3",
                    borderRadius: 10,
                    color: "#888",
                  }}
                  aria-label="Convidar"
                >
                  <Users size={16} />
                </button>
              )}
              <button
                onClick={handleLogout}
                className="flex items-center justify-center transition-colors"
                style={{
                  width: 36,
                  height: 36,
                  background: "#fff",
                  border: "1px solid #ede9e3",
                  borderRadius: 10,
                  color: "#888",
                }}
                aria-label="Sair"
              >
                <LogOut size={16} />
              </button>
              <button
                onClick={() => setDialogOpen(true)}
                className="flex items-center justify-center active:scale-95 transition-transform"
                style={{
                  width: 36,
                  height: 36,
                  background: "#1a1a18",
                  borderRadius: 10,
                  color: "#fff",
                }}
                aria-label="Adicionar restaurante"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* List selector */}
          <div className="mt-4 relative">
            <button
              onClick={() => setListDropdown(!listDropdown)}
              className="flex w-full items-center justify-between"
              style={{
                background: "#fff",
                border: "1px solid #ede9e3",
                borderRadius: 12,
                padding: "10px 14px",
                fontSize: 14,
                color: "#1a1a18",
              }}
            >
              <span className="truncate">{activeList?.name || "Selecionar lista"}</span>
              <ChevronDown size={16} className="shrink-0 ml-2" style={{ color: "#888" }} />
            </button>
            {listDropdown && (
              <div
                className="absolute top-full left-0 right-0 z-50 mt-1 overflow-hidden"
                style={{
                  background: "#fff",
                  border: "1px solid #ede9e3",
                  borderRadius: 12,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                }}
              >
                {lists.map((l) => (
                  <div
                    key={l.id}
                    className="flex items-center"
                    style={l.id === activeListId ? { background: "#faf9f7" } : undefined}
                  >
                    <button
                      onClick={() => { setActiveListId(l.id); setListDropdown(false); }}
                      onMouseEnter={() => prefetchList(l.id)}
                      onFocus={() => prefetchList(l.id)}
                      onTouchStart={() => prefetchList(l.id)}
                      className="flex-1 px-4 py-2.5 text-left text-sm transition-colors"
                      style={{ color: "#1a1a18", fontWeight: l.id === activeListId ? 500 : 400 }}
                    >
                      {l.name}
                    </button>
                    {l.created_by === user?.id && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteList(l.id, l.name); }}
                        className="flex h-9 w-9 items-center justify-center mr-1 rounded transition-colors"
                        style={{ color: "#bbb" }}
                        aria-label={`Excluir lista ${l.name}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
                <div className="p-2 flex gap-2" style={{ borderTop: "1px solid #ede9e3" }}>
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="Nova lista..."
                    className="flex-1 px-2 py-1.5 text-sm focus:outline-none"
                    style={{
                      background: "#faf9f7",
                      border: "1px solid #ede9e3",
                      borderRadius: 8,
                      color: "#1a1a18",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateList()}
                  />
                  <button
                    onClick={handleCreateList}
                    className="px-3 py-1.5 text-xs font-medium"
                    style={{ background: "#1a1a18", color: "#fff", borderRadius: 8 }}
                  >
                    Criar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div
            className="mt-3 grid grid-cols-3"
            style={{
              background: "#fff",
              border: "1px solid #ede9e3",
              borderRadius: 14,
              padding: "14px 0",
            }}
          >
            <div className="text-center">
              <p style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Total
              </p>
              <p style={{ marginTop: 4, fontSize: 24, fontWeight: 500, color: "#1a1a18", lineHeight: 1 }}>{totalCount}</p>
            </div>
            <div className="text-center" style={{ borderLeft: "1px solid #ede9e3", borderRight: "1px solid #ede9e3" }}>
              <p style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Visitados
              </p>
              <p style={{ marginTop: 4, fontSize: 24, fontWeight: 500, color: "#1a1a18", lineHeight: 1 }}>{visitedCount}</p>
            </div>
            <div className="text-center">
              <p style={{ fontSize: 9, color: "#bbb", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>
                Para visitar
              </p>
              <p style={{ marginTop: 4, fontSize: 24, fontWeight: 500, color: "#1a1a18", lineHeight: 1 }}>{toVisitCount}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto mx-auto max-w-lg w-full">
        {/* List tab — always mounted */}
        <div className={tab === "list" ? "px-4 py-3 space-y-3" : "hidden"}>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar restaurante..."
                className="w-full rounded-lg border border-input bg-card pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="flex-1 rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="all">Todos</option>
                <option value="visited">Visitados</option>
                <option value="to-visit">Para Visitar</option>
              </select>
              <div ref={cuisineDropdownRef} className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setCuisineDropdownOpen((o) => !o)}
                  className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-left text-foreground focus:outline-none focus:ring-2 focus:ring-ring flex items-center justify-between gap-2 ${cuisineFilter.length > 0 ? "border-primary" : "border-input"}`}
                >
                  <span className="truncate">
                    {cuisineFilter.length === 0
                      ? "Todas"
                      : cuisineFilter.length === 1
                      ? cuisineFilter[0]
                      : `${cuisineFilter.length} selecionadas`}
                  </span>
                  <ChevronDown size={14} className="shrink-0 text-muted-foreground" />
                </button>
                {cuisineDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => { setCuisineFilter([]); setCuisineDropdownOpen(false); }}
                      className={`w-full px-3 py-2 text-left text-sm border-b border-border active:bg-accent transition-colors ${cuisineFilter.length === 0 ? "font-medium text-primary" : "text-foreground"}`}
                    >
                      Todas
                    </button>
                    <div className="max-h-56 overflow-y-auto">
                      {cuisines.map((c) => {
                        const checked = cuisineFilter.includes(c);
                        return (
                          <label
                            key={c}
                            className="flex items-center gap-2 px-3 py-2 text-sm text-foreground cursor-pointer active:bg-accent transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => {
                                setCuisineFilter((prev) =>
                                  prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
                                );
                              }}
                              className="h-4 w-4 rounded border-input accent-primary"
                            />
                            <span className="truncate">{c}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {plan === "pro" ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAdvancedSheetOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <SlidersHorizontal size={12} />
                    <span>Filtros avançados</span>
                    {advancedActiveCount > 0 && (
                      <span
                        className="ml-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white"
                        style={{ background: "#c4844a" }}
                      >
                        {advancedActiveCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportOpen(true)}
                    className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors"
                  >
                    <FileDown size={12} />
                    <span>Exportar PDF</span>
                  </button>
                </>
              ) : (
                <>
                  <ProLockBadge variant="button" featureName="Filtros avançados" />
                  <ProLockBadge variant="button" featureName="Exportar PDF" />
                  <ProLockBadge variant="button" featureName="Tags" />
                </>
              )}
            </div>

            <div className="space-y-2.5 pb-20">
              {loading ? (
                <div className="space-y-2.5" aria-label="Carregando restaurantes">
                  {Array.from({ length: 5 }).map((_, i) => {
                    // Deterministic pseudo-random widths so SSR matches client
                    const nameWidth = 40 + ((i * 37) % 31); // 40–70%
                    return (
                      <div
                        key={i}
                        className="rounded-xl p-3"
                        style={{ background: "#fff", border: "1px solid #ede9e3" }}
                      >
                        <Skeleton className="h-4 rounded" style={{ width: `${nameWidth}%` }} />
                        <Skeleton className="mt-2 h-3 rounded" style={{ width: "30%" }} />
                        <div className="mt-3 flex gap-1.5">
                          <Skeleton className="h-5 w-14 rounded-full" />
                          <Skeleton className="h-5 w-12 rounded-full" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Nenhum restaurante encontrado.</p>
              ) : (
                <>
                  {visibleRestaurants.map((r) => (
                    <RestaurantCard
                      key={r.id}
                      restaurant={r}
                      onToggleVisited={handleToggleVisited}
                      onDelete={handleDelete}
                      onRate={handleRate}
                      
                    />
                  ))}
                  {hasMore && (
                    <div ref={sentinelRef} className="py-4 flex justify-center">
                      <Skeleton className="h-[88px] w-full rounded-xl" />
                    </div>
                  )}
                </>
              )}
            </div>
        </div>

        {/* Map tab — mounted on first visit, kept alive after */}
        {mountedTabs.location && (
          <div className={tab === "location" ? "px-4 py-3 pb-20 space-y-3" : "hidden"}>
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={handleGeocodeAll}
                disabled={geocoding}
                className="flex items-center gap-1.5 rounded-lg border border-input bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition-colors disabled:opacity-50"
                title="Buscar endereços reais via OpenStreetMap"
              >
                <Wand2 size={12} />
                {geocoding ? "Buscando..." : "Corrigir endereços"}
              </button>
              {geocodeMsg && (
                <span className="text-[11px] text-muted-foreground truncate flex-1 text-right">
                  {geocodeMsg}
                </span>
              )}
            </div>
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Carregando mapa...</div>}>
              <LazyMapView restaurants={restaurants} />
            </Suspense>
          </div>
        )}

        {/* Near-me tab — mounted on first visit, kept alive after */}
        {mountedTabs.nearme && (
          <div className={tab === "nearme" ? "px-4 py-3 pb-20" : "hidden"}>
            <Suspense fallback={<div className="flex items-center justify-center py-20 text-sm text-muted-foreground">Carregando...</div>}>
              <LazyNearMeView restaurants={restaurants} onToggleVisited={handleToggleVisited} />
            </Suspense>
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 pb-[env(safe-area-inset-bottom)]"
        style={{ background: "#faf9f7", borderTop: "1px solid #ede9e3" }}
      >
        <div className="mx-auto max-w-lg flex">
          <button
            onClick={() => switchTab("list")}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: tab === "list" ? "#c4844a" : "#bbb" }}
          >
            <List size={20} />
            Lista
          </button>
          <button
            onClick={() => switchTab("location")}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: tab === "location" ? "#c4844a" : "#bbb" }}
          >
            <MapPin size={20} />
            Mapa
          </button>
          <button
            onClick={() => switchTab("nearme")}
            className="flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors"
            style={{ color: tab === "nearme" ? "#c4844a" : "#bbb" }}
          >
            <Navigation size={20} />
            Perto
          </button>
        </div>
      </nav>

      {session && (
        <AddRestaurantDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onAdd={handleAdd}
          session={session}
        />
      )}
      {activeListId && (
        <InviteDialog
          open={inviteOpen}
          onClose={() => setInviteOpen(false)}
          listId={activeListId}
          session={session!}
        />
      )}
      <AdvancedFiltersSheet
        open={advancedSheetOpen}
        onClose={() => setAdvancedSheetOpen(false)}
        value={advancedFilters}
        onChange={setAdvancedFilters}
        availableCuisines={cuisines}
        availableTags={availableTags}
        availableNeighborhoods={availableNeighborhoods}
      />
      {exportOpen && (
        <Suspense fallback={null}>
          <LazyExportPdfDialog
            open={exportOpen}
            onClose={() => setExportOpen(false)}
            onConfirm={handleExportPdf}
            allowAllLists={lists.length > 1}
            currentListName={lists.find((l) => l.id === activeListId)?.name ?? "Minha Lista"}
          />
        </Suspense>
      )}
      <Suspense fallback={null}>
        <LazyChefAIWidget
          restaurants={restaurants.map((r) => ({
            name: r.name,
            cuisine: r.cuisine,
            location: r.location,
            rating: r.rating,
            visited: r.visited,
            occasion: r.occasion,
            tags: r.tags,
          }))}
        />
      </Suspense>
    </div>
  );
}
