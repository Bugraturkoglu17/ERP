"use client";

import { useRef, useState, useEffect, type CSSProperties } from "react";

const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;

type Point = { x: number; y: number };

function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Sayfa genelinde viewport zoom kapalı (user-scalable=no) — bu bileşen sadece
 * kendi içinde, dokunmatik iki-parmak pinch, çift-dokunma ve sürükleyerek
 * kaydırma ile manuel büyütme/küçültme sağlar. Sadece fotoğraf görüntüleme
 * (lightbox) gibi yerlerde kullanılmalı, sayfanın geneline uygulanmamalı.
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState<Point>({ x: 0, y: 0 });

  const pinchStartDist = useRef(0);
  const pinchStartScale = useRef(1);
  const pinchAnchor = useRef<Point>({ x: 0, y: 0 });
  const panStart = useRef<Point | null>(null);
  const offsetStart = useRef<Point>({ x: 0, y: 0 });
  const lastTap = useRef(0);

  // Yeni fotoğrafa geçince zoom/pan sıfırlansın.
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [src]);

  const clampScale = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));

  const zoomAt = (point: Point, nextScale: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = point.x - rect.left - rect.width / 2;
    const cy = point.y - rect.top - rect.height / 2;
    setOffset((prev) => {
      const ratio = nextScale / scale;
      return { x: cx - (cx - prev.x) * ratio, y: cy - (cy - prev.y) * ratio };
    });
    setScale(clampScale(nextScale));
  };

  const resetZoom = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      pinchStartDist.current = distance(a, b);
      pinchStartScale.current = scale;
      pinchAnchor.current = midpoint(a, b);
      panStart.current = null;
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTap.current < DOUBLE_TAP_MS) {
        // Çift dokunma: zoom aç/kapa
        if (scale > MIN_SCALE) {
          resetZoom();
        } else {
          zoomAt({ x: e.touches[0].clientX, y: e.touches[0].clientY }, DOUBLE_TAP_SCALE);
        }
        lastTap.current = 0;
        return;
      }
      lastTap.current = now;
      if (scale > MIN_SCALE) {
        panStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        offsetStart.current = offset;
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const a = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const b = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const dist = distance(a, b);
      if (pinchStartDist.current > 0) {
        const next = clampScale(pinchStartScale.current * (dist / pinchStartDist.current));
        zoomAt(pinchAnchor.current, next);
      }
    } else if (e.touches.length === 1 && panStart.current && scale > MIN_SCALE) {
      e.preventDefault();
      const dx = e.touches[0].clientX - panStart.current.x;
      const dy = e.touches[0].clientY - panStart.current.y;
      setOffset({ x: offsetStart.current.x + dx, y: offsetStart.current.y + dy });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) pinchStartDist.current = 0;
    if (e.touches.length === 0) panStart.current = null;
  };

  const style: CSSProperties = {
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
    transition: panStart.current || pinchStartDist.current ? "none" : "transform 150ms ease-out",
    touchAction: "none",
    cursor: scale > MIN_SCALE ? "grab" : undefined,
  };

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onDoubleClick={(e) => {
        if (scale > MIN_SCALE) resetZoom();
        else zoomAt({ x: e.clientX, y: e.clientY }, DOUBLE_TAP_SCALE);
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt ?? ""} draggable={false} className={className} style={style} />
    </div>
  );
}
