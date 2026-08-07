"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import type { AdminDashboardStats, AuditLog, User, Role, UserGrowthData } from "@ims/shared-types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DashboardPageSkeleton, EmptyState } from "@/components/ui/loading";
import { ManagementDataTable, type ManagementColumn } from "@/components/management";
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  UserPlus,
  KeyRound,
  Palette,
  ScrollText,
  Activity,
  Database,
  Server,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminGrowthChartCard } from "@/components/charts/admin-growth-chart";
const ROLE_META: Record<Role, { labelKey: string; color: string; bar: string }> = {
  admin: { labelKey: "role.admin", color: "text-purple-400", bar: "bg-purple-500" },
  manager: { labelKey: "role.manager", color: "text-amber-400", bar: "bg-amber-500" },
  viewer: { labelKey: "role.viewer", color: "text-blue-400", bar: "bg-blue-500" },
};

const QUICK_ACTIONS: { href: string; labelKey: string; descKey: string; icon: LucideIcon; section: string }[] = [
  { href: "/admin/users", labelKey: "admin.quickActions.addUser", descKey: "admin.quickActions.addUserDesc", icon: UserPlus, section: "admin_users" },
  { href: "/admin/permissions", labelKey: "admin.quickActions.permissions", descKey: "admin.quickActions.permissionsDesc", icon: KeyRound, section: "admin_permissions" },
  { href: "/settings/appearance", labelKey: "admin.quickActions.demoSettings", descKey: "admin.quickActions.demoSettingsDesc", icon: Palette, section: "settings" },
  { href: "/audit-log", labelKey: "admin.quickActions.auditLog", descKey: "admin.quickActions.auditLogDesc", icon: ScrollText, section: "audit_log" },
];

