"use client";

import { useQuery } from "@tanstack/react-query";
import type { ChartReportData } from "@ims/shared-types";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import {
  ChartCard,
  ChartTypeSelect,
  useChartPreference,
} from "@/components/charts/chart-card";
import { CardGridSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/loading";

function ReportChartCard({
  prefKey,
  title,
  data,
  dataKey,
  nameKey = "name",
  defaultType = "bar",
  valueFormatter,
}: {
  prefKey: string;
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey?: string;
  defaultType?: "line" | "bar" | "area" | "pie" | "donut";
  valueFormatter?: (v: number) => string;
}) {
  const { chartType, setChartType } = useChartPreference(prefKey, defaultType);

  if (!data.length) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-muted sr-only">{title}</span>
        <ChartTypeSelect value={chartType} onChange={setChartType} />
      </div>
      <ChartCard
        title={title}
        data={data}
        dataKey={dataKey}
        nameKey={nameKey}
        chartType={chartType}
        valueFormatter={valueFormatter}
      />
    </div>
  );
}

export function ReportsChartsSection() {
  const { t } = useI18n();
  const { data, isLoading, error } = useQuery({
    queryKey: ["reports-charts"],
    queryFn: () => apiFetch<ChartReportData>("/reports/charts"),
  });

  if (isLoading) return <CardGridSkeleton count={4} />;
  if (error) {
    return <EmptyState title={t("reports.failedToLoad")} description={t("dashboard.tryAgain")} />;
  }
  if (!data) return null;

  const movementTrendData = data.movementTrend.map((d) => ({
    name: d.date,
    value: d.in + d.out,
    in: d.in,
    out: d.out,
  }));

  return (
    
      <div className="grid gap-6 lg:grid-cols-2">
        <ReportChartCard
          prefKey="reports-category"
          title={t("reports.chart.inventoryByCategory")}
          data={data.inventoryByCategory.map((c) => ({ name: c.name, value: c.value }))}
          dataKey="value"
          defaultType="donut"
          valueFormatter={formatCurrency}
        />
        <ReportChartCard
          prefKey="reports-warehouse"
          title={t("reports.chart.inventoryByWarehouse")}
          data={data.inventoryByWarehouse.map((w) => ({ name: w.name, value: w.value }))}
          dataKey="value"
          defaultType="bar"
          valueFormatter={formatCurrency}
        />
        <ReportChartCard
          prefKey="reports-movement-trend"
          title={t("reports.chart.movementTrend")}
          data={movementTrendData}
          dataKey="value"
          nameKey="name"
          defaultType="area"
        />
        <ReportChartCard
          prefKey="reports-movement-types"
          title={t("reports.chart.movementTypeDistribution")}
          data={data.movementTypeDistribution.map((m) => ({ name: m.type, value: m.value }))}
          dataKey="value"
          defaultType="pie"
        />
        <ReportChartCard
          prefKey="reports-top-products"
          title={t("reports.chart.topProducts")}
          data={data.topProducts.map((p) => ({ name: p.name, value: p.quantity }))}
          dataKey="value"
          defaultType="bar"
        />
        <ReportChartCard
          prefKey="reports-suppliers"
          title={t("reports.chart.supplierContribution")}
          data={data.supplierContribution.map((s) => ({ name: s.name, value: s.value }))}
          dataKey="value"
          defaultType="donut"
          valueFormatter={formatCurrency}
        />
      </div>
    
  );
}
