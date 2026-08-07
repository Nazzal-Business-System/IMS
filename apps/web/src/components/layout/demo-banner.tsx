"use client";

import { AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function DemoBanner() {
  const { t } = useI18n();

  return (
    <div
      className="ims-demo-banner flex items-center gap-2 border-b px-4 py-1.5 text-sm"
      role="status"
    >
      <AlertTriangle className="ims-demo-banner-icon h-4 w-4 shrink-0" aria-hidden />
      <span>{t("demo.banner")}</span>
    </div>
  );
}
