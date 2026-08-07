"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";

const NAV_TIMEOUT_MS = 8000;

interface NavigationLoadingContextValue {
  isNavigating: boolean;
  /** Href currently pending, if known (for per-control pending UI). */
  pendingHref: string | null;
  startNavigation: (href?: string) => void;
  stopNavigation: () => void;
  isPendingHref: (href: string) => boolean;
}

const NavigationLoadingContext = createContext<NavigationLoadingContextValue | null>(null);

export function NavigationLoadingProvider({ children }: { children: ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimeoutRef = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const stopNavigation = useCallback(() => {
    clearTimeoutRef();
    setIsNavigating(false);
    setPendingHref(null);
  }, [clearTimeoutRef]);

  const startNavigation = useCallback(
    (href?: string) => {
      clearTimeoutRef();
      setIsNavigating(true);
      setPendingHref(href ?? null);
      timeoutRef.current = setTimeout(() => {
        setIsNavigating(false);
        setPendingHref(null);
        timeoutRef.current = null;
      }, NAV_TIMEOUT_MS);
    },
    [clearTimeoutRef]
  );

  const isPendingHref = useCallback(
    (href: string) => isNavigating && pendingHref === href,
    [isNavigating, pendingHref]
  );

  useEffect(() => {
    stopNavigation();
  }, [pathname, stopNavigation]);

  useEffect(() => {
    return () => clearTimeoutRef();
  }, [clearTimeoutRef]);

  const value = useMemo(
    () => ({
      isNavigating,
      pendingHref,
      startNavigation,
      stopNavigation,
      isPendingHref,
    }),
    [isNavigating, pendingHref, startNavigation, stopNavigation, isPendingHref]
  );

  return (
    <NavigationLoadingContext.Provider value={value}>
      {children}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const ctx = useContext(NavigationLoadingContext);
  if (!ctx) {
    throw new Error("useNavigationLoading must be used within NavigationLoadingProvider");
  }
  return ctx;
}
