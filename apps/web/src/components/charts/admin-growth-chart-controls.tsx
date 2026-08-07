"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

export type AdminGrowthChartType = "bar" | "line" | "area" | "composed";

const STORAGE_KEY = "ims_admin_growth_chart";

export function useAdminGrowthChartType() {
  const [type, setTypeState] = useState<AdminGrowthChartType>("bar");
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && ["bar", "line", "area", "composed"].includes(stored)) {
      setTypeState(stored as AdminGrowthChartType);
    }
  }, []);
  const setChartType = (t: AdminGrowthChartType) => {
    setTypeState(t);
    localStorage.setItem(STORAGE_KEY, t);
  };
  return { chartType: type, setChartType };
}

export function AdminGrowthChartTypeSelect({
  value,
  onChange,
}: {
  value: AdminGrowthChartType;
  onChange: (v: AdminGrowthChartType) => void;
}) {
  const { t } = useI18n();
  const types: AdminGrowthChartType[] = ["bar", "line", "area", "composed"];
  const typeLabels: Record<AdminGrowthChartType, string> = {
    bar: t("chart.type.bar"),
    line: t("chart.type.line"),
    area: t("chart.type.area"),
    composed: t("chart.type.composed"),
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as AdminGrowthChartType)}
      className="h-8 rounded-lg border border-border bg-[var(--input-bg)] px-2 text-xs text-foreground"
      aria-label={t("chart.type")}
    >
      {types.map((type) => (
        <option key={type} value={type}>
          {typeLabels[type]}
        </option>
      ))}
    </select>
  );
}
