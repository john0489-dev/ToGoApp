import { useEffect, useState, useCallback } from "react";

const BANNER_KEY = "pwa_banner";
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
const MAX_DISMISSALS = 3;

type BannerState = {
  dismissCount: number;
  lastDismissed: number | null;
  installed: boolean;
};

const defaultState: BannerState = {
  dismissCount: 0,
  lastDismissed: null,
  installed: false,
};

function readState(): BannerState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(BANNER_KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function writeState(state: BannerState) {
  try {
    localStorage.setItem(BANNER_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS Safari
    window.navigator?.standalone === true
  );
}

export function usePWABanner() {
  const [state, setState] = useState<BannerState>(defaultState);
  const [standalone, setStandalone] = useState<boolean>(false);
  const [showInstalled, setShowInstalled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setState(readState());
    setStandalone(isStandalone());
    setHydrated(true);

    const onInstalled = () => {
      const next: BannerState = { ...readState(), installed: true };
      writeState(next);
      setState(next);
      setShowInstalled(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => window.removeEventListener("appinstalled", onInstalled);
  }, []);

  const shouldShow = (() => {
    if (!hydrated) return false;
    if (standalone) return false;
    if (state.installed) return false;
    if (state.dismissCount >= MAX_DISMISSALS) return false;
    if (state.lastDismissed && Date.now() - state.lastDismissed < SEVEN_DAYS) return false;
    return true;
  })();

  const dismiss = useCallback(() => {
    const next: BannerState = {
      ...readState(),
      dismissCount: readState().dismissCount + 1,
      lastDismissed: Date.now(),
    };
    writeState(next);
    setState(next);
  }, []);

  const dismissInstalled = useCallback(() => setShowInstalled(false), []);

  return { shouldShow, dismiss, showInstalled, dismissInstalled, standalone };
}
