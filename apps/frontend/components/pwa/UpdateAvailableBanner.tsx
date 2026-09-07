"use client";

import { useCallback, useEffect, useState } from "react";

const CHECK_INTERVAL_MS = 15 * 60 * 1000;

function hardReload() {
  const url = new URL(window.location.href);
  url.searchParams.set("_v", Date.now().toString());
  window.location.replace(url.toString());
}

export function UpdateAvailableBanner() {
  const [available, setAvailable] = useState(false);
  const [reloading, setReloading] = useState(false);

  const check = useCallback(async () => {
    const current = process.env.NEXT_PUBLIC_BUILD_VERSION;
    if (!current) return;
    try {
      const res = await fetch("/api/version", { cache: "no-store" });
      const data = (await res.json()) as { version?: string };
      if (data.version && data.version !== current) {
        setAvailable(true);
      }
    } catch {
      // sessizce yut — versiyon kontrolü kritik değil
    }
  }, []);

  useEffect(() => {
    check();

    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(check, CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [check]);

  if (!available) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-[100] flex justify-center px-4">
      <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-xl">
        <span className="text-sm font-medium text-slate-700">Yeni bir güncelleme mevcut.</span>
        <button
          type="button"
          disabled={reloading}
          onClick={() => {
            setReloading(true);
            hardReload();
          }}
          className="rounded-lg bg-[#ff3131] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
        >
          {reloading ? "Güncelleniyor…" : "Güncelle"}
        </button>
      </div>
    </div>
  );
}
