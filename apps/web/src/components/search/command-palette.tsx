"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { SearchResult } from "@ims/shared-types";
import {
  Package,
  Tags,
  Warehouse,
  Truck,
  ClipboardList,
  LayoutDashboard,
  BarChart3,
  Settings,
  Shield,
  User,
  UserPlus,
  Search,
  ArrowRight,
  Plus,
  KeyRound,
} from "lucide-react";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { useUnsavedGuard } from "@/lib/unsaved-guard";
import { useI18n } from "@/lib/i18n";

const RECENT_KEY = "ims_recent_searches";
const MAX_RECENT = 6;

const QUICK_ACTIONS = [
  { id: "add-product", labelKey: "search.addProduct", href: "/products", section: "products", write: true, icon: Plus },
  { id: "add-supplier", labelKey: "search.addSupplier", href: "/suppliers", section: "suppliers", write: true, icon: Plus },
  { id: "add-warehouse", labelKey: "search.addWarehouse", href: "/warehouses", section: "warehouses", write: true, icon: Plus },
  { id: "add-user", labelKey: "search.addUser", href: "/admin/users", section: "admin_users", write: true, icon: UserPlus },
  { id: "open-profile", labelKey: "search.openProfile", href: "/profile", icon: User },
  { id: "open-settings", labelKey: "search.openSettings", href: "/settings/appearance", section: "settings", icon: Settings },
  { id: "open-permissions", labelKey: "search.openPermissions", href: "/admin/permissions", section: "admin_permissions", icon: KeyRound },
];

function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t === q) return 100;
  if (t.startsWith(q)) return 80;
  if (t.includes(q)) return 60;
  let score = 0;
  let ti = 0;
  for (const ch of q) {
    const found = t.indexOf(ch, ti);
    if (found === -1) return 0;
    score += 10;
    ti = found + 1;
  }
  return score;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();
  const { canRead, canWrite } = useAuth();
  const { t } = useI18n();
  const { startNavigation } = useNavigationLoading();
  const { requestNavigation } = useUnsavedGuard();

  const debouncedQ = query.trim();

  const { data: searchData } = useQuery({
    queryKey: ["global-search", debouncedQ],
    queryFn: () => apiFetch<{ results: SearchResult[] }>(`/search?q=${encodeURIComponent(debouncedQ)}`),
    enabled: open && debouncedQ.length >= 2,
    staleTime: 10_000,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const quickActions = useMemo(
    () =>
      QUICK_ACTIONS.filter((a) => {
        if ("section" in a && a.section && !canRead(a.section)) return false;
        if ("write" in a && a.write && "section" in a && a.section && !canWrite(a.section)) return false;
        if (!debouncedQ) return true;
        return fuzzyScore(t(a.labelKey), debouncedQ) > 0;
      }),
    [canRead, canWrite, debouncedQ, t]
  );

  const apiResults = useMemo(() => {
    const results = searchData?.results ?? [];
    if (!debouncedQ) return [];
    return results
      .map((r) => ({ ...r, score: fuzzyScore(r.label, debouncedQ) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [searchData, debouncedQ]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchResult[]>();
    for (const r of apiResults) {
      const list = map.get(r.group) ?? [];
      list.push(r);
      map.set(r.group, list);
    }
    return map;
  }, [apiResults]);

  const saveRecent = useCallback((label: string, href: string) => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      const prev: Array<{ label: string; href: string }> = raw ? JSON.parse(raw) : [];
      const next = [{ label, href }, ...prev.filter((p) => p.href !== href)].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const recent = useMemo(() => {
    if (!open || debouncedQ) return [];
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? (JSON.parse(raw) as Array<{ label: string; href: string }>) : [];
    } catch {
      return [];
    }
  }, [open, debouncedQ]);

  const navigate = (href: string, label: string) => {
    saveRecent(label, href);
    setOpen(false);
    setQuery("");
    requestNavigation(() => {
      startNavigation(href);
      router.push(href);
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-full max-w-md cursor-pointer items-center gap-2 rounded-lg border border-border bg-[var(--input-bg)] px-3 text-sm text-muted transition-colors hover:bg-[var(--hover-bg)] sm:max-w-xs lg:max-w-sm"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">{t("search.placeholder")}</span>
        <kbd className="pointer-events-none ms-auto hidden rounded border border-border bg-card px-1.5 py-0.5 text-[10px] font-medium sm:inline">
          {t("search.shortcut")}
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-0 p-0 overflow-hidden">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="text-base">{t("search.title")}</DialogTitle>
          </DialogHeader>
          <div className="border-b border-border px-4 py-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("search.inputPlaceholder")}
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted"
              autoFocus
            />
          </div>
          <div className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
            {quickActions.length > 0 && (
              <section className="mb-3">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("search.quickActions")}</p>
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    onClick={() => navigate(action.href, t(action.labelKey))}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-[var(--hover-bg)]"
                  >
                    <action.icon className="h-4 w-4 text-accent" />
                    <span>{t(action.labelKey)}</span>
                    <ArrowRight className="ms-auto h-4 w-4 text-muted" />
                  </button>
                ))}
              </section>
            )}

            {!debouncedQ && recent.length > 0 && (
              <section className="mb-3">
                <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{t("search.recent")}</p>
                {recent.map((r) => (
                  <button
                    key={r.href}
                    type="button"
                    onClick={() => navigate(r.href, r.label)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-[var(--hover-bg)]"
                  >
                    <Search className="h-4 w-4 text-muted" />
                    {r.label}
                  </button>
                ))}
              </section>
            )}

            {debouncedQ.length >= 2 &&
              Array.from(grouped.entries()).map(([group, items]) => (
                <section key={group} className="mb-3">
                  <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{group}</p>
                  {items.map((item) => (
                    <button
                      key={`${item.type}-${item.id}`}
                      type="button"
                      onClick={() => navigate(item.href, item.label)}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-[var(--hover-bg)]"
                    >
                      <ResultIcon type={item.type} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{item.label}</p>
                        {item.sublabel && <p className="truncate text-xs text-muted">{item.sublabel}</p>}
                      </div>
                    </button>
                  ))}
                </section>
              ))}

            {debouncedQ.length >= 2 && apiResults.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted">{t("search.noResults", { query: debouncedQ })}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ResultIcon({ type }: { type: string }) {
  const className = "h-4 w-4 text-accent shrink-0";
  switch (type) {
    case "product":
      return <Package className={className} />;
    case "category":
      return <Tags className={className} />;
    case "warehouse":
      return <Warehouse className={className} />;
    case "supplier":
      return <Truck className={className} />;
    case "purchase_order":
      return <ClipboardList className={className} />;
    case "user":
      return <Shield className={className} />;
    case "nav":
      return <LayoutDashboard className={className} />;
    default:
      return <BarChart3 className={className} />;
  }
}
