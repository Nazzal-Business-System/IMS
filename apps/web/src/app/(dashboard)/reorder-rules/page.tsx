"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { reorderRuleSchema } from "@ims/validation";
import type { ReorderRule, Product, GenerateDraftPosResponse } from "@ims/shared-types";
import { z } from "zod";
import { Pencil, Plus, Trash2, AlertTriangle, Eye, FilePlus, Loader2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/loading";
import {
  ManagementPageShell,
  ManagementPageHeader,
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
  FormHint,
  StatusBadge,
  type ManagementColumn,
  type RowActionItem,
} from "@/components/management";

type FormData = z.infer<typeof reorderRuleSchema>;

const DEFAULT_VALUES: FormData = {
  productId: "",
  minQuantity: 0,
  maxQuantity: null,
  autoPo: false,
  isActive: true,
};

export default function ReorderRulesPage() {
  const { canRead, canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReorderRule | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReorderRule | null>(null);
  const [showAlerts, setShowAlerts] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["reorder-rules"],
    queryFn: () => apiFetch<ReorderRule[]>("/reorder-rules"),
    enabled: canRead("reorder_rules"),
  });

  const { data: alerts } = useQuery({
    queryKey: ["reorder-alerts"],
    queryFn: () => apiFetch<{ products: Product[] }>("/reorder-rules/alerts"),
    enabled: canRead("reorder_rules"),
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/products"),
    enabled: canWrite("reorder_rules") && modalOpen,
  });

  const form = useForm<FormData>({
    resolver: zodResolver(reorderRuleSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const autoPo = form.watch("autoPo");
  const isActive = form.watch("isActive");

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      editing
        ? apiFetch<ReorderRule>(`/reorder-rules/${editing.id}`, { method: "PUT", body: JSON.stringify(values) })
        : apiFetch<ReorderRule>("/reorder-rules", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
      toast({ title: editing ? t("toast.ruleUpdated") : t("toast.ruleCreated") });
      setModalOpen(false);
      setEditing(null);
      form.reset(DEFAULT_VALUES);
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/reorder-rules/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reorder-rules"] });
      toast({ title: t("toast.ruleDeleted") });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
    },
  });

  const generateDraftPosMutation = useMutation({
    mutationFn: () =>
      apiFetch<GenerateDraftPosResponse>("/reorder-rules/generate-draft-pos", { method: "POST" }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({
        title: t("reorderRules.generateDraftPos"),
        description: t("reorderRules.generateDraftPosSuccess", {
          created: result.created,
          skipped: result.skipped,
        }),
      });
    },
    onError: (err: Error) => {
      toast({
        title: t("toast.error"),
        description: err instanceof ApiClientError ? err.message : err.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !data) return;
    const record = data.find((r) => r.id === editId);
    if (record) {
      setEditing(record);
      form.reset({
        productId: record.productId,
        minQuantity: record.minQuantity,
        maxQuantity: record.maxQuantity,
        autoPo: record.autoPo,
        isActive: record.isActive,
      });
      setModalOpen(true);
    }
    router.replace("/reorder-rules", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (!canRead("reorder_rules")) {
    return <EmptyState title={t("access.denied")} description={t("access.reorderRules")} />;
  }

  const openCreate = () => {
    setEditing(null);
    form.reset(DEFAULT_VALUES);
    setModalOpen(true);
  };

  const openEdit = (rule: ReorderRule) => {
    setEditing(rule);
    form.reset({
      productId: rule.productId,
      minQuantity: rule.minQuantity,
      maxQuantity: rule.maxQuantity,
      autoPo: rule.autoPo,
      isActive: rule.isActive,
    });
    setModalOpen(true);
  };

  const alertCount = alerts?.products.length ?? 0;

  const columns: ManagementColumn<ReorderRule>[] = [
    {
      key: "product",
      header: t("table.product"),
      cell: (r) => <span className="font-medium">{r.product?.name ?? r.productId}</span>,
    },
    {
      key: "min",
      header: t("table.minQty"),
      align: "end",
      cell: (r) => <span className="tabular-nums">{r.minQuantity}</span>,
    },
    {
      key: "max",
      header: t("table.maxQty"),
      align: "end",
      cell: (r) => <span className="tabular-nums">{r.maxQuantity ?? t("table.dash")}</span>,
    },
    {
      key: "autoPo",
      header: t("table.autoPo"),
      cell: (r) => (
        <Badge variant={r.autoPo ? "success" : "secondary"}>
          {r.autoPo ? t("status.yes") : t("status.no")}
        </Badge>
      ),
    },
    {
      key: "active",
      header: t("table.status"),
      cell: (r) => (
        <StatusBadge
          status={r.isActive ? "active" : "inactive"}
          label={r.isActive ? t("status.active") : t("status.inactive")}
        />
      ),
    },
  ];

  const rowActions = (r: ReorderRule): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/reorder-rules/${r.id}`),
    },
    {
      key: "edit",
      label: t("action.edit"),
      icon: <Pencil className="h-4 w-4" />,
      hidden: !canWrite("reorder_rules"),
      onSelect: () => openEdit(r),
    },
    {
      key: "delete",
      label: t("action.delete"),
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      hidden: !canWrite("reorder_rules"),
      onSelect: () => setDeleteTarget(r),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("reorderRules.title")}
        description={t("reorderRules.subtitle")}
        meta={
          !isLoading && data
            ? t("reorderRules.recordCount", { count: String(data.length) })
            : undefined
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowAlerts(!showAlerts)}>
              <AlertTriangle className="h-4 w-4" />
              {t("reorderRules.alerts", { count: alertCount })}
            </Button>
            {canWrite("reorder_rules") && (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("reorderRules.add")}
              </Button>
            )}
          </div>
        }
      />

      {showAlerts && (
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                {t("dashboard.lowStock.title")}
              </CardTitle>
              {canWrite("purchase_orders") && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={generateDraftPosMutation.isPending}
                  onClick={() => generateDraftPosMutation.mutate()}
                >
                  {generateDraftPosMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FilePlus className="h-4 w-4" />
                  )}
                  {t("reorderRules.generateDraftPos")}
                </Button>
              )}
            </div>
            {canWrite("purchase_orders") && (
              <p className="text-xs text-muted">{t("reorderRules.generateDraftPosHint")}</p>
            )}
          </CardHeader>
          <CardContent>
            {!alertCount ? (
              <EmptyState title={t("empty.allStockedUp")} description={t("empty.noProductsBelowReorder")} />
            ) : (
              <div className="space-y-2">
                {alerts?.products.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted">{p.sku}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="warning">{t("reorderRules.qtyLabel", { qty: p.quantity })}</Badge>
                      <span className="text-xs text-muted">
                        {t("reorderRules.reorderLabel", { level: p.reorderLevel })}
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href="/products">{t("action.view")}</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <ManagementDataTable
        loading={isLoading}
        data={data ?? []}
        emptyTitle={t("reorderRules.empty")}
        emptyAction={
          canWrite("reorder_rules") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("reorderRules.add")}
            </Button>
          ) : undefined
        }
        columns={columns}
        actions={(r) => <RowActionMenu actions={rowActions(r)} />}
        getRowHref={(r) => `/reorder-rules/${r.id}`}
        getRowLabel={(r) => r.product?.name ?? r.productId}
        mobileCard={{
          title: (r) => r.product?.name ?? r.productId,
          subtitle: (r) => (
            <span className="tabular-nums">
              {t("table.minQty")} {r.minQuantity} · {t("table.maxQty")} {r.maxQuantity ?? t("table.dash")}
            </span>
          ),
          badges: (r) => (
            <>
              <StatusBadge
                status={r.isActive ? "active" : "inactive"}
                label={r.isActive ? t("status.active") : t("status.inactive")}
              />
              <Badge variant={r.autoPo ? "success" : "secondary"}>
                {r.autoPo ? t("status.yes") : t("status.no")}
              </Badge>
            </>
          ),
        }}
      />

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="md" aria-describedby={undefined}>
          <FormDialogHeader
            title={editing ? t("reorderRules.edit") : t("reorderRules.new")}
            description={editing ? t("reorderRules.editDescription") : t("reorderRules.createDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <FormDialogBody className="space-y-6">
              <FormSection title={t("reorderRules.section.assignment")}>
                <FormGrid cols={2}>
                  {!editing && (
                    <FormField className="sm:col-span-2">
                      <FormLabel required>{t("table.product")}</FormLabel>
                      <Select {...form.register("productId")}>
                        <option value="">{t("reorderRules.selectProduct")}</option>
                        {products?.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.sku})
                          </option>
                        ))}
                      </Select>
                      <FormError>{form.formState.errors.productId?.message}</FormError>
                    </FormField>
                  )}
                  <FormField>
                    <FormLabel required>{t("reorderRules.minQuantity")}</FormLabel>
                    <Input type="number" min={0} {...form.register("minQuantity", { valueAsNumber: true })} />
                    <FormError>{form.formState.errors.minQuantity?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel optional>{t("reorderRules.maxQuantity")}</FormLabel>
                    <Input type="number" min={0} {...form.register("maxQuantity", { valueAsNumber: true })} />
                    <FormError>{form.formState.errors.maxQuantity?.message}</FormError>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("reorderRules.section.automation")}>
                <div className="space-y-4">
                  <FormField>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 p-3">
                      <div className="min-w-0">
                        <FormLabel htmlFor="autoPo">{t("reorderRules.autoPo")}</FormLabel>
                        <FormHint>{t("reorderRules.autoPoHint")}</FormHint>
                      </div>
                      <Switch
                        id="autoPo"
                        checked={!!autoPo}
                        onCheckedChange={(checked) => form.setValue("autoPo", checked, { shouldDirty: true })}
                        aria-label={t("reorderRules.autoPo")}
                      />
                    </div>
                  </FormField>
                  <FormField>
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 p-3">
                      <FormLabel htmlFor="isActive">{t("status.active")}</FormLabel>
                      <Switch
                        id="isActive"
                        checked={!!isActive}
                        onCheckedChange={(checked) => form.setValue("isActive", checked, { shouldDirty: true })}
                        aria-label={t("status.active")}
                      />
                    </div>
                  </FormField>
                </div>
              </FormSection>
            </FormDialogBody>

            <FormDialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={saveMutation.isPending}
              >
                {t("action.cancel")}
              </Button>
              <AsyncSubmitButton loading={saveMutation.isPending} loadingLabel={t("loading.saving")}>
                {t("action.save")}
              </AsyncSubmitButton>
            </FormDialogFooter>
          </form>
        </FormDialogContent>
      </FormDialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title={t("reorderRules.delete.title")}
        description={
          deleteTarget
            ? t("reorderRules.delete.description", { name: deleteTarget.product?.name ?? deleteTarget.productId })
            : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </ManagementPageShell>
  );
}
