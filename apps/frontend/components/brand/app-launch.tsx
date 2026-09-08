"use client";

import { useEffect, useState } from "react";
import { BrandMark, type BrandTone } from "@/components/brand/brand-mark";

export function AppLaunch({ tone, scope }: { tone: BrandTone; scope: string }) {
  // The launch layer must exist on the first render. Starting as hidden lets
  // the protected panel paint for a frame before the effect runs.
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const key = "sismik-intro:v2:session";
    if (sessionStorage.getItem(key)) {
      setVisible(false);
      return;
    }
    sessionStorage.setItem(key, "shown");
    const timer = window.setTimeout(() => setVisible(false), 3600);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="erp-launch-screen"
      data-launch-scope={scope}
      aria-label="SİSMİK Kurumsal Operasyon Sistemi açılıyor"
      aria-live="polite"
    >
      <div className="erp-launch-ambient" />
      <div className="relative flex flex-col items-center">
        <BrandMark tone={tone} animated className="h-28 w-28 sm:h-32 sm:w-32" />
        <div className="erp-launch-wordmark mt-5 text-center">
          <p className="text-[1.65rem] font-black tracking-[0.3em] text-white">SİSMİK</p>
          <p className="mt-2 text-[10px] font-semibold tracking-[0.22em] text-white/50">KURUMSAL OPERASYON SİSTEMİ</p>
        </div>
      </div>
    </div>
  );
}
