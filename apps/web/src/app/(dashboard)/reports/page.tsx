"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { ManagementPageHeader } from "@/components/management";
import { EmptyState } from "@/components/ui/loading";
import { ReportsChartsSection } from "@/components/reports/reports-charts-section";
import { ReportsTablesSection } from "@/components/reports/reports-tables-section";
import { cn } from "@/lib/utils";

type ReportView = "charts" | "tables";

export default function ReportsPage() {
  const { canRead } = useAuth();
  const { t } = useI18n();
  const [view, setView] = useState<ReportView>("charts");

  if (!canRead("reports")) {
    return <EmptyState title={t("access.denied")} description={t("access.reports")} />;
  }

  return (
    <div className="space-y-6">
      <ManagementPageHeader title={t("reports.title")} description={t("reports.subtitle")} />

      <div className="flex gap-2">
        {(
          [
            { id: "charts" as const, label: t("reports.view.charts") },
            { id: "tables" as const, label: t("reports.view.tables") },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setView(item.id)}
            className={cn(
              "rounded-lg px-4 py-2 text-sm font-medium transition-colors",
              view === item.id
                ? "bg-accent text-accent-foreground"
                : "border border-border text-muted hover:bg-[var(--hover-bg)]"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {view === "charts" ? <ReportsChartsSection /> : <ReportsTablesSection />}
    </div>
  );
}
