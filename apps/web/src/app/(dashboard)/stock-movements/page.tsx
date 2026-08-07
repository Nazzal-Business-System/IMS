"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { stockMovementSchema } from "@ims/validation";
import type { Product, StockMovement, Warehouse } from "@ims/shared-types";
import { z } from "zod";
import { Eye, Plus } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  ManagementPageShell,
  ManagementPageHeader,
  ManagementToolbar,
  ManagementToolbarRow,
  SearchField,
  ManagementDataTable,
  RowActionMenu,
  FormDialog,
  FormDialogContent,
  FormDialogHeader,
  FormDialogBody,
  FormDialogFooter,
  AsyncSubmitButton,
  FormSection,
  FormGrid,
  FormField,
  FormLabel,
  FormError,
  StatusBadge,
  type ManagementColumn,
  type RowActionItem,
} from "@/components/management";

type FormData = z.infer<typeof stockMovementSchema>;

const MOVEMENT_TYPE_KEYS: Record<string, string> = {
  IN: "stockMovements.type.in",
  OUT: "stockMovements.type.out",
  TRANSFER: "stockMovements.type.transfer",
  ADJUSTMENT: "stockMovements.type.adjustment",
};

const DEFAULT_VALUES: FormData = {
  productId: "",
  warehouseId: "",
  type: "IN",
  quantity: 1,
  reference: "",
  notes: "",
  fromWarehouseId: "",
  toWarehouseId: "",
};

