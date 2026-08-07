"use client";

import {
  Bar,
  BarChart,
  Area,
  AreaChart,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import type { ChartType } from "./chart-card";

const CHART_COLORS_LIGHT = ["#0d9488", "#2563eb", "#0f766e", "#d97706", "#dc2626", "#059669", "#475569"];
const CHART_COLORS_DARK = ["#2dd4bf", "#60a5fa", "#a78bfa", "#fbbf24", "#f87171", "#34d399", "#f472b6"];

function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string;
  formatter?: (v: number) => string;
}) {
  const { t } = useI18n();
  if (!active || !payload?.length) return null;
  const fmt = formatter ?? ((v: number) => String(v));
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 shadow-lg text-sm"
      style={{ background: "var(--tooltip-bg)", color: "var(--tooltip-fg)" }}
    >
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: "var(--tooltip-fg)" }}>
          <span style={{ color: entry.color ?? "var(--accent)" }}>{entry.name ?? t("chart.value")}: </span>
          <span className="font-medium">{fmt(entry.value)}</span>
        </p>
      ))}
    </div>
  );
}

export interface ChartRendererProps {
  title: string;
  data: Array<Record<string, string | number>>;
  dataKey: string;
  nameKey?: string;
  chartType: ChartType;
  className?: string;
  valueFormatter?: (v: number) => string;
  headerAction?: React.ReactNode;
}

export function ChartRenderer({
  title,
  data,
  dataKey,
  nameKey = "name",
  chartType,
  className,
  valueFormatter,
  headerAction,
}: ChartRendererProps) {
  const { resolvedMode } = useTheme();
  const COLORS = resolvedMode === "light" ? CHART_COLORS_LIGHT : CHART_COLORS_DARK;
  const fmt = valueFormatter ?? ((v: number) => String(v));
  const tooltipProps = { content: <ChartTooltip formatter={fmt} /> };

  return (
    <div className={cn("rounded-xl border border-border bg-card p-4 shadow-ims-sm", className)}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {headerAction}
      </div>
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey={nameKey} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey={dataKey} fill="var(--accent)" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : chartType === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey={nameKey} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip {...tooltipProps} />
              <Line type="monotone" dataKey={dataKey} stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          ) : chartType === "area" ? (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey={nameKey} tick={{ fill: "var(--muted)", fontSize: 11 }} />
              <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} tickFormatter={fmt} />
              <Tooltip {...tooltipProps} />
              <Area type="monotone" dataKey={dataKey} stroke="var(--accent)" fill="var(--accent)" fillOpacity={0.15} />
            </AreaChart>
          ) : (
            <PieChart>
              <Pie
                data={data}
                dataKey={dataKey}
                nameKey={nameKey}
                innerRadius={chartType === "donut" ? 60 : 0}
                outerRadius={100}
                paddingAngle={2}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
              <Legend wrapperStyle={{ color: "var(--muted)", fontSize: 12 }} />
            </PieChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
