"use client";

import { useRouter } from "next/navigation";
import {
  Bar,
  Line,
  Area,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  LineChart,
  AreaChart,
  Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import type { UserGrowthMonth } from "@ims/shared-types";
import { useI18n } from "@/lib/i18n";
import type { AdminGrowthChartType } from "./admin-growth-chart-controls";

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name?: string; color?: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg border border-border px-3 py-2 text-sm shadow-lg"
      style={{ background: "var(--tooltip-bg)", color: "var(--tooltip-fg)" }}
    >
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <p key={i} style={{ color: "var(--tooltip-fg)" }}>
          <span style={{ color: entry.color ?? "var(--accent)" }}>{entry.name}: </span>
          <span className="font-medium">{entry.value}</span>
        </p>
      ))}
    </div>
  );
}

export function AdminGrowthChartCanvas({
  data,
  chartType,
  className,
  onClick,
}: {
  data: UserGrowthMonth[];
  chartType: AdminGrowthChartType;
  className?: string;
  onClick?: () => void;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const chartData = data.map((m) => ({
    name: m.label,
    newUsers: m.total,
    cumulative: m.cumulativeTotal,
    active: m.cumulativeActive,
    disabled: m.cumulativeDisabled,
  }));

  const tooltip = { content: <ChartTooltip /> };
  const handleClick = onClick ?? (() => router.push("/admin/user-growth"));

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "h-[200px] w-full cursor-pointer rounded-lg transition-colors hover:bg-[var(--hover-bg)]/30",
        className
      )}
      aria-label={t("chart.viewUserGrowth")}
    >
      <ResponsiveContainer width="100%" height="100%">
        {chartType === "bar" ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} allowDecimals={false} />
            <Tooltip {...tooltip} />
            <Bar dataKey="newUsers" name={t("chart.newUsers")} fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chartType === "line" ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} allowDecimals={false} />
            <Tooltip {...tooltip} />
            <Line
              type="monotone"
              dataKey="cumulative"
              name={t("chart.totalUsers")}
              stroke="var(--accent)"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        ) : chartType === "area" ? (
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} allowDecimals={false} />
            <Tooltip {...tooltip} />
            <Area
              type="monotone"
              dataKey="cumulative"
              name={t("chart.totalUsers")}
              stroke="var(--accent)"
              fill="var(--accent)"
              fillOpacity={0.2}
            />
          </AreaChart>
        ) : (
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <YAxis tick={{ fill: "var(--muted)", fontSize: 11 }} allowDecimals={false} />
            <Tooltip {...tooltip} />
            <Legend wrapperStyle={{ fontSize: 11, color: "var(--muted)" }} />
            <Bar dataKey="newUsers" name={t("chart.new")} fill="var(--accent)" radius={[2, 2, 0, 0]} barSize={20} />
            <Line type="monotone" dataKey="cumulative" name={t("chart.total")} stroke="#2563eb" strokeWidth={2} dot={false} />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </button>
  );
}
