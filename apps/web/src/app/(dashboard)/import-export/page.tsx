"use client";

import { useRef, useState } from "react";
import type { ProductImportResponse } from "@ims/shared-types";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/loading";
import { Badge } from "@/components/ui/badge";
import { Download, FileJson, Upload } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import {
  ManagementPageShell,
  ManagementPageHeader,
  ManagementDataTable,
  type ManagementColumn,
} from "@/components/management";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api";

async function downloadFile(path: string, filename: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("ims_token") : null;
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : "Download failed");
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function parseProductCsv(text: string) {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const record: Record<string, string> = {};
    headers.forEach((h, i) => {
      record[h] = (values[i] ?? "").trim();
    });
    return {
      name: record.name ?? "",
      sku: record.sku ?? "",
      barcode: record.barcode || null,
      category: record.category ?? "",
      supplier: record.supplier ?? "",
      warehouse: record.warehouse ?? "",
      costPrice: Number(record.costPrice) || 0,
      sellingPrice: Number(record.sellingPrice) || 0,
      quantity: Number(record.quantity) || 0,
      reorderLevel: Number(record.reorderLevel) || 0,
      status: (record.status || "active") as "active" | "inactive" | "discontinued" | "archived",
    };
  });
}

export default function ImportExportPage() {
  const { canRead, canWrite } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [preview, setPreview] = useState<ProductImportResponse | null>(null);
  const [parsedRows, setParsedRows] = useState<ReturnType<typeof parseProductCsv>>([]);

  if (!canRead("import_export")) {
    return <EmptyState title={t("access.denied")} description={t("access.importExport")} />;
  }

  const handleCsvExport = async () => {
    setLoading("csv");
    try {
      await downloadFile("/import-export/products", "products-export.csv");
      toast({ title: t("toast.csvExported") });
    } catch (err) {
      toast({
        title: t("toast.exportFailed"),
        description: err instanceof Error ? err.message : t("toast.error"),
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleJsonExport = async () => {
    setLoading("json");
    try {
      const products = await apiFetch<unknown[]>("/import-export/products/json");
      const blob = new Blob([JSON.stringify(products, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "products-export.json";
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: t("toast.jsonExported") });
    } catch (err) {
      toast({
        title: t("toast.exportFailed"),
        description: err instanceof Error ? err.message : t("toast.error"),
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading("parse");
    try {
      const text = await file.text();
      const rows = parseProductCsv(text);
      setParsedRows(rows);
      setPreview(null);
    } catch {
      toast({ title: t("toast.error"), variant: "destructive" });
    } finally {
      setLoading(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const runPreview = async () => {
    if (!parsedRows.length) {
      toast({ title: t("importExport.csv.noFile"), variant: "destructive" });
      return;
    }
    setLoading("preview");
    try {
      const result = await apiFetch<ProductImportResponse>("/import-export/products/import", {
        method: "POST",
        body: JSON.stringify({ rows: parsedRows, commit: false }),
      });
      setPreview(result);
      toast({
        title: t("importExport.csv.previewResult", {
          valid: result.validCount,
          errors: result.errorCount,
          total: result.total,
        }),
      });
    } catch (err) {
      toast({
        title: t("toast.error"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const runImport = async () => {
    if (!parsedRows.length) return;
    setLoading("import");
    try {
      const result = await apiFetch<ProductImportResponse>("/import-export/products/import", {
        method: "POST",
        body: JSON.stringify({ rows: parsedRows, commit: true }),
      });
      setPreview(result);
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: t("importExport.csv.imported", { count: result.importedCount ?? 0 }),
      });
    } catch (err) {
      toast({
        title: t("toast.error"),
        description: err instanceof Error ? err.message : undefined,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const previewColumns: ManagementColumn<ProductImportResponse["results"][number] & { id: string }>[] = [
    { key: "row", header: t("importExport.csv.row"), cell: (r) => r.row },
    { key: "sku", header: t("table.sku"), cell: (r) => r.sku },
    { key: "name", header: t("table.product"), cell: (r) => r.name },
    {
      key: "status",
      header: t("importExport.csv.status"),
      cell: (r) =>
        r.valid ? (
          <Badge variant="success">{t("importExport.csv.valid")}</Badge>
        ) : (
          <span className="text-sm text-destructive">{r.error ?? t("importExport.csv.invalid")}</span>
        ),
    },
  ];

  return (
    <ManagementPageShell>
      <ManagementPageHeader title={t("importExport.title")} description={t("importExport.subtitle")} />

      <div className="grid gap-6 md:grid-cols-2 max-w-3xl">
        <Card className="border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-4 w-4 text-accent" />
              {t("importExport.csv.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">{t("importExport.csv.description")}</p>
            <Button onClick={handleCsvExport} disabled={!!loading}>
              {loading === "csv" ? t("importExport.exporting") : t("importExport.csv.download")}
            </Button>
          </CardContent>
        </Card>

        <Card className="border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-accent" />
              {t("importExport.json.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">{t("importExport.json.description")}</p>
            <Button variant="secondary" onClick={handleJsonExport} disabled={!!loading}>
              {loading === "json" ? t("importExport.exporting") : t("importExport.json.download")}
            </Button>
          </CardContent>
        </Card>
      </div>

      {canWrite("import_export") && (
        <Card className="border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card max-w-4xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-accent" />
              {t("importExport.csv.importTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted">{t("importExport.csv.importDescription")}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="block w-full text-sm text-muted file:me-4 file:rounded-lg file:border-0 file:bg-accent file:px-4 file:py-2 file:text-sm file:font-medium file:text-white"
              onChange={handleFileSelect}
            />
            {parsedRows.length > 0 && (
              <p className="text-sm text-muted">
                {parsedRows.length} {t("importExport.csv.row").toLowerCase()}s loaded
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <Button onClick={runPreview} disabled={!!loading || !parsedRows.length}>
                {loading === "preview" ? t("importExport.csv.parsing") : t("importExport.csv.preview")}
              </Button>
              <Button
                variant="secondary"
                onClick={runImport}
                disabled={!!loading || !preview || preview.validCount === 0}
              >
                {loading === "import" ? t("importExport.exporting") : t("importExport.csv.import")}
              </Button>
            </div>

            {preview && preview.results.length > 0 && (
              <div className="max-h-80 overflow-y-auto rounded-lg border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)]">
                <ManagementDataTable
                  data={preview.results.map((r) => ({ ...r, id: String(r.row) }))}
                  emptyTitle={t("empty.noData")}
                  columns={previewColumns}
                  className="rounded-none border-0"
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </ManagementPageShell>
  );
}
