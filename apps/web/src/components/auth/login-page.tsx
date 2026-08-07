"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@ims/validation";
import { z } from "zod";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { useToast } from "@/lib/toast";
import { ApiClientError } from "@/lib/api";
import { FullPageLoader } from "@/components/loading/navigation-progress";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthArtworkPanel } from "@/components/auth/auth-artwork-panel";
import { AuthPanel } from "@/components/auth/auth-panel";
import { AuthFooter } from "@/components/auth/auth-footer";
import type { DemoRole } from "@/components/auth/demo-access-row";
import { cn } from "@/lib/utils";

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, user, loading } = useAuth();
  const { toast } = useToast();
  const { t, dir } = useI18n();
  const router = useRouter();
  const { startNavigation, stopNavigation } = useNavigationLoading();
  const [submitting, setSubmitting] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [demoRole, setDemoRole] = useState<DemoRole | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      setRedirecting(true);
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const resolveErrorMessage = (err: unknown) => {
    if (err instanceof ApiClientError) {
      if (err.status >= 500 || err.status === 0) {
        return t("login.error.unavailable");
      }
      return err.message || t("login.error.generic");
    }
    if (err instanceof Error && err.message) return err.message;
    return t("login.error.generic");
  };

  const authenticate = async (email: string, password: string) => {
    setFormError(null);
    setSubmitting(true);
    startNavigation();
    try {
      await login(email, password);
      setRedirecting(true);
      router.replace("/dashboard");
    } catch (err) {
      const message = resolveErrorMessage(err);
      setFormError(message);
      toast({ title: t("login.failed"), description: message, variant: "destructive" });
      stopNavigation();
      setSubmitting(false);
      setDemoRole(null);
      requestAnimationFrame(() => {
        document.getElementById("login-email")?.focus();
      });
    }
  };

  const onSubmit = async (data: LoginFormValues) => {
    if (submitting || redirecting) return;
    await authenticate(data.email, data.password);
  };

  const onDemoSelect = async (email: string, password: string, role: DemoRole) => {
    if (submitting || redirecting || demoRole) return;
    form.setValue("email", email);
    form.setValue("password", password);
    setDemoRole(role);
    await authenticate(email, password);
  };

  if (!mounted || loading || user || redirecting) {
    return <FullPageLoader message={redirecting ? t("login.signingYouIn") : undefined} />;
  }

  const busy = submitting;
  const isRtl = dir === "rtl";

  return (
    <AuthShell
      dir={dir}
      footer={
        <div className="mt-2 px-1">
          <AuthFooter className="rounded-xl border px-4 py-1.5" />
        </div>
      }
    >
      {/*
        Desktop column order is locale-driven via grid areas (not dir alone).
        Grid tracks stay LTR so area names map to physical left→right predictably.
        EN: artwork | auth   AR: auth | artwork
        Artwork image itself is never flipped.
      */}
      <div
        dir="ltr"
        className={cn(
          "auth-layout-grid grid min-h-0 h-full w-full",
          "lg:grid-cols-[minmax(0,1fr)_minmax(23rem,27rem)]",
          isRtl && "lg:grid-cols-[minmax(23rem,27rem)_minmax(0,1fr)]"
        )}
        style={
          {
            ["--auth-grid-areas" as string]: isRtl
              ? '"auth artwork"'
              : '"artwork auth"',
          }
        }
      >
        <AuthArtworkPanel className="lg:[grid-area:artwork]" />
        <AuthPanel
          className="lg:[grid-area:auth]"
          form={form}
          onSubmit={onSubmit}
          onDemoSelect={onDemoSelect}
          submitting={busy && !demoRole}
          showPassword={showPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
          formError={formError}
          demoRole={demoRole}
          busy={busy}
        />
      </div>
    </AuthShell>
  );
}
