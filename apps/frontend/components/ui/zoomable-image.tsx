"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";

// Zoom = görseli güvenli alan (bu bileşenin dolduğu kapsayıcı) içinde
// büyütmektir; pan/crop YOK. Taban görünüm (scale=1) güvenli alanın
// BASE_FRACTION kadarını kullanır — görsel bu oranda "object-fit: contain"
// ile ortalanır. MAX_SCALE'e ulaşıldığında (1 / BASE_FRACTION) görsel tam
// olarak güvenli alanı doldurur (bir kenarı sınıra değer) ama asla taşmaz,
// çünkü her iki eksen de aynı oranda büyütülür ve taban zaten "contain"
// ile hesaplanmıştır. Bu yüzden hiçbir zoom seviyesinde köşeler ekran
// dışına çıkamaz.
const BASE_FRACTION = 0.75;
const MIN_SCALE = 1;
const MAX_SCALE = 1 / BASE_FRACTION;
const DOUBLE_TAP_MS = 300;

type Point = { x: number; y: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Sayfa genelinde viewport zoom kapalı (user-scalable=no) — bu bileşen sadece
 * kendi içinde, dokunmatik iki-parmak pinch ve çift-dokunma/çift-tık ile
 * görseli kendi güvenli alanı içinde büyütür/küçültür. Görsel her zaman
 * tamamen görünür, ortalanmış ve aspect ratio korunmuş kalır; pan/sürükleme
 * yoktur. Sadece fotoğraf görüntüleme (lightbox) gibi yerlerde kullanılmalı.
 */
export function ZoomableImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  const [scale, setScale] = useState(MIN_SCALE);
  const [isPinching, setIsPinching] = useState(false);

  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(MIN_SCALE);
  const lastTap = useRef(0);

  // Yeni fotoğrafa geçince zoom sıfırlansın (fit-to-screen görünüme dön).
  useEffect(() => {
    setScale(MIN_SCALE);
  }, [src]);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const toggleZoom = () => {
    setScale((prev) => (prev > MIN_SCALE ? MIN_SCALE : MAX_SCALE));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      pinchStartDist.current = distance(a, b);
      pinchStartScale.current = scale;
      setIsPinching(true);
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        toggleZoom();
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current > 0) {
      e.preventDefault();
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const dist = distance(a, b);
      setScale(clampScale(pinchStartScale.current * (dist / pinchStartDist.current)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      pinchStartDist.current = 0;
      setIsPinching(false);
    }
  };

  const imgStyle: CSSProperties = {
    transform: `scale(${scale})`,
    transformOrigin: "center",
    transition: isPinching ? "none" : "transform 150ms ease-out",
    touchAction: "none",
    cursor: scale > MIN_SCALE ? "zoom-out" : "zoom-in",
  };

  return (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={(e) => {
        e.stopPropagation();
        toggleZoom();
      }}
    >
      {/* BASE_FRACTION kadarlık kutu: taban "contain" alanı bu oranda küçük,
          böylece scale MAX_SCALE'e çıktığında tam güvenli alana denk gelir. */}
      <div
        className="flex items-center justify-center"
        style={{ width: `${BASE_FRACTION * 100}%`, height: `${BASE_FRACTION * 100}%` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ""}
          draggable={false}
          className={`max-h-full max-w-full object-contain ${className ?? ""}`}
          style={imgStyle}
        />
      </div>
    </div>
  );
}
