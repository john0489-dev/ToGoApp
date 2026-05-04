import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "./useAuth";
import { getCurrentPlan } from "@/lib/api.functions";
import type { Plan } from "@/lib/plan";
import { PLAN_FEATURES } from "@/lib/plan";

interface PlanState {
  plan: Plan;
  proExpiresAt: string | null;
  usage: { restaurants: number; lists: number };
  limits: { restaurants: number | null; lists: number | null };
  loading: boolean;
  refresh: () => Promise<void>;
  hasFeature: (feature: keyof typeof PLAN_FEATURES.free) => boolean;
}

const defaultState: PlanState = {
  plan: "free",
  proExpiresAt: null,
  usage: { restaurants: 0, lists: 0 },
  limits: { restaurants: 20, lists: 3 },
  loading: true,
  refresh: async () => {},
  hasFeature: () => false,
};

const PLAN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let planCache: { token: string; at: number; data: Omit<PlanState, "refresh" | "hasFeature"> } | null = null;

const PlanContext = createContext<PlanState>(defaultState);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { session, isAuthenticated } = useAuth();
  const accessToken = session?.access_token;

  const [state, setState] = useState<Omit<PlanState, "refresh" | "hasFeature">>({
    plan: "free",
    proExpiresAt: null,
    usage: { restaurants: 0, lists: 0 },
    limits: { restaurants: 20, lists: 3 },
    loading: true,
  });

  const load = useCallback(
    async (force = false) => {
      if (!accessToken) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      if (
        !force &&
        planCache &&
        planCache.token === accessToken &&
        Date.now() - planCache.at < PLAN_CACHE_TTL
      ) {
        setState(planCache.data);
        return;
      }
      try {
        const res = await getCurrentPlan({
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const next = {
          plan: res.plan as Plan,
          proExpiresAt: res.proExpiresAt,
          usage: res.usage,
          limits: res.limits,
          loading: false,
        };
        planCache = { token: accessToken, at: Date.now(), data: next };
        setState(next);
      } catch (err) {
        console.error("[usePlan] load failed:", err);
        setState((s) => ({ ...s, loading: false }));
      }
    },
    [accessToken]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      setState({
        plan: "free",
        proExpiresAt: null,
        usage: { restaurants: 0, lists: 0 },
        limits: { restaurants: 20, lists: 3 },
        loading: false,
      });
      return;
    }
    load();
  }, [isAuthenticated, load]);

  const hasFeature = useCallback(
    (feature: keyof typeof PLAN_FEATURES.free) => PLAN_FEATURES[state.plan][feature],
    [state.plan]
  );

  return (
    <PlanContext.Provider value={{ ...state, refresh: load, hasFeature }}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  return useContext(PlanContext);
}
