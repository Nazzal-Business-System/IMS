"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type {
  InventoryValueReport,
  LowStockReport,
  StockMovementsReport,
  SupplierSummaryReport,
} from "@ims/shared-types";
import { apiFetch } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/loading";
import { cn } from "@/lib/utils";
import { ManagementDataTable, type ManagementColumn } from "@/components/management";

type TableTab = "inventory-value" | "low-stock" | "supplier-summary" | "stock-movements";

export function ReportsTablesSection() {
  const { t } = useI18n();
  const [tab, setTab] = useState<TableTab>("inventory-value");

  const inventoryQuery = useQuery({
    queryKey: ["reports-inventory-value"],
    queryFn: () => apiFetch<InventoryValueReport>("/reports/inventory-value"),
    enabled: tab === "inventory-value",
  });

  const lowStockQuery = useQuery({
    queryKey: ["reports-low-stock"],
    queryFn: () => apiFetch<LowStockReport>("/reports/low-stock"),
    enabled: tab === "low-stock",
  });

  const supplierQuery = useQuery({
    queryKey: ["reports-supplier-summary"],
    queryFn: () => apiFetch<SupplierSummaryReport>("/reports/supplier-summary"),
    enabled: tab === "supplier-summary",
  });

  const movementsQuery = useQuery({
    queryKey: ["reports-stock-movements"],
    queryFn: () => apiFetch<StockMovementsReport>("/reports/stock-movements?limit=100"),
    enabled: tab === "stock-movements",
  });

  const tabs: { id: TableTab; label: string }[] = [
    { id: "inventory-value", label: t("reports.tab.inventoryValue") },
    { id: "low-stock", label: t("reports.tab.lowStock") },
    { id: "supplier-summary", label: t("reports.tab.supplierSummary") },
    { id: "stock-movements", label: t("reports.tab.stockMovements") },
  ];

  const activeQuery =
    tab === "inventory-value"
      ? inventoryQuery
      : tab === "low-stock"
        ? lowStockQuery
        : tab === "supplier-summary"
          ? supplierQuery
          : movementsQuery;

  const categoryRows = useMemo(() => {
    if (!inventoryQuery.data) return [];
    return inventoryQuery.data.byCategory.map((c) => ({
      id: c.categoryName,
      name: c.categoryName,
      count: c.count,
      value: c.value,
    }));
  }, [inventoryQuery.data]);

  const warehouseRows = useMemo(() => {
    if (!inventoryQuery.data) return [];
    return inventoryQuery.data.byWarehouse.map((w) => ({
      id: w.warehouseName,
      name: w.warehouseName,
      count: w.count,
      value: w.value,
    }));
  }, [inventoryQuery.data]);

  const categoryValueColumns: ManagementColumn<{ id: string; name: string; count: number; value: number }>[] = [
    { key: "name", header: t("table.category"), cell: (r) => r.name },
    { key: "count", header: t("table.products"), align: "end", cell: (r) => r.count },
    { key: "value", header: t("table.value"), align: "end", cell: (r) => formatCurrency(r.value) },
  ];

  const warehouseValueColumns: ManagementColumn<{ id: string; name: string; count: number; value: number }>[] = [
    { key: "name", header: t("table.warehouse"), cell: (r) => r.name },
    { key: "count", header: t("table.products"), align: "end", cell: (r) => r.count },
    { key: "value", header: t("table.value"), align: "end", cell: (r) => formatCurrency(r.value) },
  ];

  const lowStockColumns: ManagementColumn<LowStockReport["products"][number]>[] = [
    { key: "name", header: t("table.product"), cell: (p) => p.name },
    { key: "sku", header: t("table.sku"), cell: (p) => p.sku },
    {
      key: "quantity",
      header: t("table.quantity"),
      align: "end",
      cell: (p) => (
        <Badge variant={p.quantity <= p.reorderLevel ? "destructive" : "default"}>{p.quantity}</Badge>
      ),
    },
    { key: "reorderLevel", header: t("table.reorderLevel"), align: "end", cell: (p) => p.reorderLevel },
    { key: "category", header: t("table.category"), cell: (p) => p.category?.name ?? t("table.dash") },
  ];

  const supplierColumns: ManagementColumn<SupplierSummaryReport["suppliers"][number]>[] = [
    { key: "name", header: t("table.supplier"), cell: (s) => s.name },
    { key: "productCount", header: t("table.products"), align: "end", cell: (s) => s.productCount },
    {
      key: "totalStockValue",
      header: t("table.value"),
      align: "end",
      cell: (s) => formatCurrency(s.totalStockValue),
    },
  ];

  const movementColumns: ManagementColumn<StockMovementsReport["movements"][number]>[] = [
    { key: "date", header: t("table.date"), cell: (m) => formatDate(m.createdAt) },
    { key: "product", header: t("table.product"), cell: (m) => m.product?.name ?? t("table.dash") },
    { key: "type", header: t("table.type"), cell: (m) => m.type },
    { key: "quantity", header: t("table.quantity"), align: "end", cell: (m) => m.quantity },
    { key: "warehouse", header: t("table.warehouse"), cell: (m) => m.warehouse?.name ?? t("table.dash") },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 border-b border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] pb-2">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              tab === item.id
                ? "bg-accent/15 text-accent"
                : "text-muted hover:bg-[var(--hover-bg)] hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {activeQuery.isLoading && <TableSkeleton rows={6} cols={4} />}
      {activeQuery.error && (
        <EmptyState title={t("reports.failedToLoad")} description={t("dashboard.tryAgain")} />
      )}

      {tab === "inventory-value" && inventoryQuery.data && (
        <div className="space-y-4">
          <Card className="border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card">
            <CardHeader>
              <CardTitle className="text-base">{t("reports.totalInventoryValue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">
                {formatCurrency(inventoryQuery.data.totalValue)}
              </p>
            </CardContent>
          </Card>
          <ManagementDataTable data={categoryRows} emptyTitle={t("empty.noData")} columns={categoryValueColumns} />
          <ManagementDataTable data={warehouseRows} emptyTitle={t("empty.noData")} columns={warehouseValueColumns} />
        </div>
      )}

      {tab === "low-stock" && lowStockQuery.data && (
        <ManagementDataTable
          data={lowStockQuery.data.products}
          emptyTitle={t("reports.noLowStock")}
          columns={lowStockColumns}
          getRowHref={(p) => `/products/${p.id}`}
          getRowLabel={(p) => p.name}
        />
      )}

      {tab === "supplier-summary" && supplierQuery.data && (
        <ManagementDataTable
          data={supplierQuery.data.suppliers}
          emptyTitle={t("empty.noData")}
          columns={supplierColumns}
          getRowHref={(s) => `/suppliers/${s.id}`}
          getRowLabel={(s) => s.name}
        />
      )}

      {tab === "stock-movements" && movementsQuery.data && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            {(
              [
                ["IN", movementsQuery.data.summary.totalIn],
                ["OUT", movementsQuery.data.summary.totalOut],
                ["TRANSFER", movementsQuery.data.summary.totalTransfer],
                ["ADJUSTMENT", movementsQuery.data.summary.totalAdjustment],
              ] as const
            ).map(([type, qty]) => (
              <Card key={type} className="border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted">{type}</p>
                  <p className="text-lg font-semibold tabular-nums">{qty}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <ManagementDataTable
            data={movementsQuery.data.movements}
            emptyTitle={t("empty.noData")}
            columns={movementColumns}
            getRowHref={(m) => `/stock-movements/${m.id}`}
            getRowLabel={(m) => m.product?.name ?? m.id}
          />
        </div>
      )}
    </div>
  );
}
