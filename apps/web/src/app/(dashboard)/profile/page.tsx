"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { changePasswordSchema, updateProfileSchema } from "@ims/validation";
import type { User } from "@ims/shared-types";
import { z } from "zod";
import {
  Camera,
  Eye,
  EyeOff,
  ImageOff,
  KeyRound,
  Languages,
  Loader2,
  LogIn,
  Palette,
  Pencil,
  Shield,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { apiFetch, apiUpload, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/lib/toast";
import { useI18n } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";
import { useRegisterBreadcrumbTitle } from "@/lib/breadcrumb-title";
import { cn, formatDate } from "@/lib/utils";
import { ProfileSkeleton } from "./profile-skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { NavButton } from "@/components/layout/nav-button";
import {
  FormDialog,
  FormDialogContent,
  FormDialogHeader,
  FormDialogBody,
  FormDialogFooter,
  AsyncSubmitButton,
  FormField,
  FormLabel,
  FormError,
  FormHint,
  StatusBadge,
} from "@/components/management";

type ProfileForm = z.infer<typeof updateProfileSchema>;

const passwordFormSchema = changePasswordSchema
  .extend({
    confirmPassword: z.string().min(1, "Confirm password required"),
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

type ActivityItem = {
  id: string;
  action: string;
  entity: string;
  createdAt: string;
};

const ROLE_KEYS: Record<string, string> = {
  admin: "role.admin",
  manager: "role.manager",
  viewer: "role.viewer",
};

const ACTIVITY_META: Record<
  string,
  { labelKey: string; icon: typeof LogIn }
> = {
  LOGIN: { labelKey: "profile.activity.login", icon: LogIn },
  UPDATE_PROFILE: { labelKey: "profile.activity.updateProfile", icon: UserRound },
  CHANGE_PASSWORD: { labelKey: "profile.activity.changePassword", icon: KeyRound },
  UPDATE_AVATAR: { labelKey: "profile.activity.updateAvatar", icon: Camera },
  REMOVE_AVATAR: { labelKey: "profile.activity.removeAvatar", icon: ImageOff },
};

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

function MetaRow({
  label,
  children,
  last,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4",
        !last && "border-b border-[color-mix(in_srgb,var(--foreground)_8%,transparent)]"
      )}
    >
      <dt className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd className="min-w-0 text-sm text-foreground sm:text-end">{children}</dd>
    </div>
  );
}

function ProfilePanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("ims-profile-panel", className)}>
      <div className="mb-1 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function ProfilePage() {
  const { user, loading, refreshUser, setUser } = useAuth();
  const { toast } = useToast();
  const { t, language } = useI18n();
  const { settings, resolvedMode } = useTheme();
  useRegisterBreadcrumbTitle(t("nav.profile"));

  const [editOpen, setEditOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [removePhotoOpen, setRemovePhotoOpen] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarStatus, setAvatarStatus] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: { name: "" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const activityQuery = useQuery({
    queryKey: ["auth-activity"],
    queryFn: () => apiFetch<ActivityItem[]>("/auth/activity"),
    enabled: Boolean(user),
  });

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const themeLabel = useMemo(() => {
    if (settings.mode === "system") return t("settings.theme.system");
    return resolvedMode === "dark" ? t("settings.theme.dark") : t("settings.theme.light");
  }, [settings.mode, resolvedMode, t]);

  const languageLabel =
    language === "ar" ? t("settings.language.arabic") : t("settings.language.english");

  const openEdit = () => {
    profileForm.reset({ name: user?.name ?? "" });
    setEditOpen(true);
  };

  const openPassword = () => {
    passwordForm.reset({ currentPassword: "", newPassword: "", confirmPassword: "" });
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setPasswordOpen(true);
  };

  const onProfileSave = async (values: ProfileForm) => {
    try {
      const updated = await apiFetch<User>("/auth/profile", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      setUser(updated);
      await refreshUser();
      toast({ title: t("toast.profileUpdated") });
      setEditOpen(false);
      activityQuery.refetch();
    } catch (err) {
      const msg = err instanceof ApiClientError ? err.message : t("toast.updateFailed");
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    }
  };

  const onPasswordSave = async (values: PasswordForm) => {
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
      setPasswordOpen(false);
      activityQuery.refetch();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : t("toast.passwordChangeFailed");
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    }
  };

  const clearPreview = () => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const validateClientFile = (file: File): string | null => {
    const mime = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!ACCEPTED_TYPES.includes(mime)) {
      return t("profile.avatar.invalidType");
    }
    if (file.size > MAX_AVATAR_BYTES) {
      return t("profile.avatar.tooLarge");
    }
    return null;
  };

  const uploadAvatar = async (file: File) => {
    const error = validateClientFile(file);
    if (error) {
      setAvatarStatus(error);
      toast({ title: t("toast.error"), description: error, variant: "destructive" });
      return;
    }

    const localPreview = URL.createObjectURL(file);
    clearPreview();
    setPreviewUrl(localPreview);
    setAvatarBusy(true);
    setUploadProgress(0);
    setAvatarStatus(t("profile.avatar.uploading"));

    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const updated = await apiUpload<User>("/auth/avatar", formData, {
        onProgress: setUploadProgress,
      });
      setUser(updated);
      await refreshUser();
      clearPreview();
      setAvatarStatus(t("profile.avatar.uploadSuccess"));
      toast({ title: t("toast.avatarUpdated") });
      activityQuery.refetch();
    } catch (err) {
      clearPreview();
      const msg =
        err instanceof ApiClientError ? err.message : t("profile.avatar.uploadFailed");
      setAvatarStatus(msg);
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    } finally {
      setAvatarBusy(false);
      setUploadProgress(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    void uploadAvatar(file);
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    setAvatarStatus(t("profile.avatar.removing"));
    try {
      const updated = await apiFetch<User>("/auth/avatar", { method: "DELETE" });
      setUser(updated);
      await refreshUser();
      clearPreview();
      setRemovePhotoOpen(false);
      setAvatarStatus(t("profile.avatar.removeSuccess"));
      toast({ title: t("toast.avatarRemoved") });
      activityQuery.refetch();
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : t("profile.avatar.removeFailed");
      setAvatarStatus(msg);
      toast({ title: t("toast.error"), description: msg, variant: "destructive" });
    } finally {
      setAvatarBusy(false);
    }
  };

  if (loading) {
    return <ProfileSkeleton />;
  }

  if (!user) {
    return (
      <div className="ims-profile-panel mx-auto max-w-lg px-6 py-12 text-center">
        <p className="font-medium text-foreground">{t("profile.sessionInvalid")}</p>
        <Button asChild variant="secondary" className="mt-4">
          <Link href="/login">{t("login.signIn")}</Link>
        </Button>
      </div>
    );
  }

  const hasAvatar = Boolean(user.avatarUrl) || Boolean(previewUrl);

  return (
    <div className="ims-profile-page mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header className="ims-profile-hero">
        <div className="ims-profile-hero-glow" aria-hidden />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <UserAvatar
                name={user.name}
                avatarUrl={user.avatarUrl}
                cacheKey={user.updatedAt}
                previewUrl={previewUrl}
                size="xl"
                className="ims-profile-avatar-ring shadow-lg"
                alt={t("profile.avatar.alt", { name: user.name })}
              />
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    type="button"
                    className="ims-profile-avatar-edit absolute bottom-0 end-0 flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,#0f766e_92%,#0b1224)] text-white shadow-md outline-none ring-2 ring-[color-mix(in_srgb,#fff_18%,transparent)] transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                    aria-label={t("profile.avatar.change")}
                    disabled={avatarBusy}
                  >
                    {avatarBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    ) : (
                      <Camera className="h-4 w-4" aria-hidden />
                    )}
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 min-w-[12rem] rounded-xl border border-[color-mix(in_srgb,var(--foreground)_10%,transparent)] bg-card p-1.5 shadow-lg"
                  >
                    <DropdownMenu.Item
                      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none hover:bg-[var(--hover-bg)] focus:bg-[var(--hover-bg)]"
                      disabled={avatarBusy}
                      onSelect={(e) => {
                        e.preventDefault();
                        fileInputRef.current?.click();
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      {t("profile.avatar.upload")}
                    </DropdownMenu.Item>
                    {hasAvatar && !previewUrl ? (
                      <DropdownMenu.Item
                        className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 outline-none hover:bg-red-500/10 focus:bg-red-500/10"
                        disabled={avatarBusy}
                        onSelect={(e) => {
                          e.preventDefault();
                          setRemovePhotoOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("profile.avatar.remove")}
                      </DropdownMenu.Item>
                    ) : null}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
              <input
                ref={fileInputRef}
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                onChange={onFileChange}
                aria-label={t("profile.avatar.upload")}
                disabled={avatarBusy}
              />
            </div>

            <div className="min-w-0 space-y-2 text-center sm:text-start">
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-[var(--profile-hero-fg)] sm:text-3xl">
                  {user.name}
                </h1>
                <Badge className="border-0 bg-[color-mix(in_srgb,#2dd4bf_22%,transparent)] capitalize text-[#99f6e4]">
                  {t(ROLE_KEYS[user.role] ?? user.role)}
                </Badge>
                <StatusBadge
                  status={user.isActive ? "active" : "inactive"}
                  label={user.isActive ? t("status.active") : t("status.inactive")}
                />
              </div>
              <p className="truncate text-sm text-[var(--profile-hero-muted)]" dir="ltr">
                {user.email}
              </p>
              <p className="text-xs text-[var(--profile-hero-muted)]">
                {t("profile.memberSince")}: {formatDate(user.createdAt)}
                {user.lastLoginAt ? (
                  <>
                    {" · "}
                    {t("profile.lastLogin")}: {formatDate(user.lastLoginAt)}
                  </>
                ) : null}
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1 sm:justify-start">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="bg-[color-mix(in_srgb,#fff_10%,transparent)] text-[var(--profile-hero-fg)] hover:bg-[color-mix(in_srgb,#fff_16%,transparent)]"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={avatarBusy}
                >
                  <Camera className="h-4 w-4" />
                  {t("profile.avatar.change")}
                </Button>
                {uploadProgress != null ? (
                  <span className="text-xs text-[var(--profile-hero-muted)]" aria-live="polite">
                    {t("profile.avatar.progress", { percent: String(uploadProgress) })}
                  </span>
                ) : null}
              </div>
              <p className="sr-only" aria-live="polite">
                {avatarStatus}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap justify-center gap-2 sm:justify-end">
            <Button type="button" onClick={openEdit} className="min-w-[8.5rem]">
              <Pencil className="h-4 w-4" />
              {t("profile.edit")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={openPassword}
              className="min-w-[8.5rem] bg-[color-mix(in_srgb,#fff_10%,transparent)] text-[var(--profile-hero-fg)] hover:bg-[color-mix(in_srgb,#fff_16%,transparent)]"
            >
              <KeyRound className="h-4 w-4" />
              {t("settings.changePassword")}
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.9fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfilePanel
            title={t("profile.personalInfo")}
            description={t("profile.personalInfoDescription")}
            action={
              <Button type="button" variant="ghost" size="sm" onClick={openEdit}>
                <Pencil className="h-3.5 w-3.5" />
                {t("action.edit")}
              </Button>
            }
          >
            <dl>
              <MetaRow label={t("settings.displayName")}>{user.name}</MetaRow>
              <MetaRow label={t("table.email")} last>
                <span dir="ltr">{user.email}</span>
                <span className="mt-1 block text-xs text-muted sm:text-end">
                  {t("profile.emailReadOnly")}
                </span>
              </MetaRow>
            </dl>
          </ProfilePanel>

          <ProfilePanel
            title={t("profile.security")}
            description={t("profile.securityDescription")}
            action={
              <Button type="button" variant="secondary" size="sm" onClick={openPassword}>
                <KeyRound className="h-3.5 w-3.5" />
                {t("settings.changePassword")}
              </Button>
            }
          >
            <ul className="space-y-2.5 text-sm text-muted">
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                {t("settings.securityTip1")}
              </li>
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                {t("settings.securityTip2")}
              </li>
              <li className="flex items-start gap-2">
                <Shield className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
                {t("settings.securityTip3")}
              </li>
            </ul>
          </ProfilePanel>

          <ProfilePanel
            title={t("profile.recentActivity")}
            description={t("profile.recentActivityDescription")}
          >
            {activityQuery.isLoading ? (
              <div className="flex items-center gap-2 py-4 text-sm text-muted" aria-busy>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("mgmt.loading")}
              </div>
            ) : activityQuery.isError ? (
              <div className="py-2 text-sm text-muted">
                <p>{t("profile.activityFailed")}</p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="mt-2"
                  onClick={() => activityQuery.refetch()}
                >
                  {t("mgmt.retry")}
                </Button>
              </div>
            ) : !activityQuery.data?.length ? (
              <p className="py-3 text-sm text-muted">{t("empty.noData")}</p>
            ) : (
              <ol className="ims-profile-activity" role="list">
                {activityQuery.data.map((item, index) => {
                  const meta = ACTIVITY_META[item.action];
                  const Icon = meta?.icon ?? UserRound;
                  const label = meta
                    ? t(meta.labelKey)
                    : t("profile.activity.generic", {
                        action: item.action,
                        entity: item.entity,
                      });
                  return (
                    <li key={item.id} className="ims-profile-activity-item">
                      <span
                        className={cn(
                          "ims-profile-activity-rail",
                          index === activityQuery.data!.length - 1 && "ims-profile-activity-rail-last"
                        )}
                        aria-hidden
                      />
                      <span className="ims-profile-activity-icon">
                        <Icon className="h-3.5 w-3.5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted">{formatDate(item.createdAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </ProfilePanel>
        </div>

        <aside className="flex min-w-0 flex-col gap-6">
          <ProfilePanel
            title={t("profile.accountInfo")}
            description={t("profile.roleManagedByAdmin")}
          >
            <dl>
              <MetaRow label={t("table.role")}>
                {t(ROLE_KEYS[user.role] ?? user.role)}
              </MetaRow>
              <MetaRow label={t("filter.status")}>
                <StatusBadge
                  status={user.isActive ? "active" : "inactive"}
                  label={user.isActive ? t("status.active") : t("status.inactive")}
                />
              </MetaRow>
              <MetaRow label={t("profile.memberSince")}>{formatDate(user.createdAt)}</MetaRow>
              <MetaRow label={t("profile.lastLogin")} last>
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : t("profile.neverSignedIn")}
              </MetaRow>
            </dl>
          </ProfilePanel>

          <ProfilePanel
            title={t("profile.preferences")}
            description={t("profile.preferencesDescription")}
          >
            <dl>
              <MetaRow label={t("settings.language")}>
                <span className="inline-flex items-center gap-1.5">
                  <Languages className="h-3.5 w-3.5 text-muted" aria-hidden />
                  {languageLabel}
                </span>
              </MetaRow>
              <MetaRow label={t("settings.themeMode")} last>
                <span className="inline-flex items-center gap-1.5">
                  <Palette className="h-3.5 w-3.5 text-muted" aria-hidden />
                  {themeLabel}
                </span>
              </MetaRow>
            </dl>
              <div className="mt-3 flex flex-wrap gap-2">
              <NavButton
                href="/settings/language"
                variant="secondary"
                size="sm"
                className="min-w-[9.5rem]"
                pendingText={t("nav.openingShort")}
              >
                {t("profile.openLanguage")}
              </NavButton>
              <NavButton
                href="/settings/appearance"
                variant="secondary"
                size="sm"
                className="min-w-[9.5rem]"
                pendingText={t("nav.openingShort")}
              >
                {t("profile.openAppearance")}
              </NavButton>
            </div>
          </ProfilePanel>
        </aside>
      </div>

      <FormDialog open={editOpen} onOpenChange={setEditOpen}>
        <FormDialogContent size="sm" aria-describedby={undefined}>
          <FormDialogHeader
            title={t("profile.edit")}
            description={t("settings.displayNameDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={profileForm.handleSubmit(onProfileSave)}
          >
            <FormDialogBody className="space-y-4">
              <FormField>
                <FormLabel htmlFor="profile-name" required>
                  {t("settings.displayName")}
                </FormLabel>
                <Input
                  id="profile-name"
                  autoComplete="name"
                  placeholder={t("profile.namePlaceholder")}
                  {...profileForm.register("name")}
                />
                <FormError>{profileForm.formState.errors.name?.message}</FormError>
              </FormField>
            </FormDialogBody>
            <FormDialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditOpen(false)}
                disabled={profileForm.formState.isSubmitting}
              >
                {t("action.cancel")}
              </Button>
              <AsyncSubmitButton
                loading={profileForm.formState.isSubmitting}
                loadingLabel={t("loading.saving")}
              >
                {t("settings.saveProfile")}
              </AsyncSubmitButton>
            </FormDialogFooter>
          </form>
        </FormDialogContent>
      </FormDialog>

      <FormDialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <FormDialogContent size="md" aria-describedby="password-hint">
          <FormDialogHeader
            title={t("settings.changePassword")}
            description={t("settings.changePasswordDescription")}
          />
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={passwordForm.handleSubmit(onPasswordSave)}
          >
            <FormDialogBody className="space-y-4">
              <p id="password-hint" className="text-xs text-muted">
                {t("profile.passwordPolicy")}
              </p>
              <FormField>
                <FormLabel htmlFor="current-password" required>
                  {t("settings.currentPassword")}
                </FormLabel>
                <div className="relative">
                  <Input
                    id="current-password"
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
                <FormLabel htmlFor="new-password" required>
                  {t("settings.newPassword")}
                </FormLabel>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNew ? "text" : "password"}
                    autoComplete="new-password"
                    className="pe-10"
                    aria-describedby="password-hint"
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
                <FormLabel htmlFor="confirm-password" required>
                  {t("profile.confirmPassword")}
                </FormLabel>
                <div className="relative">
                  <Input
                    id="confirm-password"
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
            </FormDialogBody>
            <FormDialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setPasswordOpen(false)}
                disabled={passwordForm.formState.isSubmitting}
              >
                {t("action.cancel")}
              </Button>
              <AsyncSubmitButton
                loading={passwordForm.formState.isSubmitting}
                loadingLabel={t("settings.updating")}
              >
                {t("settings.changePassword")}
              </AsyncSubmitButton>
            </FormDialogFooter>
          </form>
        </FormDialogContent>
      </FormDialog>

      <ConfirmDialog
        open={removePhotoOpen}
        onOpenChange={setRemovePhotoOpen}
        title={t("profile.avatar.removeConfirmTitle")}
        description={t("profile.avatar.removeConfirmDescription")}
        confirmLabel={t("profile.avatar.remove")}
        loading={avatarBusy}
        onConfirm={() => void removeAvatar()}
      />
    </div>
  );
}
