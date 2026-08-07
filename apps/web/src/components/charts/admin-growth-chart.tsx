"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserGrowthMonth } from "@ims/shared-types";
import { useI18n } from "@/lib/i18n";
import { useAdminGrowthChartType, AdminGrowthChartTypeSelect } from "./admin-growth-chart-controls";

const AdminGrowthChartCanvas = dynamic(
  () => import("./admin-growth-chart-canvas").then((m) => m.AdminGrowthChartCanvas),
  {
    ssr: false,
    loading: () => <Skeleton className="h-[200px] w-full rounded-lg" />,
  }
);

export function AdminGrowthChartCard({ months }: { months: UserGrowthMonth[] }) {
  const { chartType, setChartType } = useAdminGrowthChartType();
  const { t } = useI18n();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{t("admin.userGrowthTrend")}</p>
        <AdminGrowthChartTypeSelect value={chartType} onChange={setChartType} />
      </div>
      <AdminGrowthChartCanvas data={months} chartType={chartType} />
      <p className="text-xs text-muted">{t("admin.userGrowthClickHint")}</p>
    </div>
  );
}

// Re-export for admin page that imports AdminGrowthChart directly
export { AdminGrowthChartCanvas as AdminGrowthChart } from "./admin-growth-chart-canvas";
export { useAdminGrowthChartType, AdminGrowthChartTypeSelect } from "./admin-growth-chart-controls";
