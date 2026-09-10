"use client";

import { BrandMark, type BrandTone } from "@/components/brand/brand-mark";

/**
 * Uygulamanın SOĞUK açılışında (PWA cold boot / sekme yenileme) gösterilen
 * TEK açılış ekranı: koyu zemin, logo animasyonu, marka yazısı ve altında
 * "oturum kontrol ediliyor" ilerleme çizgisi.
 *
 * Hem kök yönlendirme sayfası (app/page.tsx) hem de yetkili rota sarmalayıcısı
 * (RoleGuard) AYNI bu ekranı render eder — böylece "önce içeriden beyaz bir
 * kare + spinner, sonra logo animasyonu" şeklindeki çift ekran sorunu oluşmaz.
 *
 * Masraf uygulamasındaki gibi: sabit/yapay bir bekleme süresi yoktur; ekranı
 * gösteren taraf (RoleGuard) oturum kontrolü biter bitmez onu kaldırır.
 * İlerleme çizgisi bu yüzden BELİRSİZ (indeterminate) kayan bir çizgidir —
 * ne kadar kısa ya da uzun görünürse görünsün "çalışıyor" hissi verir.
 */
export function LaunchScreen({
  tone = "red",
  status = "Oturum kontrol ediliyor",
}: {
  tone?: BrandTone;
  /** Alt satırdaki durum metni. null verilirse ilerleme çizgisi gizlenir. */
  status?: string | null;
}) {
  return (
    <div
      className="erp-launch-screen"
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
        {status && (
          <div className="erp-launch-wordmark mt-8 flex flex-col items-center gap-2.5">
            <div className="erp-launch-progress h-0.5 w-40 overflow-hidden rounded-full bg-white/10" />
            <p className="text-[10px] font-medium tracking-[0.18em] text-white/40">
              {status.toLocaleUpperCase("tr-TR")}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
