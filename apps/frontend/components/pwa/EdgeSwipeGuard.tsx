"use client";

import { useEffect, useRef } from "react";

// iOS Safari, ekranın sol/sağ kenarına yakın başlayan tek-parmak kaydırmayı
// "tarayıcı geçmişinde geri/ileri git" jesti olarak yorumluyor — sayfa kayıp
// bir önceki route'a düşüyor. CSS (touch-action/overscroll-behavior) bu jesti
// tüm iOS sürümlerinde güvenilir şekilde engellemiyor; jest WebKit'in kendi
// edge-recognizer'ı tarafından yönetiliyor.
//
// touchstart anında engellemiyoruz — kenara yakın bir buton (örn. hamburger
// menü) dokunuşunu bozar. Bunun yerine touchmove'da hareketin gerçekten
// yatay olduğunu görene kadar bekliyoruz; sadece o zaman preventDefault
// çağırıyoruz. Böylece taplar ve dikey scroll'lar etkilenmez.
const EDGE_THRESHOLD_PX = 24;
const DIRECTION_LOCK_PX = 8;

export function EdgeSwipeGuard() {
  const startRef = useRef<{ x: number; y: number; edge: boolean } | null>(null);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      const edge = touch.clientX <= EDGE_THRESHOLD_PX || touch.clientX >= window.innerWidth - EDGE_THRESHOLD_PX;
      startRef.current = { x: touch.clientX, y: touch.clientY, edge };
    };

    const onTouchMove = (event: TouchEvent) => {
      const start = startRef.current;
      const touch = event.touches[0];
      if (!start || !start.edge || !touch) return;
      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      if (Math.abs(dx) > DIRECTION_LOCK_PX && Math.abs(dx) > Math.abs(dy)) {
        event.preventDefault();
      }
    };

    const onTouchEnd = () => {
      startRef.current = null;
    };

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    document.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  return null;
}
