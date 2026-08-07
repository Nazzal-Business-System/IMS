"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BreadcrumbTitleContextValue = {
  title: string | null;
  setTitle: (title: string | null) => void;
};

const BreadcrumbTitleContext = createContext<BreadcrumbTitleContextValue | null>(null);

export function BreadcrumbTitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<string | null>(null);
  const setTitle = useCallback((next: string | null) => {
    setTitleState(next);
  }, []);
  const value = useMemo(() => ({ title, setTitle }), [title, setTitle]);
  return (
    <BreadcrumbTitleContext.Provider value={value}>
      {children}
    </BreadcrumbTitleContext.Provider>
  );
}

export function useBreadcrumbTitle() {
  const ctx = useContext(BreadcrumbTitleContext);
  if (!ctx) {
    return {
      title: null as string | null,
      setTitle: (() => undefined) as (title: string | null) => void,
    };
  }
  return ctx;
}

/** Publish a human-readable breadcrumb label for the current details record. */
export function useRegisterBreadcrumbTitle(title: string | null | undefined) {
  const { setTitle } = useBreadcrumbTitle();
  useEffect(() => {
    if (title) setTitle(title);
    return () => setTitle(null);
  }, [title, setTitle]);
}

export function looksLikeRecordId(segment: string): boolean {
  if (!segment) return false;
  // Prisma / CUID-style ids
  if (/^c[a-z0-9]{20,}$/i.test(segment)) return true;
  // UUID
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      segment
    )
  ) {
    return true;
  }
  // Mongo-style ObjectId
  if (/^[0-9a-f]{24}$/i.test(segment)) return true;
  return false;
}
