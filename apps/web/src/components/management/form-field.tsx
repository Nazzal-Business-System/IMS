"use client";

import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || description) && (
        <div className="space-y-0.5">
          {title ? (
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          ) : null}
          {description ? (
            <p className="text-xs text-muted">{description}</p>
          ) : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function FormGrid({
  children,
  cols = 1,
  className,
}: {
  children: React.ReactNode;
  cols?: 1 | 2;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        cols === 2 && "sm:grid-cols-2",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FormField({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("space-y-1.5", className)}>{children}</div>;
}

export function FormLabel({
  children,
  required,
  optional,
  htmlFor,
  className,
}: {
  children: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  htmlFor?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        "block text-sm font-medium text-foreground",
        htmlFor ? "cursor-pointer" : "cursor-default",
        className
      )}
    >
      {children}
      {required ? (
        <span className="ms-0.5 text-red-500" aria-hidden>
          *
        </span>
      ) : null}
      {optional ? (
        <span className="ms-1.5 text-xs font-normal text-muted">
          ({t("form.optional")})
        </span>
      ) : null}
    </label>
  );
}

export function FormError({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return (
    <p className={cn("text-xs text-red-500", className)} role="alert">
      {children}
    </p>
  );
}

export function FormHint({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  if (!children) return null;
  return <p className={cn("text-xs text-muted", className)}>{children}</p>;
}
