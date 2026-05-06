import { useCallback, useMemo, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getRestaurants,
  addRestaurant as addRestaurantFn,
  updateRestaurant as updateRestaurantFn,
  deleteRestaurant as deleteRestaurantFn,
} from "@/lib/api.functions";

export type Restaurant = {
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
  opening_hours?: { periods?: Array<{ open: { day: number; time: string }; close?: { day: number; time: string } }> } | null;
  place_id?: string | null;
  hours_updated_at?: string | null;
};

export type AddRestaurantInput = {
  listId: string;
  name: string;
  location: string;
  cuisine: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

export function useRestaurants(activeListId: string | null, accessToken: string | undefined) {
  const queryClient = useQueryClient();

  const restaurantsQueryKey = useMemo(
    () => ["restaurants", activeListId] as const,
    [activeListId]
  );

  const restaurantsQuery = useQuery({
    queryKey: restaurantsQueryKey,
    enabled: !!activeListId && !!accessToken,
    staleTime: 30 * 1000,
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
  const isLoading = restaurantsQuery.isLoading;

  // Refs kept synchronous-during-render so callbacks always read latest values
  const restaurantsRef = useRef(restaurants);
  const tokenRef = useRef(accessToken);
  restaurantsRef.current = restaurants;
  tokenRef.current = accessToken;

  const setRestaurants = useCallback(
    (updater: Restaurant[] | ((prev: Restaurant[]) => Restaurant[])) => {
      queryClient.setQueryData<Restaurant[]>(restaurantsQueryKey, (prev) => {
        const base = prev ?? [];
        return typeof updater === "function"
          ? (updater as (p: Restaurant[]) => Restaurant[])(base)
          : updater;
      });
    },
    [queryClient, restaurantsQueryKey]
  );

  const loadRestaurants = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: restaurantsQueryKey });
  }, [queryClient, restaurantsQueryKey]);

  const prefetchList = useCallback(
    (listId: string) => {
      const token = tokenRef.current;
      if (!listId || !token || listId === activeListId) return;
      queryClient.prefetchQuery({
        queryKey: ["restaurants", listId],
        staleTime: 30 * 1000,
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

  const toggleVisited = useCallback(
    async (id: string) => {
      const r = restaurantsRef.current.find((r) => r.id === id);
      const token = tokenRef.current;
      if (!r || !token) return;
      setRestaurants((prev) =>
        prev.map((x) => (x.id === id ? { ...x, visited: !x.visited } : x))
      );
      try {
        await updateRestaurantFn({
          data: { id, visited: !r.visited },
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        setRestaurants((prev) =>
          prev.map((x) => (x.id === id ? { ...x, visited: r.visited } : x))
        );
      }
    },
    [setRestaurants]
  );

  const deleteRestaurant = useCallback(
    async (id: string): Promise<boolean> => {
      const token = tokenRef.current;
      if (!token) return false;
      const prev = restaurantsRef.current;
      setRestaurants((p) => p.filter((r) => r.id !== id));
      try {
        await deleteRestaurantFn({
          data: { id },
          headers: { Authorization: `Bearer ${token}` },
        });
        return true;
      } catch {
        setRestaurants(prev);
        return false;
      }
    },
    [setRestaurants]
  );

  const updateRestaurant = useCallback(
    async (id: string, patch: { rating?: number; visited?: boolean; dish_favorite?: string; notes?: string }) => {
      const token = tokenRef.current;
      if (!token) return;
      setRestaurants((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
      try {
        await updateRestaurantFn({
          data: { id, ...patch },
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    },
    [setRestaurants]
  );

  const addRestaurant = useCallback(
    async (data: AddRestaurantInput) => {
      const token = tokenRef.current;
      if (!token) throw new Error("No access token");
      await addRestaurantFn({
        data,
        headers: { Authorization: `Bearer ${token}` },
      });
      await loadRestaurants();
    },
    [loadRestaurants]
  );

  return {
    restaurants,
    isLoading,
    restaurantsRef,
    tokenRef,
    setRestaurants,
    loadRestaurants,
    prefetchList,
    addRestaurant,
    deleteRestaurant,
    toggleVisited,
    updateRestaurant,
  };
}
