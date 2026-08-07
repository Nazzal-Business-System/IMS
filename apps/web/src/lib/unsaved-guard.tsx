"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useI18n } from "@/lib/i18n";
import { useNavigationLoading } from "@/lib/navigation-loading";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface UnsavedGuardRegistration {
  isDirty: boolean;
  save: () => Promise<void>;
  discard: () => void;
}

interface UnsavedGuardContextValue {
  register: (registration: UnsavedGuardRegistration | null) => void;
  requestNavigation: (onProceed: () => void) => void;
}

const UnsavedGuardContext = createContext<UnsavedGuardContextValue | null>(null);

export function UnsavedGuardProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { stopNavigation } = useNavigationLoading();
  const registrationRef = useRef<UnsavedGuardRegistration | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const proceedRef = useRef<(() => void) | null>(null);
  const trapPushedRef = useRef(false);

  const register = useCallback((next: UnsavedGuardRegistration | null) => {
    registrationRef.current = next;
    const dirty = next?.isDirty ?? false;
    setIsDirty((prev) => (prev === dirty ? prev : dirty));
  }, []);

  const requestNavigation = useCallback(
    (onProceed: () => void) => {
      if (registrationRef.current?.isDirty) {
        stopNavigation();
        proceedRef.current = onProceed;
        setModalOpen(true);
        return;
      }
      onProceed();
    },
    [stopNavigation]
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    proceedRef.current = null;
    stopNavigation();
  }, [stopNavigation]);

  const handleDiscard = useCallback(() => {
    registrationRef.current?.discard();
    const proceed = proceedRef.current;
    setModalOpen(false);
    proceedRef.current = null;
    if (proceed) proceed();
  }, []);

  const handleSave = useCallback(async () => {
    const registration = registrationRef.current;
    if (!registration) return;
    setSaving(true);
    try {
      await registration.save();
      const proceed = proceedRef.current;
      setModalOpen(false);
      proceedRef.current = null;
      if (proceed) proceed();
    } catch {
      stopNavigation();
    } finally {
      setSaving(false);
    }
  }, [stopNavigation]);

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) {
      trapPushedRef.current = false;
      return;
    }

    if (!trapPushedRef.current) {
      history.pushState({ unsavedGuard: true }, "", window.location.href);
      trapPushedRef.current = true;
    }

    const onPopState = () => {
      if (!registrationRef.current?.isDirty) return;
      stopNavigation();
      history.pushState({ unsavedGuard: true }, "", window.location.href);
      proceedRef.current = () => history.back();
      setModalOpen(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [isDirty, stopNavigation]);

  const contextValue = useMemo(
    () => ({ register, requestNavigation }),
    [register, requestNavigation]
  );

  return (
    <UnsavedGuardContext.Provider value={contextValue}>
      {children}
      <Dialog open={modalOpen} onOpenChange={(open) => !open && closeModal()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("permissions.unsaved.title")}</DialogTitle>
            <DialogDescription>{t("permissions.unsaved.description")}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeModal} disabled={saving}>
              {t("action.cancel")}
            </Button>
            <Button
              variant="secondary"
              onClick={handleDiscard}
              disabled={saving}
            >
              {t("action.discardChanges")}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? t("loading.saving") : t("action.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </UnsavedGuardContext.Provider>
  );
}

export function useUnsavedGuard() {
  const ctx = useContext(UnsavedGuardContext);
  if (!ctx) throw new Error("useUnsavedGuard must be used within UnsavedGuardProvider");
  return ctx;
}
