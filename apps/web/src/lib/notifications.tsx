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
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import type { Notification, NotificationListResponse, UnreadCountResponse } from "@ims/shared-types";
import { apiFetch } from "./api";
import { useAuth } from "./auth";
import { useI18n } from "./i18n";
import { useToast } from "./toast";
import { getSocketUrl } from "./socket-url";

export type SocketConnectionStatus = "idle" | "connected" | "reconnecting" | "disconnected";

interface NotificationsContextValue {
  unreadCount: number;
  isLoadingUnread: boolean;
  notifications: Notification[];
  isLoadingList: boolean;
  socketStatus: SocketConnectionStatus;
  isMarkingAll: boolean;
  isClearingRead: boolean;
  announcement: string;
  refresh: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const MAX_TOASTED_IDS = 100;

type ListCacheEntry = [QueryKey, NotificationListResponse | undefined];

interface MutationSnapshot {
  previousLists: ListCacheEntry[];
  previousUnread: UnreadCountResponse | undefined;
}

function patchNotificationLists(
  queryClient: ReturnType<typeof useQueryClient>,
  mapper: (list: Notification[]) => Notification[]
) {
  queryClient.setQueriesData<NotificationListResponse>(
    { queryKey: ["notifications"] },
    (old) => {
      if (!old?.notifications) return old;
      const next = mapper(old.notifications);
      const delta = next.length - old.notifications.length;
      return {
        ...old,
        notifications: next,
        total:
          typeof old.total === "number" ? Math.max(0, old.total + delta) : old.total,
      };
    }
  );
}

function restoreLists(
  queryClient: ReturnType<typeof useQueryClient>,
  entries: ListCacheEntry[]
) {
  for (const [key, data] of entries) {
    queryClient.setQueryData(key, data);
  }
}

function softRefresh(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({
    queryKey: ["notifications-unread"],
    refetchType: "active",
  });
  void queryClient.invalidateQueries({
    queryKey: ["notifications"],
    refetchType: "active",
  });
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, canRead } = useAuth();
  const canAccess = !!user && canRead("notifications");
  const { t } = useI18n();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const toastedIdsRef = useRef<Set<string>>(new Set());
  const [socketStatus, setSocketStatus] = useState<SocketConnectionStatus>("idle");
  const [announcement, setAnnouncement] = useState("");
  const announceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const announce = useCallback((message: string) => {
    setAnnouncement("");
    if (announceTimer.current) clearTimeout(announceTimer.current);
    // Force live-region re-announce when the same message repeats.
    requestAnimationFrame(() => {
      setAnnouncement(message);
      announceTimer.current = setTimeout(() => setAnnouncement(""), 2500);
    });
  }, []);

  const unreadQuery = useQuery({
    queryKey: ["notifications-unread"],
    queryFn: () => apiFetch<UnreadCountResponse>("/notifications/unread-count"),
    enabled: canAccess,
    staleTime: 10_000,
  });