export default function StockMovementsPage() {
  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => apiFetch<StockMovement[]>("/stock-movements?limit=100"),
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/products"),
    enabled: modalOpen,
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/warehouses"),
    enabled: modalOpen,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(stockMovementSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const movementType = form.watch("type");

  const createMutation = useMutation({
    mutationFn: (values: FormData) =>
      apiFetch<StockMovement>("/stock-movements", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-movements"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: t("toast.stockMovementRecorded") });
      setModalOpen(false);
      form.reset(DEFAULT_VALUES);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    },
  });

  const filtered = useMemo(
    () =>
      (data ?? []).filter(
        (m) =>
          !search ||
          (m.product?.name?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          (m.reference?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
          m.type.toLowerCase().includes(search.toLowerCase())
      ),
    [data, search]
  );

  const openCreate = () => {
    form.reset(DEFAULT_VALUES);
    setModalOpen(true);
  };

  const onSubmit = (values: FormData) => {
    const payload =
      values.type === "TRANSFER"
        ? { ...values, warehouseId: values.fromWarehouseId ?? values.warehouseId }
        : values;
    createMutation.mutate(payload);
  };

  const columns: ManagementColumn<StockMovement>[] = [
    {
      key: "date",
      header: t("table.date"),
      align: "end",
      hideBelow: "md",
      cell: (m) => <span className="text-muted tabular-nums">{formatDate(m.createdAt)}</span>,
    },
    {
      key: "product",
      header: t("table.product"),
      cell: (m) => <span className="font-medium">{m.product?.name ?? m.productId}</span>,
    },
    {
      key: "type",
      header: t("table.type"),
      cell: (m) => <StatusBadge status={m.type.toLowerCase()} label={t(MOVEMENT_TYPE_KEYS[m.type] ?? m.type)} />,
    },
    {
      key: "qty",
      header: t("table.qty"),
      align: "end",
      cell: (m) => <span className="tabular-nums">{m.quantity}</span>,
    },
    {
      key: "warehouse",
      header: t("table.warehouse"),
      hideBelow: "lg",
      cell: (m) => m.warehouse?.name ?? m.warehouseId,
    },
    {
      key: "reference",
      header: t("table.reference"),
      hideBelow: "lg",
      cell: (m) => <span className="text-muted">{m.reference ?? t("table.dash")}</span>,
    },
    {
      key: "by",
      header: t("stockMovements.by"),
      hideBelow: "md",
      cell: (m) => m.createdBy?.name ?? t("table.dash"),
    },
  ];

  const rowActions = (m: StockMovement): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/stock-movements/${m.id}`),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("stockMovements.title")}
        description={t("stockMovements.subtitle")}
        meta={
          !isLoading && data
            ? t("stockMovements.recordCount", { count: String(data.length) })
            : undefined
        }
        actions={
          canWrite("stock_movements") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("stockMovements.record")}
            </Button>
          ) : undefined
        }
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder={t("stockMovements.search")}
          />
        </ManagementToolbarRow>
      </ManagementToolbar>

      {isError ? (
        <div className="rounded-xl border border-border bg-card px-6 py-12 text-center">
          <p className="font-medium text-foreground">{t("mgmt.errorState")}</p>
          <Button type="button" variant="secondary" className="mt-4" onClick={() => refetch()}>
            {t("mgmt.retry")}
          </Button>
        </div>
      ) : (
        <ManagementDataTable
          loading={isLoading}
          data={filtered}
          emptyTitle={search ? t("stockMovements.noResults") : t("stockMovements.empty")}
          emptyAction={
            !search && canWrite("stock_movements") ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("stockMovements.record")}
              </Button>
            ) : undefined
          }
          columns={columns}
          actions={(m) => <RowActionMenu actions={rowActions(m)} />}
          getRowHref={(m) => `/stock-movements/${m.id}`}
          getRowLabel={(m) =>
            `${m.product?.name ?? m.productId} · ${t(MOVEMENT_TYPE_KEYS[m.type] ?? m.type)}`
          }
          mobileCard={{
            title: (m) => m.product?.name ?? m.productId,
            subtitle: (m) => (
              <span className="tabular-nums">
                {formatDate(m.createdAt)} · {t("table.qty")} {m.quantity}
              </span>
            ),
            badges: (m) => (
              <StatusBadge status={m.type.toLowerCase()} label={t(MOVEMENT_TYPE_KEYS[m.type] ?? m.type)} />
            ),
            fields: [
              { label: t("table.warehouse"), value: (m) => m.warehouse?.name ?? m.warehouseId },
              { label: t("table.reference"), value: (m) => m.reference ?? t("table.dash") },
              { label: t("stockMovements.by"), value: (m) => m.createdBy?.name ?? t("table.dash") },
            ],
          }}
        />
      )}

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="md" aria-describedby={undefined}>
          <FormDialogHeader
            title={t("stockMovements.new")}
            description={t("stockMovements.createDescription")}
          />
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={form.handleSubmit(onSubmit)}>
            <FormDialogBody className="space-y-6">
              <FormSection title={t("stockMovements.section.type")}>
                <FormGrid>
                  <FormField>
                    <FormLabel required>{t("table.type")}</FormLabel>
                    <Select {...form.register("type")}>
                      <option value="IN">{t("stockMovements.type.in")}</option>
                      <option value="OUT">{t("stockMovements.type.out")}</option>
                      <option value="TRANSFER">{t("stockMovements.type.transfer")}</option>
                      <option value="ADJUSTMENT">{t("stockMovements.type.adjustment")}</option>
                    </Select>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("stockMovements.section.details")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.product")}</FormLabel>
                    <Select {...form.register("productId")}>
                      <option value="">{t("table.select")}</option>
                      {products?.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.sku})
                        </option>
                      ))}
                    </Select>
                    <FormError>{form.formState.errors.productId?.message}</FormError>
                  </FormField>

                  {movementType !== "TRANSFER" && (
                    <FormField>
                      <FormLabel required>{t("table.warehouse")}</FormLabel>
                      <Select {...form.register("warehouseId")}>
                        <option value="">{t("table.select")}</option>
                        {warehouses?.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name}
                          </option>
                        ))}
                      </Select>
                      <FormError>{form.formState.errors.warehouseId?.message}</FormError>
                    </FormField>
                  )}

                  {movementType === "TRANSFER" && (
                    <>
                      <FormField>
                        <FormLabel required>{t("stockMovements.fromWarehouse")}</FormLabel>
                        <Select {...form.register("fromWarehouseId")}>
                          <option value="">{t("table.select")}</option>
                          {warehouses?.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                      <FormField>
                        <FormLabel required>{t("stockMovements.toWarehouse")}</FormLabel>
                        <Select {...form.register("toWarehouseId")}>
                          <option value="">{t("table.select")}</option>
                          {warehouses?.map((w) => (
                            <option key={w.id} value={w.id}>
                              {w.name}
                            </option>
                          ))}
                        </Select>
                      </FormField>
                    </>
                  )}

                  <FormField>
                    <FormLabel required>{t("table.quantity")}</FormLabel>
                    <Input type="number" min={1} {...form.register("quantity")} />
                    <FormError>{form.formState.errors.quantity?.message}</FormError>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("stockMovements.section.additional")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel optional>{t("stockMovements.reference")}</FormLabel>
                    <Input {...form.register("reference")} />
                  </FormField>
                  <FormField className="sm:col-span-2">
                    <FormLabel optional>{t("stockMovements.notes")}</FormLabel>
                    <Input {...form.register("notes")} />
                  </FormField>
                </FormGrid>
              </FormSection>
            </FormDialogBody>

            <FormDialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={createMutation.isPending}
              >
                {t("action.cancel")}
              </Button>
              <AsyncSubmitButton loading={createMutation.isPending} loadingLabel={t("loading.saving")}>
                {t("action.save")}
              </AsyncSubmitButton>
            </FormDialogFooter>
          </form>
        </FormDialogContent>
      </FormDialog>
    </ManagementPageShell>
  );
}
