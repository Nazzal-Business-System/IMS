"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { AuditLog } from "@ims/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRecordPermissions } from "@/lib/record-permissions";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  PermissionGuard,
  RecordDetailsShell,
  DetailsHeader,
  DetailsSection,
  MetadataList,
  RecordLoadingState,
  RecordNotFoundState,
  RecordErrorState,
} from "@/components/records";

const ENTITY_ROUTES: Record<string, string> = {
  Product: "/products",
  Category: "/categories",
  Warehouse: "/warehouses",
  Supplier: "/suppliers",
  UnitOfMeasure: "/units",
  ReorderRule: "/reorder-rules",
  StockMovement: "/stock-movements",
  PurchaseOrder: "/purchase-orders",
  User: "/admin/users",
};

export default function AuditLogDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const perms = useRecordPermissions("audit_log");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["audit-logs", id],
    queryFn: () => apiFetch<AuditLog>(`/audit-logs/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  const entityRoute = data?.entityId ? ENTITY_ROUTES[data.entity] : undefined;

  return (
    <PermissionGuard allowed={perms.canView} message={t("record.forbidden")}>
      {isLoading ? (
        <RecordLoadingState />
      ) : isError ? (
        (error instanceof ApiClientError && error.status === 404) ||
        (error instanceof Error && /not found/i.test(error.message)) ? (
          <RecordNotFoundState backHref="/audit-log" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/audit-log" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/audit-log"
            title={data.action}
            subtitle={data.entity}
            meta={<>{t("record.createdAt")}: {formatDate(data.createdAt)}</>}
          />

          <DetailsSection title={t("record.identity")}>
            <MetadataList
              items={[
                {
                  label: t("table.user"),
                  value: data.user?.name ?? data.user?.email ?? t("auditLog.system"),
                },
                { label: t("table.action"), value: <Badge variant="secondary">{data.action}</Badge> },
                {
                  label: t("table.entity"),
                  value: data.entity,
                },
                {
                  label: t("table.entity") + " ID",
                  value: data.entityId ? (
                    entityRoute ? (
                      <Link href={`${entityRoute}/${data.entityId}`} className="text-accent hover:underline">
                        <span className="font-mono text-xs" dir="ltr">
                          {data.entityId}
                        </span>
                      </Link>
                    ) : (
                      <span className="font-mono text-xs" dir="ltr">
                        {data.entityId}
                      </span>
                    )
                  ) : (
                    t("table.dash")
                  ),
                  mono: !entityRoute && Boolean(data.entityId),
                },
                {
                  label: t("record.createdAt"),
                  value: formatDate(data.createdAt),
                },
              ]}
            />
          </DetailsSection>

          <DetailsSection title={t("table.description")}>
            {data.details ? (
              <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-[var(--muted-bg)]/30 p-3 text-xs text-foreground">
                {JSON.stringify(data.details, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-muted">{t("auditLog.noDetails")}</p>
            )}
          </DetailsSection>
        </RecordDetailsShell>
      )}
    </PermissionGuard>
  );
}
