"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { categorySchema } from "@ims/validation";
import type { Category } from "@ims/shared-types";
import { z } from "zod";
import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { filterBySearch, sortByDate, sortByString } from "@/lib/list-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  ManagementPageShell,
  ManagementPageHeader,
  ManagementToolbar,
  ManagementToolbarRow,
  SearchField,
  FilterSelect,
  ManagementDataTable,
  RowActionMenu,
  FormDialog,
  FormDialogContent,
  FormDialogHeader,
  FormDialogBody,
  FormDialogFooter,
  AsyncSubmitButton,
  FormField,
  FormLabel,
  FormError,
  type ManagementColumn,
  type RowActionItem,
} from "@/components/management";

type FormData = z.infer<typeof categorySchema>;

export default function CategoriesPage() {
  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "", description: "" },
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) =>
      editing
        ? apiFetch<Category>(`/categories/${editing.id}`, { method: "PUT", body: JSON.stringify(values) })
        : apiFetch<Category>("/categories", { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: editing ? t("toast.categoryUpdated") : t("toast.categoryCreated") });
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
    mutationFn: (id: string) => apiFetch(`/categories/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: t("toast.categoryDeleted") });
      setDeleteTarget(null);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({
        title: t("toast.cannotDeleteCategory"),
        description: msg,
        variant: "destructive",
      });
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => {
    const list = filterBySearch(data ?? [], search, (c) => [c.name, c.description ?? ""]);
    if (sort === "name-asc") return sortByString(list, (c) => c.name, "asc");
    if (sort === "name-desc") return sortByString(list, (c) => c.name, "desc");
    if (sort === "oldest") return sortByDate(list, (c) => c.createdAt, "oldest");
    return sortByDate(list, (c) => c.createdAt, "latest");
  }, [data, search, sort]);

  const openCreate = () => {
    setEditing(null);
    form.reset({ name: "", description: "" });
    setModalOpen(true);
  };

  const openEdit = (cat: Category) => {
    setEditing(cat);
    form.reset({ name: cat.name, description: cat.description ?? "" });
    setModalOpen(true);
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !data) return;
    const record = data.find((c) => c.id === editId);
    if (record) openEdit(record);
    router.replace("/categories", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const columns: ManagementColumn<Category>[] = [
    {
      key: "name",
      header: t("table.name"),
      cell: (c) => <span className="font-medium">{c.name}</span>,
    },
    {
      key: "description",
      header: t("table.description"),
      hideBelow: "md",
      cell: (c) => <span className="text-muted">{c.description ?? t("table.dash")}</span>,
    },
    {
      key: "count",
      header: t("table.products"),
      align: "end",
      cell: (c) => <span className="tabular-nums">{c.productCount ?? 0}</span>,
    },
  ];

  const rowActions = (c: Category): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/categories/${c.id}`),
    },
    {
      key: "edit",
      label: t("action.edit"),
      icon: <Pencil className="h-4 w-4" />,
      hidden: !canWrite("categories"),
      onSelect: () => openEdit(c),
    },
    {
      key: "delete",
      label: t("action.delete"),
      icon: <Trash2 className="h-4 w-4" />,
      destructive: true,
      hidden: !canWrite("categories"),
      onSelect: () => setDeleteTarget(c),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("categories.title")}
        description={t("categories.subtitle")}
        meta={!isLoading && data ? t("mgmt.records", { count: String(data.length) }) : undefined}
        actions={
          canWrite("categories") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("categories.add")}
            </Button>
          ) : undefined
        }
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField value={search} onChange={setSearch} placeholder={t("categories.search")} />
          <FilterSelect label={t("filter.sort")} value={sort} onChange={setSort}>
            <option value="latest">{t("sort.latest")}</option>
            <option value="oldest">{t("sort.oldest")}</option>
            <option value="name-asc">{t("sort.nameAsc")}</option>
            <option value="name-desc">{t("sort.nameDesc")}</option>
          </FilterSelect>
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
          emptyTitle={search ? t("mgmt.noResults") : t("categories.empty")}
          emptyAction={
            !search && canWrite("categories") ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("categories.add")}
              </Button>
            ) : undefined
          }
          columns={columns}
          actions={(c) => <RowActionMenu actions={rowActions(c)} />}
          getRowHref={(c) => `/categories/${c.id}`}
          getRowLabel={(c) => c.name}
          mobileCard={{
            title: (c) => c.name,
            subtitle: (c) => c.description ?? t("table.dash"),
            fields: [
              {
                label: t("table.products"),
                value: (c) => String(c.productCount ?? 0),
              },
            ],
          }}
        />
      )}

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="sm">
          <FormDialogHeader title={editing ? t("categories.edit") : t("categories.new")} />
          <form onSubmit={form.handleSubmit((v) => saveMutation.mutate(v))}>
            <FormDialogBody className="space-y-4">
              <FormField>
                <FormLabel required>{t("table.name")}</FormLabel>
                <Input {...form.register("name")} />
                <FormError>{form.formState.errors.name?.message}</FormError>
              </FormField>
              <FormField>
                <FormLabel optional>{t("table.description")}</FormLabel>
                <Input {...form.register("description")} />
                <FormError>{form.formState.errors.description?.message}</FormError>
              </FormField>
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
        title={t("categories.delete.title")}
        description={
          deleteTarget ? t("categories.delete.description", { name: deleteTarget.name }) : undefined
        }
        loading={deleteMutation.isPending}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
      />
    </ManagementPageShell>
  );
}
