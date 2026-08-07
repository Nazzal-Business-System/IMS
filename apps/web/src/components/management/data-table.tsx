"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/ui/loading";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import { useNavigationLoading } from "@/lib/navigation-loading";

export type ManagementColumn<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  hideBelow?: "md" | "lg";
  align?: "start" | "end";
  mobilePriority?: "primary" | "secondary" | "meta" | "hidden";
};

export type MobileCardConfig<T> = {
  title: (row: T) => React.ReactNode;
  subtitle?: (row: T) => React.ReactNode;
  meta?: (row: T) => React.ReactNode;
  badges?: (row: T) => React.ReactNode;
  fields?: Array<{
    label: string;
    value: (row: T) => React.ReactNode;
  }>;
};

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      "a,button,input,select,textarea,label,[role='menuitem'],[role='button'],[data-row-action]"
    )
  );
}

export function ManagementDataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyTitle,
  emptyDescription,
  emptyAction,
  actions,
  actionsHeader,
  mobileCard,
  getRowClassName,
  getRowHref,
  getRowLabel,
  className,
}: {
  columns: ManagementColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  actions?: (row: T) => React.ReactNode;
  actionsHeader?: string;
  mobileCard?: MobileCardConfig<T>;
  getRowClassName?: (row: T) => string | undefined;
  /** When set, the entire row/card navigates to details. */
  getRowHref?: (row: T) => string | undefined;
  /** Accessible name for the row link. */
  getRowLabel?: (row: T) => string;
  className?: string;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const { startNavigation } = useNavigationLoading();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const navigatingRef = useRef(false);
  const resolvedEmpty = emptyTitle ?? t("empty.default");
  const colCount = columns.length + (actions ? 1 : 0);

  const navigateTo = (href: string, id: string) => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setPendingId(id);
    startNavigation(href);
    startTransition(() => {
      router.push(href);
    });
  };

  if (loading) {
    return (
      <div
        className={cn(
          "ims-mgmt-surface overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card",
          className
        )}
      >
        <TableSkeleton rows={7} cols={Math.min(colCount, 6)} />
      </div>
    );
  }

  if (!data.length) {
    return (
      <div
        className={cn(
          "ims-mgmt-surface overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card",
          className
        )}
      >
        <EmptyState title={resolvedEmpty} description={emptyDescription} />
        {emptyAction ? <div className="flex justify-center pb-10">{emptyAction}</div> : null}
      </div>
    );
  }

  const hideClass = (hideBelow?: "md" | "lg") => {
    if (hideBelow === "md") return "hidden md:table-cell";
    if (hideBelow === "lg") return "hidden lg:table-cell";
    return undefined;
  };

  return (
    <div
      className={cn(
        "ims-mgmt-surface overflow-hidden rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card",
        className
      )}
    >
      {mobileCard ? (
        <ul className="divide-y divide-[color-mix(in_srgb,var(--foreground)_8%,transparent)] md:hidden" role="list">
          {data.map((row) => {
            const href = getRowHref?.(row);
            const label = getRowLabel?.(row);
            const pending = pendingId === row.id && isPending;
            return (
              <li
                key={row.id}
                className={cn(
                  "ims-mgmt-record-card relative p-4 transition-colors",
                  href && "cursor-pointer hover:bg-[var(--hover-bg)]/50",
                  pending && "opacity-70"
                )}
                onClick={(e) => {
                  if (!href || isInteractiveTarget(e.target)) return;
                  navigateTo(href, row.id);
                }}
                onKeyDown={(e) => {
                  if (!href || isInteractiveTarget(e.target)) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigateTo(href, row.id);
                  }
                }}
                onMouseEnter={() => href && router.prefetch(href)}
                onFocus={() => href && router.prefetch(href)}
                tabIndex={href ? 0 : undefined}
                role={href ? "link" : undefined}
                aria-label={href ? label ?? t("record.openDetails") : undefined}
                aria-busy={pending || undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="font-medium text-foreground">{mobileCard.title(row)}</div>
                    {mobileCard.subtitle ? (
                      <div className="text-sm text-muted">{mobileCard.subtitle(row)}</div>
                    ) : null}
                    {mobileCard.badges ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">{mobileCard.badges(row)}</div>
                    ) : null}
                  </div>
                  {actions ? (
                    <div className="shrink-0" data-row-action onClick={(e) => e.stopPropagation()}>
                      {actions(row)}
                    </div>
                  ) : null}
                </div>
                {mobileCard.meta ? (
                  <div className="mt-2 text-xs text-muted">{mobileCard.meta(row)}</div>
                ) : null}
                {mobileCard.fields?.length ? (
                  <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">
                    {mobileCard.fields.map((field) => (
                      <div key={field.label} className="min-w-0">
                        <dt className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted">
                          {field.label}
                        </dt>
                        <dd className="mt-0.5 truncate text-sm text-foreground">
                          {field.value(row)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className={cn("relative w-full overflow-x-auto", mobileCard ? "hidden md:block" : undefined)}>
        <table className="ims-mgmt-table w-full caption-bottom text-sm">
          <thead>
            <tr className="border-b border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "h-11 px-4 text-start align-middle text-xs font-semibold uppercase tracking-wide text-muted",
                    col.align === "end" && "text-end",
                    hideClass(col.hideBelow),
                    col.headerClassName,
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
              {actions ? (
                <th className="sticky end-0 z-10 h-11 w-14 bg-card px-2 text-end align-middle text-xs font-semibold uppercase tracking-wide text-muted shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.18)] rtl:shadow-[6px_0_10px_-6px_rgba(0,0,0,0.18)]">
                  <span className="sr-only">{actionsHeader || t("table.actions")}</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const href = getRowHref?.(row);
              const label = getRowLabel?.(row);
              const pending = pendingId === row.id && isPending;
              return (
                <tr
                  key={row.id}
                  className={cn(
                    "ims-mgmt-row group border-b border-[color-mix(in_srgb,var(--foreground)_7%,transparent)] transition-colors last:border-0",
                    href
                      ? "cursor-pointer hover:bg-[var(--hover-bg)]/55 focus-visible:bg-[var(--hover-bg)]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      : "cursor-default",
                    pending && "bg-[var(--hover-bg)]/40 opacity-80",
                    getRowClassName?.(row)
                  )}
                  tabIndex={href ? 0 : undefined}
                  role={href ? "link" : undefined}
                  aria-label={href ? label ?? t("record.openDetails") : undefined}
                  aria-busy={pending || undefined}
                  onClick={(e) => {
                    if (!href || isInteractiveTarget(e.target)) return;
                    navigateTo(href, row.id);
                  }}
                  onKeyDown={(e) => {
                    if (!href || isInteractiveTarget(e.target)) return;
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      navigateTo(href, row.id);
                    }
                  }}
                  onMouseEnter={() => href && router.prefetch(href)}
                  onFocus={() => href && router.prefetch(href)}
                >
                  {columns.map((col, colIndex) => (
                    <td
                      key={col.key}
                      className={cn(
                        "relative h-12 px-4 align-middle text-foreground",
                        col.align === "end" && "text-end tabular-nums",
                        hideClass(col.hideBelow),
                        col.className
                      )}
                    >
                      {href && colIndex === 0 ? (
                        <Link
                          href={href}
                          className="absolute inset-0 z-0"
                          tabIndex={-1}
                          aria-hidden
                          onClick={(e) => {
                            e.preventDefault();
                            navigateTo(href, row.id);
                          }}
                        />
                      ) : null}
                      <span className="relative z-[1]">{col.cell(row)}</span>
                    </td>
                  ))}
                  {actions ? (
                    <td
                      data-row-action
                      className="sticky end-0 z-10 h-12 w-14 bg-card px-2 text-end align-middle shadow-[-6px_0_10px_-6px_rgba(0,0,0,0.18)] group-hover:bg-[color-mix(in_srgb,var(--hover-bg)_55%,var(--card))] rtl:shadow-[6px_0_10px_-6px_rgba(0,0,0,0.18)]"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <div className="relative z-10 flex items-center justify-end">
                        {actions(row)}
                      </div>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
