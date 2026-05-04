import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUserLists,
  createList as createListFn,
  deleteList as deleteListFn,
} from "@/lib/api.functions";

export type ListItem = {
  id: string;
  name: string;
  created_by: string;
};

export function useLists(params: {
  isAuthenticated: boolean;
  accessToken: string | undefined;
  userId: string | undefined;
  initialActiveListId?: string | null;
}) {
  const { isAuthenticated, accessToken, userId, initialActiveListId } = params;
  const queryClient = useQueryClient();
  const [activeListId, setActiveListId] = useState<string | null>(initialActiveListId ?? null);

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
        return typeof updater === "function"
          ? (updater as (p: ListItem[]) => ListItem[])(base)
          : updater;
      });
    },
    [queryClient, listsQueryKey]
  );

  const createList = useCallback(
    async (name: string) => {
      if (!accessToken) throw new Error("No access token");
      const { list } = await createListFn({
        data: { name },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      return list as ListItem;
    },
    [accessToken]
  );

  const deleteList = useCallback(
    async (listId: string) => {
      if (!accessToken) throw new Error("No access token");
      await deleteListFn({
        data: { listId },
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    },
    [accessToken]
  );

  return {
    lists,
    isLoading: listsQuery.isLoading,
    isFetching: listsQuery.isFetching,
    isSuccess: listsQuery.isSuccess,
    listsQueryKey,
    activeListId,
    setActiveListId,
    setLists,
    createList,
    deleteList,
  };
}
