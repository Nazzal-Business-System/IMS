"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n";
import type { ChartRendererProps } from "./chart-renderer";

export type ChartType = "line" | "bar" | "area" | "pie" | "donut";

const ChartRenderer = dynamic(
  () => import("./chart-renderer").then((m) => m.ChartRenderer),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-border bg-card p-4">
        <Skeleton className="h-4 w-40 mb-4" />
        <Skeleton className="h-[280px] w-full rounded-lg" />
      </div>
    ),
  }
);

export function ChartCard(props: ChartRendererProps) {
  return <ChartRenderer {...props} />;
}

export function ChartTypeSelect({
  value,
  onChange,
}: {
  value: ChartType;
  onChange: (v: ChartType) => void;
}) {
  const { t } = useI18n();
  const types: ChartType[] = ["bar", "line", "area", "pie", "donut"];
  const typeLabels: Record<ChartType, string> = {
    bar: t("chart.type.bar"),
    line: t("chart.type.line"),
    area: t("chart.type.area"),
    pie: t("chart.type.pie"),
    donut: t("chart.type.donut"),
  };

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ChartType)}
      className="h-9 rounded-lg border border-border bg-[var(--input-bg)] px-2 text-sm text-foreground"
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

function getChartPref(key: string, defaultType: ChartType): ChartType {
  if (typeof window === "undefined") return defaultType;
  const stored = localStorage.getItem(`ims_chart_${key}`);
  if (stored && ["line", "bar", "area", "pie", "donut"].includes(stored)) {
    return stored as ChartType;
  }
  return defaultType;
}

export function useChartPreference(key: string, defaultType: ChartType = "bar") {
  const [type, setTypeState] = useState<ChartType>(defaultType);
  useEffect(() => {
    setTypeState(getChartPref(key, defaultType));
  }, [key, defaultType]);
  const setChartType = (t: ChartType) => {
    setTypeState(t);
    localStorage.setItem(`ims_chart_${key}`, t);
  };
  return { chartType: type, setChartType };
}
