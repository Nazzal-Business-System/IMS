"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { UserGrowthData, Role } from "@ims/shared-types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AdminGrowthChart, AdminGrowthChartTypeSelect, useAdminGrowthChartType } from "@/components/charts/admin-growth-chart";
import { EmptyState, PageLoading } from "@/components/ui/loading";
import { filterBySearch, sortByDate } from "@/lib/list-controls";
import { ArrowLeft } from "lucide-react";
import {
  ManagementToolbar,
  ManagementToolbarRow,
  SearchField,
  FilterSelect,
  ActiveFilters,
  ManagementDataTable,
  StatusBadge,
  type ManagementColumn,
  type ActiveFilterChip,
} from "@/components/management";

type GrowthUser = UserGrowthData["users"][number];

export default function UserGrowthPage() {
  const { canRead } = useAuth();
  const { t } = useI18n();
  const { chartType, setChartType } = useAdminGrowthChartType();
  const [search, setSearch] = useState("");
  const [monthFilter, setMonthFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-user-growth"],
    queryFn: () => apiFetch<UserGrowthData>("/admin/user-growth"),
    enabled: canRead("admin"),
  });

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    let list = [...data.users];
    if (monthFilter !== "all") {
      list = list.filter((u) => u.createdAt.startsWith(monthFilter));
    }
    if (roleFilter !== "all") list = list.filter((u) => u.role === roleFilter);
    if (statusFilter === "active") list = list.filter((u) => u.isActive);
    if (statusFilter === "inactive") list = list.filter((u) => !u.isActive);
    list = filterBySearch(list, search, (u) => [u.name, u.email]);
    return sortByDate(list, (u) => u.createdAt, "latest");
  }, [data, monthFilter, roleFilter, statusFilter, search]);

  if (!canRead("admin")) {
    return <EmptyState title={t("access.denied")} description={t("access.adminRequired")} />;
  }

  if (isLoading) return <PageLoading />;
  if (error || !data) return <EmptyState title={t("admin.userGrowth.failedToLoad")} />;

  const monthOptions = data.months.map((m) => ({ key: m.key, label: m.label }));

  const activeChips: ActiveFilterChip[] = [
    ...(monthFilter !== "all"
      ? [{ key: "month", label: `${t("filter.month")}: ${monthOptions.find((m) => m.key === monthFilter)?.label ?? monthFilter}` }]
      : []),
    ...(roleFilter !== "all" ? [{ key: "role", label: `${t("filter.role")}: ${t(`role.${roleFilter}`)}` }] : []),
    ...(statusFilter !== "all"
      ? [{ key: "status", label: `${t("filter.status")}: ${statusFilter === "active" ? t("status.active") : t("status.inactive")}` }]
      : []),
  ];

  const clearAll = () => {
    setMonthFilter("all");
    setRoleFilter("all");
    setStatusFilter("all");
    setSearch("");
  };

  const columns: ManagementColumn<GrowthUser>[] = [
    {
      key: "name",
      header: t("table.name"),
      cell: (u) => (
        <div>
          <p className="font-medium">{u.name}</p>
          <p className="text-xs text-muted">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: t("table.role"),
      cell: (u) => (
        <Badge variant="secondary" className="capitalize">
          {t(`role.${u.role}`)}
        </Badge>
      ),
    },
    {
      key: "status",
      header: t("table.status"),
      cell: (u) => (
        <StatusBadge status={u.isActive ? "active" : "inactive"} label={u.isActive ? t("status.active") : t("status.inactive")} />
      ),
    },
    {
      key: "created",
      header: t("table.created"),
      align: "end",
      hideBelow: "md",
      cell: (u) => <span className="text-sm text-muted">{formatDate(u.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" asChild className="mb-2">
            <Link href="/admin"><ArrowLeft className="h-4 w-4" /> {t("admin.userGrowth.back")}</Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">{t("admin.userGrowth.title")}</h1>
          <p className="mt-1 text-sm text-muted">{t("admin.userGrowth.subtitle")}</p>
        </div>
        <AdminGrowthChartTypeSelect value={chartType} onChange={setChartType} />
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">{t("admin.userGrowth.chart")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminGrowthChart data={data.months} chartType={chartType} className="h-[280px]" />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {data.months.slice(-3).map((m) => (
          <Card key={m.key} className="border-border bg-card">
            <CardContent className="p-4">
              <p className="text-sm text-muted">{m.label}</p>
              <p className="text-2xl font-bold text-foreground">{t("admin.userGrowth.newUsers", { count: m.total })}</p>
              <p className="text-xs text-muted mt-1">
                {t("admin.userGrowth.roleBreakdown", {
                  admin: m.byRole.admin ?? 0,
                  manager: m.byRole.manager ?? 0,
                  viewer: m.byRole.viewer ?? 0,
                })}
              </p>
              <p className="text-xs text-muted">
                {t("admin.userGrowth.statusBreakdown", { active: m.active, disabled: m.disabled })}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="text-base">{t("admin.userGrowth.usersBySignup")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ManagementToolbar>
            <ManagementToolbarRow>
              <SearchField value={search} onChange={setSearch} placeholder={t("admin.users.search")} />
              <FilterSelect label={t("filter.month")} value={monthFilter} onChange={setMonthFilter}>
                <option value="all">{t("filter.allMonths")}</option>
                {monthOptions.map((m) => (
                  <option key={m.key} value={m.key}>{m.label}</option>
                ))}
              </FilterSelect>
              <FilterSelect label={t("filter.role")} value={roleFilter} onChange={(v) => setRoleFilter(v as Role | "all")}>
                <option value="all">{t("filter.allRoles")}</option>
                <option value="admin">{t("role.admin")}</option>
                <option value="manager">{t("role.manager")}</option>
                <option value="viewer">{t("role.viewer")}</option>
              </FilterSelect>
              <FilterSelect label={t("filter.status")} value={statusFilter} onChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <option value="all">{t("filter.allStatus")}</option>
                <option value="active">{t("status.active")}</option>
                <option value="inactive">{t("status.inactive")}</option>
              </FilterSelect>
            </ManagementToolbarRow>
            <ActiveFilters
              chips={activeChips}
              onRemove={(key) => {
                if (key === "month") setMonthFilter("all");
                if (key === "role") setRoleFilter("all");
                if (key === "status") setStatusFilter("all");
              }}
              onClearAll={activeChips.length || search ? clearAll : undefined}
            />
          </ManagementToolbar>

          <ManagementDataTable
            data={filteredUsers}
            emptyTitle={t("admin.users.empty")}
            columns={columns}
            mobileCard={{
              title: (u) => u.name,
              subtitle: (u) => u.email,
              badges: (u) => (
                <>
                  <Badge variant="secondary" className="capitalize">{t(`role.${u.role}`)}</Badge>
                  <StatusBadge status={u.isActive ? "active" : "inactive"} label={u.isActive ? t("status.active") : t("status.inactive")} />
                </>
              ),
              fields: [
                { label: t("table.created"), value: (u) => formatDate(u.createdAt) },
              ],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
