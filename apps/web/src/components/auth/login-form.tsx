"use client";

import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import type { loginSchema } from "@ims/validation";
import { useI18n } from "@/lib/i18n";
import { AuthErrorState } from "@/components/auth/auth-error-state";
import {
  AUTH_TECHNICAL_INPUT_CLASS,
  AuthRequiredLabel,
  AuthTechnicalField,
  useAuthTechnicalChrome,
} from "@/components/auth/auth-technical-field";
import { ImsMark } from "@/components/auth/ims-mark";
import { cn } from "@/lib/utils";

type LoginFormValues = z.infer<typeof loginSchema>;

interface LoginFormProps {
  form: UseFormReturn<LoginFormValues>;
  onSubmit: (data: LoginFormValues) => void;
  submitting: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
  formError: string | null;
  disabled?: boolean;
}

export function LoginForm({
  form,
  onSubmit,
  submitting,
  showPassword,
  onTogglePassword,
  formError,
  disabled = false,
}: LoginFormProps) {
  const { t, dir } = useI18n();
  const chrome = useAuthTechnicalChrome();
  const emailError = form.formState.errors.email?.message;
  const passwordError = form.formState.errors.password?.message;
  const busy = submitting || disabled;

  return (
    <section className="w-full" aria-labelledby="login-heading">
      <div className="mb-2 flex flex-col items-center text-center">
        <ImsMark
          className="h-7 w-7 text-[var(--auth-accent)]"
          title={t("app.name")}
        />
        <h1
          id="login-heading"
          className="mt-1.5 text-balance text-xl font-bold tracking-tight sm:text-[1.3rem]"
          style={{ color: "var(--auth-fg)" }}
        >
          <span className="whitespace-nowrap">
            <span>{t("login.heading.lead")} </span>
            <span style={{ color: "var(--auth-accent)" }}>
              {t("login.heading.accent")}
            </span>
          </span>
        </h1>
        <p className="auth-muted mt-1 max-w-[36ch] text-pretty text-[13px] leading-snug">
          {t("login.subtitle")}
        </p>
      </div>

      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-2"
        noValidate
        aria-busy={busy}
      >
        <AuthErrorState id="login-form-error" message={formError} />

        <div className="space-y-1">
          <AuthRequiredLabel htmlFor="login-email">
            {t("login.email")}
          </AuthRequiredLabel>
          <AuthTechnicalField>
            <Mail className={chrome.leadingIconClass} aria-hidden />
            <input
              id="login-email"
              type="text"
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              dir="ltr"
              placeholder={t("login.emailPlaceholder")}
              aria-required="true"
              aria-invalid={emailError ? true : undefined}
              aria-describedby={
                emailError
                  ? "login-email-error"
                  : formError
                    ? "login-form-error"
                    : undefined
              }
              disabled={busy}
              className={cn(
                AUTH_TECHNICAL_INPUT_CLASS,
                chrome.emailPadClass,
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)]",
                "disabled:cursor-not-allowed disabled:opacity-55",
                emailError && "border-[var(--auth-error-border)]"
              )}
              {...form.register("email")}
            />
          </AuthTechnicalField>
          <p
            id="login-email-error"
            className={cn(
              "min-h-[0.95rem] text-xs",
              emailError ? "text-[var(--auth-error-fg)]" : "invisible"
            )}
          >
            {emailError || "placeholder"}
          </p>
        </div>

        <div className="space-y-1">
          <AuthRequiredLabel htmlFor="login-password">
            {t("login.password")}
          </AuthRequiredLabel>
          <AuthTechnicalField>
            <Lock className={chrome.leadingIconClass} aria-hidden />
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              dir="ltr"
              placeholder={t("login.passwordPlaceholder")}
              aria-required="true"
              aria-invalid={passwordError ? true : undefined}
              aria-describedby={
                passwordError
                  ? "login-password-error"
                  : formError
                    ? "login-form-error"
                    : undefined
              }
              disabled={busy}
              className={cn(
                AUTH_TECHNICAL_INPUT_CLASS,
                chrome.passwordPadClass,
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)]",
                "disabled:cursor-not-allowed disabled:opacity-55",
                passwordError && "border-[var(--auth-error-border)]"
              )}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={onTogglePassword}
              aria-label={
                showPassword ? t("login.hidePassword") : t("login.showPassword")
              }
              aria-pressed={showPassword}
              disabled={busy}
              className={chrome.trailingControlClass}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </AuthTechnicalField>
          <p
            id="login-password-error"
            className={cn(
              "min-h-[0.95rem] text-xs",
              passwordError ? "text-[var(--auth-error-fg)]" : "invisible"
            )}
          >
            {passwordError || "placeholder"}
          </p>
        </div>

        <button
          type="submit"
          disabled={busy}
          className={cn(
            "auth-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--auth-accent)] focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-60",
            "motion-reduce:transition-none"
          )}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              <span>{t("login.signingIn")}</span>
              <span className="sr-only">{t("login.signingIn")}</span>
            </>
          ) : (
            <>
              <span>{t("login.signIn")}</span>
              <ArrowRight
                className={cn("h-4 w-4", dir === "rtl" && "rotate-180")}
                aria-hidden
              />
            </>
          )}
        </button>
      </form>
    </section>
  );
}
