"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@ims/validation";
import type { Category, Product, Supplier, Warehouse } from "@ims/shared-types";
import { z } from "zod";
import { Archive, ArchiveRestore, Eye, Pencil, Plus } from "lucide-react";
import { apiFetch, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { filterBySearch, sortByDate, sortByString, sortByNumber } from "@/lib/list-controls";
import { buildProductWritePayload, displayOptionalText } from "@/lib/product-payload";
import {
  ManagementPageShell,
  ManagementPageHeader,
  ManagementToolbar,
  ManagementToolbarRow,
  SearchField,
  FilterSelect,
  ActiveFilters,
  ManagementDataTable,
  NumericRangeFilter,
  FilterToggle,
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

type FormData = z.infer<typeof productSchema>;

const DEFAULT_VALUES: FormData = {
  name: "",
  sku: "",
  barcode: "",
  categoryId: "",
  supplierId: "",
  costPrice: 0,
  sellingPrice: 0,
  quantity: 0,
  reorderLevel: 0,
  warehouseId: "",
  status: "active",
};

export default function ProductsPage() {
  const { canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("latest");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [qtyMin, setQtyMin] = useState("");
  const [qtyMax, setQtyMax] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [clearBarcode, setClearBarcode] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Product | null>(null);

  const { data: products, isLoading, isError, refetch } = useQuery({
    queryKey: ["products"],
    queryFn: () => apiFetch<Product[]>("/products"),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiFetch<Category[]>("/categories"),
  });

  const { data: suppliers } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => apiFetch<Supplier[]>("/suppliers"),
  });

  const { data: warehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: () => apiFetch<Warehouse[]>("/warehouses"),
  });

  const form = useForm<FormData>({
    resolver: zodResolver(productSchema),
    defaultValues: DEFAULT_VALUES,
  });

  const saveMutation = useMutation({
    mutationFn: (values: FormData) => {
      const payload = buildProductWritePayload(values, editing ? "update" : "create", {
        clearBarcode: editing ? clearBarcode : false,
      });
      return editing
        ? apiFetch<Product>(`/products/${editing.id}`, {
            method: "PUT",
            body: JSON.stringify(payload),
          })
        : apiFetch<Product>("/products", {
            method: "POST",
            body: JSON.stringify(payload),
          });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: editing ? t("toast.productUpdated") : t("toast.productCreated") });
      setModalOpen(false);
      setEditing(null);
      setClearBarcode(false);
      form.reset(DEFAULT_VALUES);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "archived" | "active" }) =>
      apiFetch<Product>(`/products/${id}/archive`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: status === "archived" ? t("toast.productArchived") : t("toast.productRestored") });
      setArchiveTarget(null);
    },
    onError: (err: Error) => {
      const msg = err instanceof ApiClientError ? err.message : err.message;
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
      setArchiveTarget(null);
    },
  });

  const filtered = useMemo(() => {
    let list = products ?? [];
    list = filterBySearch(list, search, (p) => [
      p.name,
      p.sku,
      p.barcode ?? "",
      p.category?.name ?? "",
      p.supplier?.name ?? "",
    ]);
    if (categoryFilter !== "all") list = list.filter((p) => p.categoryId === categoryFilter);
    if (supplierFilter !== "all") list = list.filter((p) => p.supplierId === supplierFilter);
    if (warehouseFilter !== "all") list = list.filter((p) => p.warehouseId === warehouseFilter);
    if (statusFilter !== "all") list = list.filter((p) => p.status === statusFilter);
    if (lowStockOnly) list = list.filter((p) => p.quantity <= p.reorderLevel);
    if (qtyMin) list = list.filter((p) => p.quantity >= Number(qtyMin));
    if (qtyMax) list = list.filter((p) => p.quantity <= Number(qtyMax));
    if (priceMin) list = list.filter((p) => p.sellingPrice >= Number(priceMin));
    if (priceMax) list = list.filter((p) => p.sellingPrice <= Number(priceMax));

    switch (sort) {
      case "oldest":
        return sortByDate(list, (p) => p.updatedAt ?? p.createdAt, "oldest");
      case "name-asc":
        return sortByString(list, (p) => p.name, "asc");
      case "name-desc":
        return sortByString(list, (p) => p.name, "desc");
      case "qty-high":
        return sortByNumber(list, (p) => p.quantity, "high");
      case "qty-low":
        return sortByNumber(list, (p) => p.quantity, "low");
      case "cost-high":
        return sortByNumber(list, (p) => p.costPrice, "high");
      case "price-high":
        return sortByNumber(list, (p) => p.sellingPrice, "high");
      default:
        return sortByDate(list, (p) => p.updatedAt ?? p.createdAt, "latest");
    }
  }, [
    products,
    search,
    sort,
    categoryFilter,
    supplierFilter,
    warehouseFilter,
    statusFilter,
    lowStockOnly,
    qtyMin,
    qtyMax,
    priceMin,
    priceMax,
  ]);

  const activeFilterCount =
    (categoryFilter !== "all" ? 1 : 0) +
    (supplierFilter !== "all" ? 1 : 0) +
    (warehouseFilter !== "all" ? 1 : 0) +
    (statusFilter !== "all" ? 1 : 0) +
    (lowStockOnly ? 1 : 0) +
    (qtyMin || qtyMax ? 1 : 0) +
    (priceMin || priceMax ? 1 : 0);

  const clearAllFilters = () => {
    setCategoryFilter("all");
    setSupplierFilter("all");
    setWarehouseFilter("all");
    setStatusFilter("all");
    setLowStockOnly(false);
    setQtyMin("");
    setQtyMax("");
    setPriceMin("");
    setPriceMax("");
    setSort("latest");
  };

  const filterChips = useMemo(() => {
    const chips: { key: string; label: string }[] = [];
    if (categoryFilter !== "all") {
      const name = categories?.find((c) => c.id === categoryFilter)?.name ?? categoryFilter;
      chips.push({ key: "category", label: `${t("filter.category")}: ${name}` });
    }
    if (supplierFilter !== "all") {
      const name = suppliers?.find((s) => s.id === supplierFilter)?.name ?? supplierFilter;
      chips.push({ key: "supplier", label: `${t("filter.supplier")}: ${name}` });
    }
    if (warehouseFilter !== "all") {
      const name = warehouses?.find((w) => w.id === warehouseFilter)?.name ?? warehouseFilter;
      chips.push({ key: "warehouse", label: `${t("filter.warehouse")}: ${name}` });
    }
    if (statusFilter !== "all") {
      chips.push({ key: "status", label: `${t("filter.status")}: ${t(`status.${statusFilter}`)}` });
    }
    if (lowStockOnly) {
      chips.push({ key: "lowStock", label: t("products.lowStockOnly") });
    }
    if (qtyMin || qtyMax) {
      chips.push({
        key: "qtyRange",
        label: `${t("table.qty")}: ${qtyMin || "0"}\u2013${qtyMax || "\u221e"}`,
      });
    }
    if (priceMin || priceMax) {
      chips.push({
        key: "priceRange",
        label: `${t("table.price")}: ${priceMin || "0"}\u2013${priceMax || "\u221e"}`,
      });
    }
    return chips;
  }, [
    categoryFilter,
    supplierFilter,
    warehouseFilter,
    statusFilter,
    lowStockOnly,
    qtyMin,
    qtyMax,
    priceMin,
    priceMax,
    categories,
    suppliers,
    warehouses,
    t,
  ]);

  const removeFilterChip = (key: string) => {
    switch (key) {
      case "category":
        setCategoryFilter("all");
        break;
      case "supplier":
        setSupplierFilter("all");
        break;
      case "warehouse":
        setWarehouseFilter("all");
        break;
      case "status":
        setStatusFilter("all");
        break;
      case "lowStock":
        setLowStockOnly(false);
        break;
      case "qtyRange":
        setQtyMin("");
        setQtyMax("");
        break;
      case "priceRange":
        setPriceMin("");
        setPriceMax("");
        break;
    }
  };

  const openCreate = () => {
    setEditing(null);
    setClearBarcode(false);
    form.reset(DEFAULT_VALUES);
    setModalOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setClearBarcode(false);
    form.reset({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode ?? "",
      categoryId: p.categoryId,
      supplierId: p.supplierId,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      quantity: p.quantity,
      reorderLevel: p.reorderLevel,
      warehouseId: p.warehouseId,
      status: p.status === "archived" ? "inactive" : p.status,
    });
    setModalOpen(true);
  };

  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !products) return;
    const record = products.find((p) => p.id === editId);
    if (record) openEdit(record);
    router.replace("/products", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products]);

  const archiveAction = archiveTarget
    ? archiveTarget.status === "archived"
      ? { status: "active" as const, label: t("products.restore.title"), confirm: t("action.restore") }
      : { status: "archived" as const, label: t("products.archive.title"), confirm: t("action.archive") }
    : null;

  const hasActiveFilters = !!search || activeFilterCount > 0;

  const columns: ManagementColumn<Product>[] = [
    {
      key: "name",
      header: t("table.name"),
      cell: (p) => <span className="font-medium">{p.name}</span>,
    },
    {
      key: "sku",
      header: t("table.sku"),
      hideBelow: "md",
      cell: (p) => <span className="text-muted">{p.sku}</span>,
    },
    {
      key: "barcode",
      header: t("table.barcode"),
      hideBelow: "lg",
      cell: (p) => {
        const barcode = displayOptionalText(p.barcode);
        return barcode ? (
          <span className="font-mono text-muted" dir="ltr">
            {barcode}
          </span>
        ) : (
          <span className="text-muted">{t("table.dash")}</span>
        );
      },
    },
    {
      key: "category",
      header: t("table.category"),
      hideBelow: "md",
      cell: (p) => p.category?.name ?? t("table.dash"),
    },
    {
      key: "qty",
      header: t("table.qty"),
      align: "end",
      cell: (p) =>
        p.status !== "archived" && p.quantity <= p.reorderLevel ? (
          <Badge variant="warning">{p.quantity}</Badge>
        ) : (
          <span className="tabular-nums">{p.quantity}</span>
        ),
    },
    {
      key: "cost",
      header: t("table.cost"),
      align: "end",
      hideBelow: "lg",
      cell: (p) => <span className="tabular-nums">{formatCurrency(p.costPrice)}</span>,
    },
    {
      key: "price",
      header: t("table.price"),
      align: "end",
      cell: (p) => <span className="font-medium tabular-nums">{formatCurrency(p.sellingPrice)}</span>,
    },
    {
      key: "status",
      header: t("table.status"),
      cell: (p) => <StatusBadge status={p.status} label={t(`status.${p.status}`)} />,
    },
  ];

  const rowActions = (p: Product): RowActionItem[] => [
    {
      key: "view",
      label: t("action.view"),
      icon: <Eye className="h-4 w-4" />,
      onSelect: () => router.push(`/products/${p.id}`),
    },
    {
      key: "edit",
      label: t("action.edit"),
      icon: <Pencil className="h-4 w-4" />,
      hidden: !canWrite("products"),
      onSelect: () => openEdit(p),
    },
    {
      key: "archive",
      label: p.status === "archived" ? t("action.restore") : t("action.archive"),
      icon:
        p.status === "archived" ? (
          <ArchiveRestore className="h-4 w-4" />
        ) : (
          <Archive className="h-4 w-4" />
        ),
      hidden: !canWrite("products"),
      onSelect: () => setArchiveTarget(p),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader
        title={t("products.title")}
        description={t("products.subtitle")}
        meta={
          !isLoading && products
            ? t("products.recordCount", { count: String(products.length) })
            : undefined
        }
        actions={
          canWrite("products") ? (
            <Button type="button" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t("products.add")}
            </Button>
          ) : undefined
        }
      />

      <ManagementToolbar>
        <ManagementToolbarRow>
          <SearchField value={search} onChange={setSearch} placeholder={t("products.search")} />
          <FilterSelect label={t("filter.sort")} value={sort} onChange={setSort}>
            <option value="latest">{t("sort.latest")}</option>
            <option value="oldest">{t("sort.oldest")}</option>
            <option value="name-asc">{t("sort.nameAsc")}</option>
            <option value="name-desc">{t("sort.nameDesc")}</option>
            <option value="qty-high">{t("sort.qtyHigh")}</option>
            <option value="qty-low">{t("sort.qtyLow")}</option>
            <option value="cost-high">{t("sort.costHigh")}</option>
            <option value="price-high">{t("sort.priceHigh")}</option>
          </FilterSelect>
          <FilterSelect label={t("filter.category")} value={categoryFilter} onChange={setCategoryFilter}>
            <option value="all">{t("filter.all")}</option>
            {categories?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t("filter.supplier")} value={supplierFilter} onChange={setSupplierFilter}>
            <option value="all">{t("filter.all")}</option>
            {suppliers?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t("filter.warehouse")} value={warehouseFilter} onChange={setWarehouseFilter}>
            <option value="all">{t("filter.all")}</option>
            {warehouses?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label={t("filter.status")} value={statusFilter} onChange={setStatusFilter}>
            <option value="all">{t("filter.all")}</option>
            <option value="active">{t("status.active")}</option>
            <option value="inactive">{t("status.inactive")}</option>
            <option value="discontinued">{t("status.discontinued")}</option>
            <option value="archived">{t("status.archived")}</option>
          </FilterSelect>
          <NumericRangeFilter
            groupLabel={t("products.filter.quantity")}
            minPlaceholder={t("products.filter.qtyMinPlaceholder")}
            maxPlaceholder={t("products.filter.qtyMaxPlaceholder")}
            minValue={qtyMin}
            maxValue={qtyMax}
            onMinChange={setQtyMin}
            onMaxChange={setQtyMax}
          />
          <NumericRangeFilter
            groupLabel={t("products.filter.price")}
            minPlaceholder={t("products.filter.priceMinPlaceholder")}
            maxPlaceholder={t("products.filter.priceMaxPlaceholder")}
            minValue={priceMin}
            maxValue={priceMax}
            onMinChange={setPriceMin}
            onMaxChange={setPriceMax}
            allowDecimal
          />
          <FilterToggle
            pressed={lowStockOnly}
            onPressedChange={setLowStockOnly}
            label={t("products.lowStockOnly")}
            className="lg:mb-0"
          />
        </ManagementToolbarRow>
        <ActiveFilters
          chips={filterChips}
          onRemove={removeFilterChip}
          onClearAll={activeFilterCount > 0 ? clearAllFilters : undefined}
        />
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
          emptyTitle={hasActiveFilters ? t("products.noResults") : t("products.empty")}
          emptyAction={
            !hasActiveFilters && canWrite("products") ? (
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t("products.add")}
              </Button>
            ) : undefined
          }
          columns={columns}
          actions={(p) => <RowActionMenu actions={rowActions(p)} />}
          getRowHref={(p) => `/products/${p.id}`}
          getRowLabel={(p) => p.name}
          mobileCard={{
            title: (p) => p.name,
            subtitle: (p) => <span className="font-mono text-xs">{p.sku}</span>,
            badges: (p) => (
              <>
                <StatusBadge status={p.status} label={t(`status.${p.status}`)} />
                {p.status !== "archived" && p.quantity <= p.reorderLevel ? (
                  <Badge variant="warning">{t("products.lowStock")}</Badge>
                ) : null}
              </>
            ),
            fields: [
              { label: t("table.category"), value: (p) => p.category?.name ?? t("table.dash") },
              { label: t("table.supplier"), value: (p) => p.supplier?.name ?? t("table.dash") },
              { label: t("table.warehouse"), value: (p) => p.warehouse?.name ?? t("table.dash") },
              { label: t("table.qty"), value: (p) => String(p.quantity) },
              { label: t("table.cost"), value: (p) => formatCurrency(p.costPrice) },
              { label: t("table.price"), value: (p) => formatCurrency(p.sellingPrice) },
            ],
          }}
        />
      )}

      <FormDialog open={modalOpen} onOpenChange={setModalOpen}>
        <FormDialogContent size="lg" aria-describedby={undefined}>
          <FormDialogHeader
            title={editing ? t("products.edit") : t("products.new")}
            description={editing ? t("products.editDescription") : t("products.createDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit((values) => saveMutation.mutate(values))}
          >
            <FormDialogBody className="space-y-6">
              <FormSection title={t("products.section.identity")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.name")}</FormLabel>
                    <Input {...form.register("name")} />
                    <FormError>{form.formState.errors.name?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.sku")}</FormLabel>
                    <Input {...form.register("sku")} />
                    <FormError>{form.formState.errors.sku?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel optional>{t("table.barcode")}</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        dir="ltr"
                        className="font-mono"
                        {...form.register("barcode", {
                          onChange: () => setClearBarcode(false),
                        })}
                      />
                      {editing && (form.watch("barcode") || editing.barcode) ? (
                        <Button
                          type="button"
                          variant="secondary"
                          className="shrink-0"
                          onClick={() => {
                            form.setValue("barcode", "");
                            setClearBarcode(true);
                          }}
                        >
                          {t("products.clearBarcode")}
                        </Button>
                      ) : null}
                    </div>
                    <FormError>{form.formState.errors.barcode?.message}</FormError>
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("products.section.categorization")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.category")}</FormLabel>
                    <Select {...form.register("categoryId")}>
                      <option value="">{t("table.select")}</option>
                      {categories?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    <FormError>{form.formState.errors.categoryId?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.supplier")}</FormLabel>
                    <Select {...form.register("supplierId")}>
                      <option value="">{t("table.select")}</option>
                      {suppliers?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </Select>
                    <FormError>{form.formState.errors.supplierId?.message}</FormError>
                  </FormField>
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
                </FormGrid>
              </FormSection>

              <FormSection title={t("products.section.stockPricing")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.costPrice")}</FormLabel>
                    <Input type="number" step="0.01" min={0} {...form.register("costPrice")} />
                    <FormError>{form.formState.errors.costPrice?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.sellingPrice")}</FormLabel>
                    <Input type="number" step="0.01" min={0} {...form.register("sellingPrice")} />
                    <FormError>{form.formState.errors.sellingPrice?.message}</FormError>
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.quantity")}</FormLabel>
                    <Input type="number" min={0} {...form.register("quantity")} />
                  </FormField>
                  <FormField>
                    <FormLabel required>{t("table.reorderLevel")}</FormLabel>
                    <Input type="number" min={0} {...form.register("reorderLevel")} />
                  </FormField>
                </FormGrid>
              </FormSection>

              <FormSection title={t("products.section.status")}>
                <FormGrid cols={2}>
                  <FormField>
                    <FormLabel required>{t("table.status")}</FormLabel>
                    <Select {...form.register("status")}>
                      <option value="active">{t("status.active")}</option>
                      <option value="inactive">{t("status.inactive")}</option>
                      <option value="discontinued">{t("status.discontinued")}</option>
                    </Select>
                  </FormField>
                </FormGrid>
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
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null);
        }}
        title={archiveAction?.label ?? t("products.archive.title")}
        description={
          archiveTarget
            ? archiveTarget.status === "archived"
              ? t("products.restore.description", { name: archiveTarget.name })
              : t("products.archive.description", { name: archiveTarget.name })
            : undefined
        }
        confirmLabel={archiveAction?.confirm ?? t("action.archive")}
        variant={archiveTarget?.status === "archived" ? "default" : "destructive"}
        loading={archiveMutation.isPending}
        onConfirm={() =>
          archiveTarget &&
          archiveAction &&
          archiveMutation.mutate({ id: archiveTarget.id, status: archiveAction.status })
        }
      />
    </ManagementPageShell>
  );
}
