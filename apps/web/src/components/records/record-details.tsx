"use client";

"use client";

import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/loading";
import { StatusBadge } from "@/components/management";
import { GuardedLink } from "@/components/layout/guarded-link";
import { NavButton } from "@/components/layout/nav-button";
import { useRegisterBreadcrumbTitle } from "@/lib/breadcrumb-title";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PermissionGuard({
  allowed,
  loading,
  children,
  message,
}: {
  allowed: boolean;
  loading?: boolean;
  children: React.ReactNode;
  message?: string;
}) {
  const { t } = useI18n();
  if (loading) {
    return <DetailsSkeleton />;
  }
  if (!allowed) {
    return (
      <EmptyState
        title={t("access.denied")}
        description={message ?? t("record.forbidden")}
      />
    );
  }
  return <>{children}</>;
}

export function RecordDetailsShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ims-record-details flex min-h-0 flex-col gap-5", className)}>
      {children}
    </div>
  );
}

export function DetailsHeader({
  backHref,
  backLabel,
  title,
  subtitle,
  status,
  statusLabel,
  meta,
  actions,
  breadcrumbTitle,
}: {
  backHref: string;
  backLabel?: string;
  title: string;
  subtitle?: React.ReactNode;
  status?: string;
  statusLabel?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  /** Override breadcrumb label; defaults to title. */
  breadcrumbTitle?: string;
}) {
  const { t } = useI18n();
  useRegisterBreadcrumbTitle(breadcrumbTitle ?? title);

  return (
    <header className="space-y-4">
      <Button asChild variant="ghost" size="sm" className="-ms-2 h-9 w-fit px-2 text-muted">
        <GuardedLink href={backHref} showPending>
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" aria-hidden />
          {backLabel ?? t("action.back")}
        </GuardedLink>
      </Button>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
            {status && statusLabel ? <StatusBadge status={status} label={statusLabel} /> : null}
          </div>
          {subtitle ? <div className="text-sm text-muted">{subtitle}</div> : null}
          {meta ? <div className="text-xs text-muted">{meta}</div> : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

export function DetailsSection({
  title,
  description,
  children,
  className,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "ims-detail-section rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card p-4 sm:p-5",
        className
      )}
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MetadataList({
  items,
  className,
}: {
  items: Array<{ label: string; value: React.ReactNode; mono?: boolean }>;
  className?: string;
}) {
  return (
    <dl className={cn("grid gap-3 sm:grid-cols-2", className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[0.6875rem] font-medium uppercase tracking-wide text-muted">
            {item.label}
          </dt>
          <dd
            className={cn(
              "mt-0.5 truncate text-sm text-foreground",
              item.mono && "font-mono text-xs tracking-wide"
            )}
            dir={item.mono ? "ltr" : undefined}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function RelatedRecords({
  children,
  empty,
  loading,
  error,
  onRetry,
  viewAllHref,
  viewAllLabel,
}: {
  children?: React.ReactNode;
  empty?: string;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  viewAllHref?: string;
  viewAllLabel?: string;
}) {
  const { t } = useI18n();
  const items = Array.isArray(children) ? children.filter(Boolean) : children ? [children] : [];

  if (loading) {
    return (
      <div
        className="ims-related-list space-y-0 overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--foreground)_3.5%,transparent)]"
        aria-busy
      >
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex h-11 items-center gap-3 px-3">
            <div className="h-3.5 w-2/5 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
            <div className="ms-auto h-3 w-16 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-[color-mix(in_srgb,var(--foreground)_3.5%,transparent)] px-3 py-6 text-center">
        <p className="text-sm text-muted">{error}</p>
        {onRetry ? (
          <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={onRetry}>
            {t("mgmt.retry")}
          </Button>
        ) : null}
      </div>
    );
  }

  if (!items.length) {
    return <p className="px-1 text-sm text-muted">{empty ?? t("empty.noData")}</p>;
  }

  return (
    <div className="space-y-2">
      <ul
        className="ims-related-list divide-y divide-[color-mix(in_srgb,var(--foreground)_8%,transparent)] overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--foreground)_3.5%,transparent)]"
        role="list"
      >
        {items.map((item, index) => (
          <li key={index} role="listitem">
            {item}
          </li>
        ))}
      </ul>
      {viewAllHref ? (
        <div className="pt-1">
          <GuardedLink
            href={viewAllHref}
            showPending
            className="text-sm font-medium text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {viewAllLabel ?? t("action.viewAll")}
          </GuardedLink>
        </div>
      ) : null}
    </div>
  );
}

export function RelatedRecordLink({
  href,
  title,
  meta,
  status,
  statusLabel,
  icon,
}: {
  href?: string;
  title: React.ReactNode;
  meta?: React.ReactNode;
  status?: string;
  statusLabel?: string;
  icon?: React.ReactNode;
}) {
  const content = (
    <>
      {icon ? <span className="shrink-0 text-muted">{icon}</span> : null}
      <span className="min-w-0 flex-1 truncate font-medium text-foreground">{title}</span>
      {status && statusLabel ? (
        <StatusBadge status={status} label={statusLabel} className="shrink-0" />
      ) : null}
      {meta ? <span className="shrink-0 text-xs text-muted tabular-nums">{meta}</span> : null}
    </>
  );

  const className =
    "ims-related-row flex h-11 w-full items-center gap-3 px-3 text-sm transition-colors hover:bg-[var(--hover-bg)]/55 focus-visible:bg-[var(--hover-bg)]/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent";

  if (!href) {
    return <div className={cn(className, "cursor-default")}>{content}</div>;
  }

  return (
    <GuardedLink href={href} showPending className={cn(className, "cursor-pointer")}>
      {content}
    </GuardedLink>
  );
}

export function DetailsSkeleton() {
  return (
    <div className="ims-record-details flex min-h-0 flex-col gap-5" aria-busy="true" aria-live="polite">
      <div className="space-y-4">
        <div className="h-8 w-20 animate-pulse rounded-md bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
          <div className="space-y-2">
            <div className="h-8 w-56 max-w-full animate-pulse rounded-md bg-[color-mix(in_srgb,var(--foreground)_10%,transparent)]" />
            <div className="h-4 w-40 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_7%,transparent)]" />
            <div className="h-3 w-52 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
            <div className="h-9 w-24 animate-pulse rounded-lg bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
          </div>
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card p-5"
          >
            <div className="mb-4 h-4 w-28 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((__, j) => (
                <div key={j} className="space-y-1.5">
                  <div className="h-3 w-16 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_6%,transparent)]" />
                  <div className="h-4 w-28 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card p-5">
        <div className="mb-4 h-4 w-32 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
        <div className="overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--foreground)_3.5%,transparent)]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex h-11 items-center px-3">
              <div className="h-3.5 w-2/5 animate-pulse rounded bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function RecordLoadingState() {
  return <DetailsSkeleton />;
}

export function RecordNotFoundState({
  backHref,
  title,
  description,
}: {
  backHref: string;
  title?: string;
  description?: string;
}) {
  const { t } = useI18n();
  useRegisterBreadcrumbTitle(title ?? t("record.notFound"));
  return (
    <div className="space-y-4 py-10 text-center">
      <EmptyState
        title={title ?? t("record.notFound")}
        description={description ?? t("record.notFoundDescription")}
      />
      <NavButton href={backHref} variant="secondary" className="min-w-[7rem]">
        {t("action.back")}
      </NavButton>
    </div>
  );
}

export function RecordErrorState({
  onRetry,
  message,
}: {
  onRetry?: () => void;
  message?: string;
}) {
  const { t } = useI18n();
  return (
    <div className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card px-6 py-12 text-center">
      <p className="font-medium text-foreground">{t("mgmt.errorState")}</p>
      {message ? <p className="mt-1 text-sm text-muted">{message}</p> : null}
      {onRetry ? (
        <Button type="button" variant="secondary" className="mt-4" onClick={onRetry}>
          {t("mgmt.retry")}
        </Button>
      ) : null}
    </div>
  );
}

/** @deprecated Prefer DetailsSkeleton — kept for any residual imports */
export function RecordSpinnerFallback() {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-accent" aria-hidden />
    </div>
  );
}
