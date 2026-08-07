"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supplierSchema } from "@ims/validation";
import type { Supplier } from "@ims/shared-types";
import { z } from "zod";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { filterBySearch, sortByDate } from "@/lib/list-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  FormGrid,
  FormField,
  FormLabel,
  FormError,
  type ManagementColumn,
  type RowActionItem,
} from "@/components/management";

type FormData = z.infer<typeof supplierSchema>;

export default function SuppliersPage() {
  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/suppliers"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(supplierSchema),
    defaultValues: { name: "", email: "", phone: "", address: "", contactPerson: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      editing
        ? apiFetch<Supplier>(`/suppliers/${editing.id}`, { method: "PUT", body: JSON.stringify(values) })
        : apiFetch<Supplier>("/suppliers", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: editing ? t("toast.supplierUpdated") : t("toast.supplierCreated") });
      setModalOpen(false);
      setEditing(null);
      form.reset();
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/suppliers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast({ title: t("toast.supplierDeleted") });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({
        title: t("toast.cannotDeleteSupplier"),
        description: msg,
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const list = filterBySearch(data ?? [], search, (s) => [s.name, s.email ?? "", s.contactPerson ?? ""]);
    return sortByDate(list, (s) => s.createdAt, "latest");
  }, [data, search]);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", email: "", phone: "", address: "", contactPerson: "" });
    setModalOpen(true);
  };

  const openEdit = (s: Supplier) => {
    setEditing(s);
    form.reset({
      name: s.name,
      email: s.email ?? "",
      phone: s.phone ?? "",
      address: s.address ?? "",
      contactPerson: s.contactPerson ?? "",
    });
    setModalOpen(true);
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !data) return;
    const record = data.find((s) => s.id === editId);
    if (record) openEdit(record);
    router.replace("/suppliers", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const columns: ManagementColumn<Supplier>[] = [
    {
      key: "name",
      header: t("table.name"),
      cell: (s) => <span className="font-medium">{s.name}</span>,
    },
    {
      key: "contact",
      header: t("table.contact"),
      hideBelow: "md",
      cell: (s) => s.contactPerson ?? t("table.dash"),
    },
    {
      key: "email",
      header: t("table.email"),
      cell: (s) => <span className="text-muted">{s.email ?? t("table.dash")}</span>,
    },
    {
      key: "phone",
      header: t("table.phone"),
      hideBelow: "lg",
      cell: (s) => s.phone ?? t("table.dash"),
    },
    {
      key: "count",
      header: t("table.products"),
      align: "end",
      cell: (s) => <span className="tabular-nums">{s.productCount ?? 0}</span>,
    },
  ];

  const rowActions = (s: Supplier): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/suppliers/${s.id}`),
    },
    {
      key: "edit",
      label: t("action.edit"),
      icon: <Pencil className="h-4 w-4" />,
      hidden: !canWrite("suppliers"),
      onSelect: () => openEdit(s),
    },
    {
      key: "delete",
      label: t("action.delete"),
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      hidden: !canWrite("suppliers"),
      onSelect: () => setDeleteTarget(s),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("suppliers.title")}
        description={t("suppliers.subtitle")}
        meta={!isLoading && data ? t("mgmt.records", { count: String(data.length) }) : undefined}
        actions={
          canWrite("suppliers") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("suppliers.add")}
            </Button>
          ) : undefined
        }
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField value={search} onChange={setSearch} placeholder={t("suppliers.search")} />
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
          emptyTitle={search ? t("mgmt.noResults") : t("suppliers.empty")}
          emptyAction={
            !search && canWrite("suppliers") ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("suppliers.add")}
              </Button>
            ) : undefined
          }
          columns={columns}
          actions={(s) => <RowActionMenu actions={rowActions(s)} />}
          getRowHref={(s) => `/suppliers/${s.id}`}
          getRowLabel={(s) => s.name}
          mobileCard={{
            title: (s) => s.name,
            subtitle: (s) => s.contactPerson ?? t("table.dash"),
            fields: [
              { label: t("table.email"), value: (s) => s.email ?? t("table.dash") },
              { label: t("table.phone"), value: (s) => s.phone ?? t("table.dash") },
              { label: t("table.products"), value: (s) => String(s.productCount ?? 0) },
            ],
          }}
        />
      )}

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="lg">
          <FormDialogHeader title={editing ? t("suppliers.edit") : t("suppliers.new")} />
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <FormDialogBody>
              <FormGrid cols={2}>
                <FormField>
                  <FormLabel required>{t("table.name")}</FormLabel>
                  <Input {...form.register("name")} />
                  <FormError>{form.formState.errors.name?.message}</FormError>
                </FormField>
                <FormField>
                  <FormLabel optional>{t("suppliers.contactPerson")}</FormLabel>
                  <Input {...form.register("contactPerson")} />
                  <FormError>{form.formState.errors.contactPerson?.message}</FormError>
                </FormField>
                <FormField>
                  <FormLabel optional>{t("table.email")}</FormLabel>
                  <Input type="email" {...form.register("email")} />
                  <FormError>{form.formState.errors.email?.message}</FormError>
                </FormField>
                <FormField>
                  <FormLabel optional>{t("table.phone")}</FormLabel>
                  <Input {...form.register("phone")} />
                  <FormError>{form.formState.errors.phone?.message}</FormError>
                </FormField>
                <FormField className="sm:col-span-2">
                  <FormLabel optional>{t("table.address")}</FormLabel>
                  <Input {...form.register("address")} />
                  <FormError>{form.formState.errors.address?.message}</FormError>
                </FormField>
              </FormGrid>
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
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title={t("suppliers.delete.title")}
        description={
          deleteTarget ? t("suppliers.delete.description", { name: deleteTarget.name }) : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </ManagementPageShell>
  );
}
