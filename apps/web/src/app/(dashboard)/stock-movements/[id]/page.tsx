"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { StockMovement, Warehouse } from "@ims/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useRecordPermissions } from "@/lib/record-permissions";
import { formatDate } from "@/lib/utils";
import { StatusBadge } from "@/components/management";
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

type StockMovementDetail = StockMovement & {
  fromWarehouse?: Warehouse | null;
  toWarehouse?: Warehouse | null;
  createdBy?: { id: string; name: string; email?: string } | null;
};

const MOVEMENT_TYPE_KEYS: Record<string, string> = {
  IN: "stockMovements.type.in",
  OUT: "stockMovements.type.out",
  TRANSFER: "stockMovements.type.transfer",
  ADJUSTMENT: "stockMovements.type.adjustment",
};

export default function StockMovementDetailsPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { t } = useI18n();
  const perms = useRecordPermissions("stock_movements");

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["stock-movements", id],
    queryFn: () => apiFetch<StockMovementDetail>(`/stock-movements/${id}`),
    enabled: Boolean(id) && perms.canView,
  });

  return (
    <PermissionGuard allowed={perms.canView} message={t("record.forbidden")}>
      {isLoading ? (
        <RecordLoadingState />
      ) : isError ? (
        (error instanceof ApiClientError && error.status === 404) ||
        (error instanceof Error && /not found/i.test(error.message)) ? (
          <RecordNotFoundState backHref="/stock-movements" />
        ) : (
          <RecordErrorState
            onRetry={() => refetch()}
            message={error instanceof Error ? error.message : undefined}
          />
        )
      ) : !data ? (
        <RecordNotFoundState backHref="/stock-movements" />
      ) : (
        <RecordDetailsShell>
          <DetailsHeader
            backHref="/stock-movements"
            title={data.product?.name ?? data.productId}
            subtitle={
              data.product?.sku ? (
                <span className="font-mono text-xs" dir="ltr">
                  {data.product.sku}
                </span>
              ) : undefined
            }
            status={data.type.toLowerCase()}
            statusLabel={t(MOVEMENT_TYPE_KEYS[data.type] ?? data.type)}
            meta={<>{t("record.createdAt")}: {formatDate(data.createdAt)}</>}
          />

          <div className="grid gap-5 lg:grid-cols-2">
            <DetailsSection title={t("record.identity")}>
              <MetadataList
                items={[
                  {
                    label: t("table.type"),
                    value: (
                      <StatusBadge
                        status={data.type.toLowerCase()}
                        label={t(MOVEMENT_TYPE_KEYS[data.type] ?? data.type)}
                      />
                    ),
                  },
                  {
                    label: t("table.qty"),
                    value: <span className="tabular-nums">{data.quantity}</span>,
                  },
                  {
                    label: t("table.product"),
                    value: data.product?.name ?? t("table.dash"),
                  },
                  {
                    label: t("table.warehouse"),
                    value: data.warehouse?.name ?? t("table.dash"),
                  },
                ]}
              />
            </DetailsSection>

            <DetailsSection title={t("record.metadata")}>
              <MetadataList
                items={[
                  ...(data.fromWarehouseId
                    ? [
                        {
                          label: t("stockMovements.fromWarehouse"),
                          value: data.fromWarehouse?.name ?? data.fromWarehouseId,
                        },
                      ]
                    : []),
                  ...(data.toWarehouseId
                    ? [
                        {
                          label: t("stockMovements.toWarehouse"),
                          value: data.toWarehouse?.name ?? data.toWarehouseId,
                        },
                      ]
                    : []),
                  {
                    label: t("table.reference"),
                    value: data.reference ?? t("table.dash"),
                    mono: Boolean(data.reference),
                  },
                  {
                    label: t("stockMovements.notes"),
                    value: data.notes ?? t("table.dash"),
                  },
                  {
                    label: t("stockMovements.by"),
                    value: data.createdBy?.name ?? t("table.dash"),
                  },
                  {
                    label: t("record.createdAt"),
                    value: formatDate(data.createdAt),
                  },
                ]}
              />
            </DetailsSection>
          </div>
        </RecordDetailsShell>
      )}
    </PermissionGuard>
  );
}
