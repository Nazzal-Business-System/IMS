"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { AuditLog } from "@ims/shared-types";
import { Eye } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { EmptyState } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { sortByDate } from "@/lib/list-controls";
import {
  ManagementPageShell,
  ManagementPageHeader,
  ManagementToolbar,
  ManagementToolbarRow,
  SearchField,
  ManagementDataTable,
  RowActionMenu,
  type ManagementColumn,
  type RowActionItem,
} from "@/components/management";

export default function AuditLogPage() {
  const { canRead } = useAuth();
  const { t } = useI18n();
  const router = useRouter();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () => apiFetch<AuditLog[]>("/audit-logs?limit=100"),
    enabled: canRead("audit_log"),
  });

  const sorted = useMemo(() => sortByDate(data ?? [], (l) => l.createdAt, "latest"), [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((l) => {
      const user = (l.user?.name ?? l.user?.email ?? t("auditLog.system")).toLowerCase();
      return (
        user.includes(q) ||
        l.action.toLowerCase().includes(q) ||
        l.entity.toLowerCase().includes(q) ||
        (l.entityId?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [sorted, search, t]);

  if (!canRead("audit_log")) {
    return <EmptyState title={t("access.denied")} description={t("access.auditLog")} />;
  }

  const columns: ManagementColumn<AuditLog>[] = [
    {
      key: "date",
      header: t("table.date"),
      align: "end",
      cell: (l) => <span className="text-sm tabular-nums text-muted">{formatDate(l.createdAt)}</span>,
    },
    {
      key: "user",
      header: t("table.user"),
      cell: (l) => <span className="text-sm">{l.user?.name ?? l.user?.email ?? t("auditLog.system")}</span>,
    },
    {
      key: "action",
      header: t("table.action"),
      cell: (l) => <Badge variant="secondary">{l.action}</Badge>,
    },
    {
      key: "entity",
      header: t("table.entity"),
      hideBelow: "md",
      cell: (l) => (
        <span className="text-sm">
          {l.entity}
          {l.entityId && <span className="ms-1 text-muted">#{l.entityId.slice(0, 8)}</span>}
        </span>
      ),
    },
  ];

  const rowActions = (l: AuditLog): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/audit-log/${l.id}`),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("auditLog.title")}
        description={t("auditLog.subtitle")}
        meta={!isLoading && data ? t("mgmt.records", { count: String(data.length) }) : undefined}
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField value={search} onChange={setSearch} placeholder={t("auditLog.search")} />
        </ManagementToolbarRow>
      </ManagementToolbar>

      <ManagementDataTable
        loading={isLoading}
        data={filtered}
        emptyTitle={search ? t("auditLog.noResults") : t("auditLog.empty")}
        columns={columns}
        actions={(l) => <RowActionMenu actions={rowActions(l)} />}
        getRowHref={(l) => `/audit-log/${l.id}`}
        getRowLabel={(l) => `${l.action} · ${l.entity}`}
        mobileCard={{
          title: (l) => l.user?.name ?? l.user?.email ?? t("auditLog.system"),
          subtitle: (l) => (
            <span>
              {l.entity}
              {l.entityId && <span className="ms-1 text-muted">#{l.entityId.slice(0, 8)}</span>}
            </span>
          ),
          badges: (l) => <Badge variant="secondary">{l.action}</Badge>,
          fields: [
            {
              label: t("table.date"),
              value: (l) => formatDate(l.createdAt),
            },
          ],
        }}
      />
    </ManagementPageShell>
  );
}