  const listQuery = useQuery({
    queryKey: ["notifications", "recent"],
    queryFn: () => apiFetch<NotificationListResponse>("/notifications?limit=20"),
    enabled: canAccess,
    staleTime: 10_000,
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["notifications-unread"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  }, [queryClient]);

  useEffect(() => {
    if (!canAccess) {
      setSocketStatus("idle");
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem("ims_token");
    if (!token) return;

    const socket = io(getSocketUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketRef.current = socket;

    const rememberToast = (id: string) => {
      const set = toastedIdsRef.current;
      if (set.has(id)) return false;
      set.add(id);
      if (set.size > MAX_TOASTED_IDS) {
        const first = set.values().next().value;
        if (first) set.delete(first);
      }
      return true;
    };

    socket.on("connect", () => {
      setSocketStatus("connected");
      refresh();
    });

    socket.io.on("reconnect_attempt", () => {
      setSocketStatus("reconnecting");
    });

    socket.on("disconnect", () => {
      setSocketStatus("disconnected");
    });

    socket.on("connect_error", () => {
      setSocketStatus("disconnected");
    });

    socket.on("notification:new", (notification: Notification) => {
      queryClient.setQueryData<UnreadCountResponse>(["notifications-unread"], (prev) => ({
        count: (prev?.count ?? 0) + 1,
      }));
      queryClient.setQueriesData<NotificationListResponse>(
        { queryKey: ["notifications"] },
        (old) => {
          if (!old?.notifications) return old;
          if (old.notifications.some((n) => n.id === notification.id)) return old;
          return {
            ...old,
            notifications: [notification, ...old.notifications],
            total: typeof old.total === "number" ? old.total + 1 : old.total,
          };
        }
      );
      if (rememberToast(notification.id)) {
        toast({
          title: notification.title,
          description: notification.message,
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setSocketStatus("idle");
    };
  }, [canAccess, queryClient, toast, refresh]);

  useEffect(
    () => () => {
      if (announceTimer.current) clearTimeout(announceTimer.current);
    },
    []
  );

  const takeSnapshot = useCallback((): MutationSnapshot => {
    return {
      previousLists: queryClient.getQueriesData<NotificationListResponse>({
        queryKey: ["notifications"],
      }),
      previousUnread: queryClient.getQueryData<UnreadCountResponse>([
        "notifications-unread",
      ]),
    };
  }, [queryClient]);

  const rollback = useCallback(
    (snapshot?: MutationSnapshot) => {
      if (!snapshot) return;
      restoreLists(queryClient, snapshot.previousLists);
      queryClient.setQueryData(["notifications-unread"], snapshot.previousUnread);
    },
    [queryClient]
  );

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch<Notification>(`/notifications/${id}/read`, { method: "PATCH" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notifications-unread"] });
      const snapshot = takeSnapshot();
      const wasUnread = snapshot.previousLists.some(([, data]) =>
        data?.notifications?.some((n) => n.id === id && !n.isRead)
      );
      patchNotificationLists(queryClient, (list) =>
        list.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      if (wasUnread) {
        queryClient.setQueryData<UnreadCountResponse>(["notifications-unread"], {
          count: Math.max(0, (snapshot.previousUnread?.count ?? 1) - 1),
        });
      }
      announce(t("notifications.announce.markedRead"));
      return snapshot;
    },
    onError: (_err, _id, snapshot) => {
      rollback(snapshot);
      toast({
        title: t("notifications.error.markRead"),
        description: t("notifications.error.reverted"),
        variant: "destructive",
      });
      announce(t("notifications.announce.markReadFailed"));
    },
    onSettled: () => softRefresh(queryClient),
  });

  const markAllMutation = useMutation({
    mutationFn: () => apiFetch<{ count: number }>("/notifications/read-all", { method: "PATCH" }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notifications-unread"] });
      const snapshot = takeSnapshot();
      patchNotificationLists(queryClient, (list) =>
        list.map((n) => (n.isRead ? n : { ...n, isRead: true }))
      );
      queryClient.setQueryData<UnreadCountResponse>(["notifications-unread"], {
        count: 0,
      });
      announce(t("notifications.announce.markedAllRead"));
      return snapshot;
    },
    onError: (_err, _vars, snapshot) => {
      rollback(snapshot);
      toast({
        title: t("notifications.error.markAll"),
        description: t("notifications.error.reverted"),
        variant: "destructive",
      });
      announce(t("notifications.announce.markAllFailed"));
    },
    onSettled: () => softRefresh(queryClient),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiFetch<void>(`/notifications/${id}`, { method: "DELETE" }),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notifications-unread"] });
      const snapshot = takeSnapshot();
      const wasUnread = snapshot.previousLists.some(([, data]) =>
        data?.notifications?.some((n) => n.id === id && !n.isRead)
      );
      patchNotificationLists(queryClient, (list) => list.filter((n) => n.id !== id));
      if (wasUnread) {
        queryClient.setQueryData<UnreadCountResponse>(["notifications-unread"], {
          count: Math.max(0, (snapshot.previousUnread?.count ?? 1) - 1),
        });
      }
      announce(t("notifications.announce.deleted"));
      return snapshot;
    },
    onError: (_err, _id, snapshot) => {
      rollback(snapshot);
      toast({
        title: t("notifications.error.delete"),
        description: t("notifications.error.reverted"),
        variant: "destructive",
      });
      announce(t("notifications.announce.deleteFailed"));
    },
    onSettled: () => softRefresh(queryClient),
  });

  const clearReadMutation = useMutation({
    mutationFn: () =>
      apiFetch<{ count: number }>("/notifications/clear-read", { method: "DELETE" }),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ["notifications"] });
      await queryClient.cancelQueries({ queryKey: ["notifications-unread"] });
      const snapshot = takeSnapshot();
      patchNotificationLists(queryClient, (list) => list.filter((n) => !n.isRead));
      announce(t("notifications.announce.clearedRead"));
      return snapshot;
    },
    onError: (_err, _vars, snapshot) => {
      rollback(snapshot);
      toast({
        title: t("notifications.error.clearRead"),
        description: t("notifications.error.reverted"),
        variant: "destructive",
      });
      announce(t("notifications.announce.clearReadFailed"));
    },
    onSettled: () => softRefresh(queryClient),
  });

  const value = useMemo(
    () => ({
      unreadCount: unreadQuery.data?.count ?? 0,
      isLoadingUnread: unreadQuery.isLoading,
      notifications: listQuery.data?.notifications ?? [],
      isLoadingList: listQuery.isLoading,
      socketStatus,
      isMarkingAll: markAllMutation.isPending,
      isClearingRead: clearReadMutation.isPending,
      announcement,
      refresh,
      markAsRead: async (id: string) => {
        await markAsReadMutation.mutateAsync(id);
      },
      markAllAsRead: async () => {
        await markAllMutation.mutateAsync();
      },
      deleteNotification: async (id: string) => {
        await deleteMutation.mutateAsync(id);
      },
      clearRead: async () => {
        await clearReadMutation.mutateAsync();
      },
    }),
    [
      unreadQuery.data?.count,
      unreadQuery.isLoading,
      listQuery.data?.notifications,
      listQuery.isLoading,
      socketStatus,
      markAllMutation.isPending,
      clearReadMutation.isPending,
      announcement,
      refresh,
      markAsReadMutation,
      markAllMutation,
      deleteMutation,
      clearReadMutation,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
