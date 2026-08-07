"use client";

import { useQuery } from "@tanstack/react-query";
import type { DashboardStats, ChartReportData } from "@ims/shared-types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, DashboardPageSkeleton } from "@/components/ui/loading";
import { ManagementPageHeader, ManagementDataTable, StatusBadge } from "@/components/management";
import { ChartCard, ChartTypeSelect, useChartPreference } from "@/components/charts/chart-card";
import { Package, DollarSign, AlertTriangle, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

const KPI_STYLES = [
  { color: "text-accent", gradient: "from-[color-mix(in_srgb,var(--accent)_16%,transparent)] to-transparent" },
  { color: "text-[var(--chart-2)]", gradient: "from-[color-mix(in_srgb,var(--chart-2)_14%,transparent)] to-transparent" },
  { color: "text-[var(--status-warning-fg)]", gradient: "from-[color-mix(in_srgb,var(--status-warning-bg)_90%,transparent)] to-transparent" },
  { color: "text-[var(--chart-3)]", gradient: "from-[color-mix(in_srgb,var(--chart-3)_14%,transparent)] to-transparent" },
];

export default function DashboardPage() {
  const { canRead } = useAuth();
  const { t } = useI18n();
  const { chartType, setChartType } = useChartPreference("dashboard-category", "donut");

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch<DashboardStats>("/dashboard"),
    enabled: canRead("dashboard"),
  });

  const { data: charts } = useQuery({
    queryKey: ["reports-charts"],
    queryFn: () => apiFetch<ChartReportData>("/reports/charts"),
    enabled: canRead("dashboard"),
  });

  if (!canRead("dashboard")) {
    return <EmptyState title={t("access.denied")} description={t("access.dashboard")} />;
  }

  if (isLoading) return <DashboardPageSkeleton />;
  if (error) return <EmptyState title={t("dashboard.failedToLoad")} description={t("dashboard.tryAgain")} />;
  if (!data) return null;

  const stats = [
    { title: t("dashboard.kpi.totalProducts"), value: data.totalProducts.toString(), icon: Package },
    { title: t("dashboard.kpi.stockValue"), value: formatCurrency(data.totalStockValue), icon: DollarSign },
    { title: t("dashboard.kpi.lowStockAlerts"), value: data.lowStockCount.toString(), icon: AlertTriangle },
    {
      title: t("dashboard.kpi.openPOs"),
      value: (data.purchaseOrderSummary.draft + data.purchaseOrderSummary.ordered).toString(),
      icon: ClipboardList,
    },
  ];

  const categoryChartData =
    charts?.inventoryByCategory.map((c) => ({
      name: c.name,
      value: c.value,
    })) ?? [];

  return (
    <div className="dashboard-bg -mx-4 -mt-2 space-y-6 rounded-xl px-4 py-4 lg:-mx-6 lg:px-6">
      <ManagementPageHeader title={t("dashboard.title")} description={t("dashboard.subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => {
          const style = KPI_STYLES[i % KPI_STYLES.length];
          const Icon = s.icon;
          return (
              <Card key={s.title}
                className={cn(
                  "relative overflow-hidden border-border bg-card shadow-ims-sm animate-fade-in-up"
                )}
                style={{ animationDelay: `${i * 80}ms` }}
              >
              <div
                className={cn(
                  "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80",
                  style.gradient
                )}
                aria-hidden
              />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted">{s.title}</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{s.value}</p>
                  </div>
                  <Icon className={cn("h-8 w-8 shrink-0", style.color)} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {categoryChartData.length > 0 && (
            <ChartCard
            title={t("dashboard.chart.inventoryByCategory")}
            data={categoryChartData}
            dataKey="value"
            nameKey="name"
            chartType={chartType}
            valueFormatter={formatCurrency}
            headerAction={
              <ChartTypeSelect value={chartType} onChange={setChartType} />
            }
          />
        )}

        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-foreground">{t("dashboard.lowStock.title")}</h2>
          <ManagementDataTable
            data={data.lowStockProducts}
            emptyTitle={t("dashboard.lowStock.allStockedUp")}
            emptyDescription={t("dashboard.lowStock.noProductsBelow")}
            columns={[
              {
                key: "product",
                header: t("table.product"),
                cell: (p) => <span className="font-medium">{p.name}</span>,
              },
              {
                key: "qty",
                header: t("table.qty"),
                align: "end",
                cell: (p) => <StatusBadge status="pending" label={String(p.quantity)} />,
              },
              {
                key: "reorder",
                header: t("table.reorder"),
                align: "end",
                cell: (p) => <span className="tabular-nums">{p.reorderLevel}</span>,
              },
            ]}
            getRowHref={(p) => `/products/${p.id}`}
            getRowLabel={(p) => p.name}
            mobileCard={{
              title: (p) => p.name,
              fields: [
                { label: t("table.qty"), value: (p) => String(p.quantity) },
                { label: t("table.reorder"), value: (p) => String(p.reorderLevel) },
              ],
            }}
          />
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">{t("dashboard.recentMovements.title")}</h2>
        <ManagementDataTable
          data={data.recentMovements}
          emptyTitle={t("dashboard.recentMovements.empty")}
          columns={[
            {
              key: "product",
              header: t("table.product"),
              cell: (m) => m.product?.name ?? m.productId,
            },
            {
              key: "type",
              header: t("table.type"),
              cell: (m) => <StatusBadge status={m.type.toLowerCase()} label={m.type} />,
            },
            {
              key: "qty",
              header: t("table.qty"),
              align: "end",
              cell: (m) => <span className="tabular-nums">{m.quantity}</span>,
            },
            {
              key: "date",
              header: t("table.date"),
              align: "end",
              hideBelow: "md",
              cell: (m) => <span className="text-muted tabular-nums">{formatDate(m.createdAt)}</span>,
            },
          ]}
          getRowHref={(m) => `/stock-movements/${m.id}`}
          getRowLabel={(m) => `${m.product?.name ?? m.productId} · ${m.type}`}
          mobileCard={{
            title: (m) => m.product?.name ?? m.productId,
            badges: (m) => <StatusBadge status={m.type.toLowerCase()} label={m.type} />,
            fields: [
              { label: t("table.qty"), value: (m) => String(m.quantity) },
              { label: t("table.date"), value: (m) => formatDate(m.createdAt) },
            ],
          }}
        />
      </div>
    </div>
  );
}
