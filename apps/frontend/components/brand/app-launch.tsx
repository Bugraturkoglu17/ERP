"use client";

import { useEffect, useState } from "react";
import { BrandMark, type BrandTone } from "@/components/brand/brand-mark";

export function AppLaunch({ tone, scope }: { tone: BrandTone; scope: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const key = `sismik-intro:${scope}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "shown");
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timer);
  }, [scope]);

  if (!visible) return null;

  return (
    <div className="erp-launch-screen" aria-label="Sismik ERP açılıyor" aria-live="polite">
      <div className="erp-launch-ambient" />
      <div className="relative flex flex-col items-center">
        <BrandMark tone={tone} animated className="h-28 w-28 sm:h-32 sm:w-32" />
        <div className="erp-launch-wordmark mt-5 text-center">
          <p className="text-[1.65rem] font-black tracking-[0.3em] text-white">ERP</p>
          <p className="mt-2 text-[10px] font-semibold tracking-[0.28em] text-white/40">SİSMİK OPERASYON SİSTEMİ</p>
        </div>
      </div>
    </div>
  );
}
