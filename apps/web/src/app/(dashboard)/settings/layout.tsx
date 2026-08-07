"use client";

import { usePathname } from "next/navigation";
import {
  Palette,
  Languages,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { GuardedLink } from "@/components/layout/guarded-link";

const NAV_ITEMS: {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  descriptionKey: string;
}[] = [
  {
    href: "/settings/appearance",
    labelKey: "settings.appearance",
    icon: Palette,
    descriptionKey: "settings.appearance.description",
  },
  {
    href: "/settings/language",
    labelKey: "settings.language",
    icon: Languages,
    descriptionKey: "settings.language.description",
  },
  {
    href: "/settings/security",
    labelKey: "settings.security",
    icon: Lock,
    descriptionKey: "settings.security.description",
  },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("nav.settings")}</h1>
        <p className="mt-1 text-sm text-muted">{t("settings.subtitle")}</p>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <nav className="shrink-0 lg:w-56" aria-label={t("nav.settings")}>
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <GuardedLink
                    href={item.href}
                    showPending
                    className={cn(
                      "flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors",
                      active
                        ? "bg-[var(--selected-bg)] text-accent"
                        : "text-muted hover:bg-[var(--hover-bg)] hover:text-foreground"
                    )}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      <span className="block text-sm font-medium">{t(item.labelKey)}</span>
                      <span className="mt-0.5 block text-xs leading-snug text-muted">
                        {t(item.descriptionKey)}
                      </span>
                    </span>
                  </GuardedLink>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
