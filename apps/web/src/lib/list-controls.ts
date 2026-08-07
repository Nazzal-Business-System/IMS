import { useMemo, useState } from "react";

export type DateSort = "latest" | "oldest";
export type NameSort = "name-asc" | "name-desc";

export function sortByDate<T>(
  items: T[],
  getDate: (item: T) => string | Date,
  order: DateSort = "latest"
) {
  return [...items].sort((a, b) => {
    const da = new Date(getDate(a)).getTime();
    const db = new Date(getDate(b)).getTime();
    return order === "latest" ? db - da : da - db;
  });
}

export function sortByString<T>(
  items: T[],
  getValue: (item: T) => string,
  order: "asc" | "desc" = "asc"
) {
  return [...items].sort((a, b) => {
    const cmp = getValue(a).localeCompare(getValue(b));
    return order === "asc" ? cmp : -cmp;
  });
}

export function sortByNumber<T>(
  items: T[],
  getValue: (item: T) => number,
  order: "high" | "low" = "high"
) {
  return [...items].sort((a, b) => {
    const diff = getValue(a) - getValue(b);
    return order === "high" ? -diff : diff;
  });
}

export function filterBySearch<T>(
  items: T[],
  query: string,
  getSearchable: (item: T) => string[]
) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) =>
    getSearchable(item).some((s) => s.toLowerCase().includes(q))
  );
}

export function useListSearch(initial = "") {
  const [search, setSearch] = useState(initial);
  return { search, setSearch };
}

export function useActiveFilters<T extends Record<string, unknown>>(defaults: T) {
  const [filters, setFilters] = useState<T>(defaults);
  const setFilter = <K extends keyof T>(key: K, value: T[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };
  const clearFilters = () => setFilters(defaults);
  const activeCount = useMemo(
    () =>
      Object.entries(filters).filter(([key, value]) => {
        const def = defaults[key as keyof T];
        return value !== def && value !== "" && value !== "all" && value !== false;
      }).length,
    [filters, defaults]
  );
  return { filters, setFilter, clearFilters, activeCount };
}
