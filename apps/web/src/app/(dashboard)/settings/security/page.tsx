"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema } from "@ims/validation";
import { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { apiFetch, ApiClientError } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/loading";
import {
  FormSection,
  FormGrid,
  FormField,
  FormLabel,
  FormError,
  FormHint,
  AsyncSubmitButton,
} from "@/components/management";

const passwordFormSchema = changePasswordSchema
  .extend({
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "New password must be different",
    path: ["newPassword"],
  });

type PasswordForm = z.infer<typeof passwordFormSchema>;

export default function SecuritySettingsPage() {
  const { user, canRead } = useAuth();
  const { toast } = useToast();
  const { t } = useI18n();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  // Security settings page remains under Settings; password change is available to any signed-in user.
  if (!user) {
    return <EmptyState title={t("access.denied")} description={t("profile.sessionInvalid")} />;
  }

  if (!canRead("settings")) {
    return (
      <EmptyState
        title={t("access.denied")}
        description={t("access.settings")}
      />
    );
  }

  const onPasswordSubmit = async (values: PasswordForm) => {
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newPassword: values.newPassword,
        }),
      });
      toast({ title: t("toast.passwordChanged") });
      passwordForm.reset();
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : t("toast.passwordChangeFailed");
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <section className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
            <ShieldCheck className="h-5 w-5 text-accent" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">{t("settings.changePassword")}</h2>
            <p className="text-sm text-muted">{t("settings.changePasswordDescription")}</p>
          </div>
        </div>
        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="max-w-md">
          <FormSection>
            <FormGrid>
              <FormField>
                <FormLabel htmlFor="settings-current-password" required>
                  {t("settings.currentPassword")}
                </FormLabel>
                <div className="relative">
                  <Input
                    id="settings-current-password"
                    type={showCurrent ? "text" : "password"}
                    autoComplete="current-password"
                    className="pe-10"
                    {...passwordForm.register("currentPassword")}
                  />
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
                    onClick={() => setShowCurrent((v) => !v)}
                    aria-label={showCurrent ? t("profile.hidePassword") : t("profile.showPassword")}
                  >
                    {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormError>{passwordForm.formState.errors.currentPassword?.message}</FormError>
              </FormField>
              <FormField>
                <FormLabel htmlFor="settings-new-password" required>
                  {t("settings.newPassword")}
                </FormLabel>
                <div className="relative">
                  <Input
                    id="settings-new-password"
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    className="pe-10"
                    {...passwordForm.register("newPassword")}
                  />
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
                    onClick={() => setShowNew((v) => !v)}
                    aria-label={showNew ? t("profile.hidePassword") : t("profile.showPassword")}
                  >
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormHint>{t("profile.passwordMinHint")}</FormHint>
                <FormError>{passwordForm.formState.errors.newPassword?.message}</FormError>
              </FormField>
              <FormField>
                <FormLabel htmlFor="settings-confirm-password" required>
                  {t("profile.confirmPassword")}
                </FormLabel>
                <div className="relative">
                  <Input
                    id="settings-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    className="pe-10"
                    {...passwordForm.register("confirmPassword")}
                  />
                  <button
                    type="button"
                    className="absolute end-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-foreground"
                    onClick={() => setShowConfirm((v) => !v)}
                    aria-label={showConfirm ? t("profile.hidePassword") : t("profile.showPassword")}
                  >
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <FormError>{passwordForm.formState.errors.confirmPassword?.message}</FormError>
              </FormField>
            </FormGrid>
            <AsyncSubmitButton
              loading={passwordForm.formState.isSubmitting}
              loadingLabel={t("settings.updating")}
            >
              {t("settings.changePassword")}
            </AsyncSubmitButton>
          </FormSection>
        </form>
        <p className="mt-4 text-xs text-muted">
          <Link href="/profile" className="text-accent hover:underline">
            {t("nav.profile")}
          </Link>
        </p>
      </section>

      <section className="rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card p-4 sm:p-5">
        <h2 className="mb-3 text-base font-semibold text-foreground">{t("settings.securityTips")}</h2>
        <div className="space-y-2 text-sm text-muted">
          <p>{t("settings.securityTip1")}</p>
          <p>{t("settings.securityTip2")}</p>
          <p>{t("settings.securityTip3")}</p>
        </div>
      </section>
    </div>
  );
}
