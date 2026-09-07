"use client";

import { useCallback, useEffect, useRef, useState, type TouchEvent } from "react";

const EDGE_WIDTH = 28;
const OPEN_THRESHOLD = 72;
const CLOSE_THRESHOLD = 64;

type Gesture = {
  startX: number;
  startY: number;
  mode: "opening" | "closing";
  accepted: boolean | null;
};

export function useMobileDrawer() {
  const [open, setOpen] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const onTouchStart = useCallback((event: TouchEvent<HTMLElement>) => {
    if (window.innerWidth >= 1024 || event.touches.length !== 1) return;
    const touch = event.touches[0];
    if (!open && touch.clientX > EDGE_WIDTH) return;
    gesture.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      mode: open ? "closing" : "opening",
      accepted: null,
    };
  }, [open]);

  const onTouchMove = useCallback((event: TouchEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || event.touches.length !== 1) return;
    const touch = event.touches[0];
    const dx = touch.clientX - current.startX;
    const dy = touch.clientY - current.startY;

    if (current.accepted === null && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      current.accepted = Math.abs(dx) > Math.abs(dy) * 1.25;
    }
    if (!current.accepted) return;

    event.preventDefault();
    setDragX(current.mode === "opening" ? Math.max(0, dx) : Math.min(0, dx));
  }, []);

  const onTouchEnd = useCallback(() => {
    const current = gesture.current;
    if (current?.accepted) {
      if (current.mode === "opening" && (dragX ?? 0) >= OPEN_THRESHOLD) setOpen(true);
      if (current.mode === "closing" && Math.abs(dragX ?? 0) >= CLOSE_THRESHOLD) setOpen(false);
    }
    gesture.current = null;
    setDragX(null);
  }, [dragX]);

  return {
    open,
    setOpen,
    dragX,
    gestureProps: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}
