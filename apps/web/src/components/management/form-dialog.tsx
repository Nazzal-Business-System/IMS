"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export const FormDialog = DialogPrimitive.Root;
export const FormDialogTrigger = DialogPrimitive.Trigger;
export const FormDialogClose = DialogPrimitive.Close;

/**
 * Management form dialog with stable header + scrollable body + sticky footer.
 * Short-height screens keep actions reachable.
 */
export function FormDialogContent({
  className,
  children,
  size = "md",
  ...props
}: DialogPrimitive.DialogContentProps & {
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-3xl",
  };

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/55 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        className={cn(
          "ims-form-dialog fixed inset-x-3 top-[4vh] z-50 mx-auto flex max-h-[92vh] w-auto -translate-y-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none sm:inset-x-auto sm:left-1/2 sm:top-1/2 sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2",
          "max-sm:bottom-3 max-sm:top-auto max-sm:max-h-[min(92vh,100dvh-1.5rem)]",
          sizes[size],
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function FormDialogHeader({
  title,
  description,
  className,
}: {
  title: string;
  description?: string;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div
      className={cn(
        "flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-6",
        className
      )}
    >
      <div className="min-w-0 space-y-1 pe-8">
        <DialogPrimitive.Title className="text-lg font-semibold text-foreground">
          {title}
        </DialogPrimitive.Title>
        {description ? (
          <DialogPrimitive.Description className="text-sm text-muted">
            {description}
          </DialogPrimitive.Description>
        ) : (
          <DialogPrimitive.Description className="sr-only">
            {title}
          </DialogPrimitive.Description>
        )}
      </div>
      <DialogPrimitive.Close
        className="absolute end-3 top-3 rounded-lg p-2 text-muted transition-colors hover:bg-[var(--hover-bg)] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        aria-label={t("action.cancel")}
      >
        <X className="h-4 w-4" />
      </DialogPrimitive.Close>
    </div>
  );
}

export function FormDialogBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("ims-form-dialog-body min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6", className)}>
      {children}
    </div>
  );
}

export function FormDialogFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col-reverse gap-2 border-t border-border bg-card px-5 py-3 sm:flex-row sm:items-center sm:justify-end sm:px-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export function AsyncSubmitButton({
  loading,
  children,
  loadingLabel,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: string;
}) {
  return (
    <Button type="submit" disabled={loading || props.disabled} className={cn("min-w-[7.5rem]", className)} {...props}>
      {loading ? loadingLabel ?? children : children}
    </Button>
  );
}
