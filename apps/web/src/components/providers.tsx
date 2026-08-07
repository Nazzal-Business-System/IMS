"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { AuthProvider } from "@/lib/auth";
import { ToastProvider } from "@/lib/toast";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { NavigationLoadingProvider } from "@/lib/navigation-loading";
import { BreadcrumbTitleProvider } from "@/lib/breadcrumb-title";
import { UnsavedGuardProvider } from "@/lib/unsaved-guard";
import { NotificationsProvider } from "@/lib/notifications";
import { NavigationProgress } from "@/components/loading/navigation-progress";
import { PreferencesSync } from "@/lib/preferences-sync";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <NavigationLoadingProvider>
            <BreadcrumbTitleProvider>
              <UnsavedGuardProvider>
                <AuthProvider>
                  <PreferencesSync />
                  <ToastProvider>
                    <NotificationsProvider>
                      <NavigationProgress />
                      {children}
                    </NotificationsProvider>
                  </ToastProvider>
                </AuthProvider>
              </UnsavedGuardProvider>
            </BreadcrumbTitleProvider>
          </NavigationLoadingProvider>
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
