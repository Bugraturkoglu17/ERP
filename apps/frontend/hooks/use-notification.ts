import { useCallback } from "react";
import { useNotificationStore } from "@/stores/notification-store";

export function useNotification() {
  const addToast = useNotificationStore((state) => state.addToast);
  const removeToast = useNotificationStore((state) => state.removeToast);
  const toasts = useNotificationStore((state) => state.toasts);

  const success = useCallback(
    (message: string, duration?: number) => {
      addToast({ type: "success", message, duration });
    },
    [addToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => {
      addToast({ type: "error", message, duration });
    },
    [addToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => {
      addToast({ type: "info", message, duration });
    },
    [addToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => {
      addToast({ type: "warning", message, duration });
    },
    [addToast]
  );

  return {
    toasts,
    success,
    error,
    info,
    warning,
    removeToast,
  };
}
