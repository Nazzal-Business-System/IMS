"use client";

import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { loginSchema } from "@ims/validation";
import { useI18n } from "@/lib/i18n";
import { AuthToolbar } from "@/components/auth/auth-toolbar";
import { LoginForm } from "@/components/auth/login-form";
import { DemoAccessList } from "@/components/auth/demo-access-list";
import type { DemoRole } from "@/components/auth/demo-access-row";
import { cn } from "@/lib/utils";
import { showDemoLogin } from "@/lib/demo-mode";

type LoginFormValues = z.infer<typeof loginSchema>;

interface AuthPanelProps {
  form: UseFormReturn<LoginFormValues>;
  onSubmit: (data: LoginFormValues) => void;
  onDemoSelect: (email: string, password: string, role: DemoRole) => void;
  submitting: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  formError: string | null;
  demoRole: DemoRole | null;
  busy: boolean;
  className?: string;
}

/**
 * Form column. Visual column order is controlled by the parent grid areas;
 * content direction follows i18n (LTR English / RTL Arabic).
 */
export function AuthPanel({
  form,
  onSubmit,
  onDemoSelect,
  submitting,
  showPassword,
  onTogglePassword,
  formError,
  demoRole,
  busy,
  className,
}: AuthPanelProps) {
  const { dir } = useI18n();

  return (
    <div
      dir={dir}
      className={cn(
        "auth-panel relative flex min-h-0 min-w-0 flex-1 flex-col",
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col px-4 py-2.5 sm:px-5 sm:py-3 lg:px-6 lg:py-3">
        <AuthToolbar className="mb-6 shrink-0" />

        <div className="mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-start gap-2.5 lg:justify-center">
          <LoginForm
            form={form}
            onSubmit={onSubmit}
            submitting={submitting}
            showPassword={showPassword}
            onTogglePassword={onTogglePassword}
            formError={formError}
            disabled={busy}
          />

          {showDemoLogin() ? (
            <DemoAccessList
              onSelect={onDemoSelect}
              activeRole={demoRole}
              disabled={busy}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
