"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/api";

export function getUserInitials(name: string | null | undefined): string {
  if (!name?.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return `${parts[0]!.charAt(0)}${parts[parts.length - 1]!.charAt(0)}`.toUpperCase();
}

type UserAvatarProps = {
  name: string | null | undefined;
  avatarUrl?: string | null;
  /** Cache-buster (e.g. user.updatedAt) so replacements show immediately */
  cacheKey?: string | number | null;
  /** Local blob/object URL for optimistic preview while uploading */
  previewUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  alt?: string;
};

const SIZE_CLASS: Record<NonNullable<UserAvatarProps["size"]>, string> = {
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-16 w-16 text-xl",
  xl: "h-24 w-24 text-2xl sm:h-28 sm:w-28 sm:text-3xl",
};

export function UserAvatar({
  name,
  avatarUrl,
  cacheKey,
  previewUrl,
  size = "md",
  className,
  alt,
}: UserAvatarProps) {
  const [broken, setBroken] = useState(false);
  const resolved = previewUrl || resolveMediaUrl(avatarUrl, cacheKey);
  const showImage = Boolean(resolved) && !broken;
  const label = alt ?? (name ? `${name}` : "User avatar");

  useEffect(() => {
    setBroken(false);
  }, [resolved]);

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full",
        "bg-[color-mix(in_srgb,var(--accent)_22%,transparent)] font-semibold text-accent",
        "ring-2 ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]",
        SIZE_CLASS[size],
        className
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element -- API-hosted avatars; next/image needs remotePatterns per deploy
        <img
          src={resolved!}
          alt={label}
          className="h-full w-full object-cover"
          onError={() => setBroken(true)}
          draggable={false}
        />
      ) : (
        <>
          <span className="select-none" aria-hidden>
            {getUserInitials(name)}
          </span>
          <span className="sr-only">{label}</span>
        </>
      )}
    </span>
  );
}
