"use client";

import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthErrorStateProps {
  id?: string;
  message: string | null;
  className?: string;
}

/** Reserved-height alert so errors do not shift the form layout. */
export function AuthErrorState({ id, message, className }: AuthErrorStateProps) {
  return (
    <div
      id={id}
      role="alert"
      aria-live="assertive"
      className={cn(
        "min-h-[2.1rem] rounded-lg border px-3 py-1 text-sm",
        message ? "auth-error" : "border-transparent bg-transparent text-transparent",
        className
      )}
    >
      <span className={cn("flex items-start gap-2", !message && "invisible")}>
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{message || "placeholder"}</span>
      </span>
    </div>
  );
}
