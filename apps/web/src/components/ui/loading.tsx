"use client";

import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { CardGridSkeleton, Skeleton, TableSkeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";

export function LoadingSpinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-6 w-6 animate-spin text-accent", className)} />;
}

export function PageLoading() {
  const { t } = useI18n();

  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3">
      <LoadingSpinner className="h-8 w-8" />
      <p className="text-sm text-muted">{t("loading")}</p>
    </div>
  );
}

export function DashboardPageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <CardGridSkeleton count={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[340px] rounded-xl" />
        <div className="rounded-xl border border-border bg-card">
          <TableSkeleton rows={5} cols={3} />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card">
        <TableSkeleton rows={6} cols={4} />
      </div>
    </div>
  );
}

export function ShellSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 start-0 hidden w-64 border-e border-border bg-sidebar p-4 lg:block">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="space-y-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </aside>
      <div className="lg:ps-64">
        <Skeleton className="h-14 w-full border-b border-border" />
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
          <CardGridSkeleton count={4} />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <p className="text-lg font-medium text-foreground">{title}</p>
      {description && <p className="text-sm text-muted mt-2 max-w-md">{description}</p>}
    </div>
  );
}
