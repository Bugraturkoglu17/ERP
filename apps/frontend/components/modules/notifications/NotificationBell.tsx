"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Bell, CheckCheck, MessageSquare, FileText,
  ClipboardList, AlertTriangle, TrendingUp, X
} from "lucide-react";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import { translateNotification } from "@/lib/notification-translator";

interface ErpNotification {
  id: string;
  event_type: string;
  title: string;
  description?: string;
  work_order_id?: string;
  work_order_title?: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso + (iso.endsWith('Z') ? '' : 'Z')).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Az once";
  if (min < 60) return `${min} dakika once`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} saat once`;
  return `${Math.floor(hrs / 24)} gun once`;
}

function EventIcon({ eventType }: { eventType: string }) {
  switch (eventType) {
    case "whatsapp_read":          return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
    case "whatsapp_delivered":     return <CheckCheck className="h-3.5 w-3.5 text-emerald-500" />;
    case "whatsapp_failed":        return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
    case "service_form_submitted": return <FileText className="h-3.5 w-3.5 text-violet-500" />;
    case "work_order_created":     return <ClipboardList className="h-3.5 w-3.5 text-amber-500" />;
    default:                       return <TrendingUp className="h-3.5 w-3.5 text-slate-400" />;
  }
}

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<ErpNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const data = await apiGet<{ count: number }>("/notifications/unread-count");
      setUnreadCount((data as any)?.count ?? 0);
    } catch { /* silently ignore */ }
  }, []);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<ErpNotification[]>("/notifications?days=30&limit=50");
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [fetchUnread]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next) await fetchNotifications();
  };

  const markRead = async (id: string) => {
    try {
      await apiPatch(`/notifications/${id}/read`, {});
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await apiPost("/notifications/mark-all-read");
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        id="notification-bell-btn"
        onClick={handleOpen}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
        aria-label="Bildirimler"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-900">Bildirimler</span>
              {unreadCount > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-600">
                  {unreadCount} yeni
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  <CheckCheck className="h-3 w-3" /> Tumu
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-7 w-7 text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Bildirim yok</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && markRead(n.id)}
                  className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors ${
                    n.is_read ? "hover:bg-slate-50" : "bg-blue-50/40 hover:bg-blue-50"
                  }`}
                >
                  <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                    n.is_read ? "bg-slate-100" : "bg-white shadow-sm border border-slate-100"
                  }`}>
                    <EventIcon eventType={n.event_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${
                      n.is_read ? "text-slate-600" : "font-semibold text-slate-900"
                    }`}>{translateNotification(n.event_type, n.title)}</p>
                    {n.description && (
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{n.description}</p>
                    )}
                    <p className="text-[10px] text-slate-300 mt-1">{relativeTime(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <div className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
