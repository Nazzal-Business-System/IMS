"use client";

import Image from "next/image";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Production hero: 1448×1086 → aspect 4/3 */
export const AUTH_HERO_ASPECT = "1448 / 1086";

interface AuthArtworkPanelProps {
  className?: string;
}

/**
 * Desktop artwork column. Image uses object-contain + center — never cover/crop
 * and never horizontally mirrored. Visual column slot is assigned by grid-area.
 */
export function AuthArtworkPanel({ className }: AuthArtworkPanelProps) {
  const { t } = useI18n();

  return (
    <aside
      dir="ltr"
      className={cn(
        "relative hidden h-full min-w-0 overflow-hidden lg:block",
        className
      )}
      style={{
        backgroundColor: "var(--auth-artwork-bg)",
        // Document intended asset ratio for layout tooling / future CSS.
        ["--auth-hero-aspect" as string]: AUTH_HERO_ASPECT,
      }}
      aria-label={t("login.artwork.label")}
    >
      <Image
        src="/media/auth/ims-login-hero.webp"
        alt={t("login.artwork.alt")}
        fill
        priority
        sizes="(min-width: 1024px) 55vw, 0px"
        className="object-contain object-center"
        style={{ objectFit: "contain", objectPosition: "center" }}
      />
    </aside>
  );
}