export default function AdminDashboardPage() {
  const { canRead } = useAuth();
  const { t } = useI18n();

  const { data: stats, isLoading: statsLoading, error } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => apiFetch<AdminDashboardStats>("/admin/dashboard"),
    enabled: canRead("admin"),
  });

  const { data: users } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch<User[]>("/users"),
    enabled: canRead("admin_users"),
  });

  const { data: growth } = useQuery({
    queryKey: ["admin-user-growth"],
    queryFn: () => apiFetch<UserGrowthData>("/admin/user-growth"),
    enabled: canRead("admin"),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ["audit-logs-recent"],
    queryFn: () => apiFetch<AuditLog[]>("/audit-logs?limit=8"),
    enabled: canRead("audit_log"),
  });

  const recentLogins = useMemo(() => {
    if (!users) return [];
    return [...users]
      .filter((u) => u.lastLoginAt)
      .sort((a, b) => new Date(b.lastLoginAt!).getTime() - new Date(a.lastLoginAt!).getTime())
      .slice(0, 5);
  }, [users]);

  if (!canRead("admin")) {
    return <EmptyState title={t("access.denied")} description={t("access.adminRequired")} />;
  }

  if (statsLoading) return <DashboardPageSkeleton />;
  if (error) return <EmptyState title={t("admin.failedToLoad")} description={t("dashboard.tryAgain")} />;
  if (!stats) return null;

  const summaryCards = [
    { titleKey: "admin.kpi.totalUsers", value: stats.totalUsers, icon: Users, gradient: "from-accent/20 to-accent/5", iconColor: "text-accent" },
    { titleKey: "admin.kpi.activeUsers", value: stats.activeUsers, icon: UserCheck, gradient: "from-emerald-500/20 to-emerald-500/5", iconColor: "text-emerald-500" },
    { titleKey: "admin.kpi.disabled", value: stats.disabledUsers, icon: UserX, gradient: "from-red-500/20 to-red-500/5", iconColor: "text-red-400" },
    { titleKey: "admin.kpi.admins", value: stats.rolesSummary.admin ?? 0, icon: Shield, gradient: "from-purple-500/20 to-purple-500/5", iconColor: "text-purple-400" },
  ];

  const totalRoles = (stats.rolesSummary.admin ?? 0) + (stats.rolesSummary.manager ?? 0) + (stats.rolesSummary.viewer ?? 0);

  const systemStatus = [
    { labelKey: "admin.apiServer", valueKey: "admin.online", icon: Server, ok: true },
    { labelKey: "admin.database", valueKey: "admin.connected", icon: Database, ok: true },
    { labelKey: "demo.mode", valueKey: "demo.active", icon: Sparkles, ok: true },
  ];

  return (
    <>
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-purple-500/10" />
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative flex flex-col gap-4 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-accent">
              <Shield className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wider">{t("admin.badge")}</span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-foreground sm:text-3xl">{t("admin.title")}</h1>
            <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">
              {t("admin.subtitle")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canRead("admin_users") && (
              <Button asChild>
                <Link href="/admin/users"><UserPlus className="h-4 w-4" /> {t("admin.addUser")}</Link>
              </Button>
            )}
            {canRead("admin_permissions") && (
              <Button variant="secondary" asChild>
                <Link href="/admin/permissions"><KeyRound className="h-4 w-4" /> {t("admin.permissions")}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((s) => (
          <Card
            key={s.titleKey}
            className="relative overflow-hidden border-border bg-card"
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-70", s.gradient)} />
            <CardContent className="relative p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted">{t(s.titleKey)}</p>
                  <p className="mt-1 text-3xl font-bold text-foreground">{s.value}</p>
                </div>
                <s.icon className={cn("h-8 w-8", s.iconColor)} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.roleDistribution")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(["admin", "manager", "viewer"] as Role[]).map((role) => {
              const count = stats.rolesSummary[role] ?? 0;
              const pct = totalRoles > 0 ? Math.round((count / totalRoles) * 100) : 0;
              const meta = ROLE_META[role];
              return (
                <div key={role}>
                  <div className="flex items-center justify-between text-sm">
                    <span className={cn("font-medium capitalize", meta.color)}>{t(meta.labelKey)}</span>
                    <span className="text-muted">{count} · {pct}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[var(--muted-bg)]">
                    <div
                      className={cn("h-2 rounded-full transition-all duration-500", meta.bar)}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-accent" />
              {t("admin.userGrowth")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {growth?.months ? (
              <AdminGrowthChartCard months={growth.months.slice(-6)} />
            ) : (
              <p className="text-sm text-muted">{t("admin.loadingGrowth")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-accent" />
              {t("admin.quickActions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {QUICK_ACTIONS.filter((action) => canRead(action.section)).map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="group flex items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-[var(--hover-bg)]"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <action.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{t(action.labelKey)}</p>
                  <p className="text-xs text-muted">{t(action.descKey)}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted opacity-0 transition-opacity group-hover:opacity-100" />
              </Link>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border bg-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">{t("admin.systemStatus")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-3">
            {systemStatus.map((item) => (
              <div
                key={item.labelKey}
                className="flex items-center gap-3 rounded-lg border border-border bg-[var(--muted-bg)]/30 p-4"
              >
                <item.icon className={cn("h-5 w-5", item.ok ? "text-emerald-500" : "text-red-400")} />
                <div>
                  <p className="text-xs text-muted">{t(item.labelKey)}</p>
                  <p className="text-sm font-semibold text-foreground">{t(item.valueKey)}</p>
                </div>
                <Badge variant={item.ok ? "success" : "destructive"} className="ml-auto shrink-0">
                  {item.ok ? t("admin.ok") : t("admin.down")}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("admin.recentSignIns")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/users">{t("action.viewAll")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLogins.length === 0 ? (
              <p className="text-sm text-muted">{t("admin.noRecentSignIns")}</p>
            ) : (
              <ul className="space-y-3">
                {recentLogins.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{u.name}</p>
                      <p className="truncate text-xs text-muted">{u.email}</p>
                    </div>
                    <div className="text-end shrink-0">
                      <Badge variant="secondary" className="capitalize">{t(`role.${u.role}`)}</Badge>
                      <p className="mt-1 text-xs text-muted">{formatDate(u.lastLoginAt!)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{t("admin.recentActivity")}</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/audit-log">{t("admin.auditLogLink")}</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {!auditLogs?.length ? (
              <p className="text-sm text-muted">{t("admin.noRecentActivity")}</p>
            ) : (
              <ManagementDataTable
                data={auditLogs.slice(0, 5)}
                columns={
                  [
                    {
                      key: "user",
                      header: t("table.user"),
                      cell: (log) => <span className="text-sm">{log.user?.name ?? t("table.dash")}</span>,
                    },
                    {
                      key: "action",
                      header: t("table.action"),
                      cell: (log) => <Badge variant="secondary">{log.action}</Badge>,
                    },
                    {
                      key: "when",
                      header: t("table.when"),
                      align: "end",
                      cell: (log) => <span className="text-xs text-muted">{formatDate(log.createdAt)}</span>,
                    },
                  ] satisfies ManagementColumn<AuditLog>[]
                }
                className="border-0"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </>
  );
}
