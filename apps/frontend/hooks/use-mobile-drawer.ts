"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { usePathname } from "next/navigation";

const EDGE_START = 8;
const EDGE_WIDTH = 24;
const DIRECTION_LOCK_DISTANCE = 10;
const OPEN_PROGRESS_THRESHOLD = 0.3;
const CLOSE_PROGRESS_THRESHOLD = 0.3;
const VELOCITY_THRESHOLD = 0.45;
const SETTLE_DURATION = 260;
const CLICK_SUPPRESSION_DURATION = 500;

type Gesture = {
  startX: number;
  startY: number;
  lastX: number;
  lastAt: number;
  velocityX: number;
  drawerWidth: number;
  mode: "opening" | "closing";
  accepted: boolean | null;
  pointerId: number;
  pathname: string;
};

function getDrawerWidth() {
  return Math.min(window.innerWidth * 0.86, 360);
}

export function useMobileDrawer() {
  const pathname = usePathname();
  const [open, setOpenState] = useState(false);
  const [dragX, setDragX] = useState<number | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const settlingUntil = useRef(0);
  const suppressClickUntil = useRef(0);

  const resetGesture = useCallback(() => {
    gesture.current = null;
    setDragX(null);
  }, []);

  const close = useCallback(() => {
    resetGesture();
    settlingUntil.current = performance.now() + SETTLE_DURATION;
    setOpenState(false);
  }, [resetGesture]);

  const openDrawer = useCallback(() => {
    resetGesture();
    settlingUntil.current = performance.now() + SETTLE_DURATION;
    setOpenState(true);
  }, [resetGesture]);

  useEffect(() => {
    // A route must never inherit the previous page's drawer/drag layer.
    settlingUntil.current = 0;
    suppressClickUntil.current = 0;
    close();
  }, [pathname, close]);

  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const scrollY = window.scrollY;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  const beginGesture = useCallback((event: PointerEvent<HTMLElement>, mode: Gesture["mode"]) => {
    if (window.innerWidth >= 1024 || !event.isPrimary || (event.pointerType === "mouse" && event.button !== 0)) return;
    if (gesture.current || performance.now() < settlingUntil.current) return;
    const pointX = event.clientX;
    const pointY = event.clientY;

    if (mode === "opening") {
      if (open) return;
      const edgeEnd = EDGE_START + EDGE_WIDTH;
      if (pointX < EDGE_START || pointX > edgeEnd) return;
    } else if (!open) {
      return;
    }

    // Açma şeridinde tıklanabilir içerik yok; pointer kenar şeridini terk
    // etmeden yakalanmalı. Açık drawer'da ise normal link dokunuşlarını
    // bozmamak için capture ancak yatay sürükleme doğrulanınca alınır.
    if (mode === "opening") {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    gesture.current = {
      startX: pointX,
      startY: pointY,
      lastX: pointX,
      lastAt: event.timeStamp,
      velocityX: 0,
      drawerWidth: getDrawerWidth(),
      mode,
      accepted: null,
      pointerId: event.pointerId,
      pathname,
    };
  }, [open, pathname]);

  const moveGesture = useCallback((event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || !event.isPrimary || event.pointerId !== current.pointerId) return;
    if (current.pathname !== pathname) {
      resetGesture();
      return;
    }
    const dx = event.clientX - current.startX;
    const dy = event.clientY - current.startY;

    if (current.accepted === null && Math.max(Math.abs(dx), Math.abs(dy)) >= DIRECTION_LOCK_DISTANCE) {
      const correctDirection = current.mode === "opening" ? dx > 0 : dx < 0;
      current.accepted = correctDirection && Math.abs(dx) > Math.abs(dy) * 1.2;
    }
    if (!current.accepted) return;

    event.preventDefault();
    event.stopPropagation();
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    suppressClickUntil.current = performance.now() + CLICK_SUPPRESSION_DURATION;
    const elapsed = Math.max(1, event.timeStamp - current.lastAt);
    current.velocityX = (event.clientX - current.lastX) / elapsed;
    current.lastX = event.clientX;
    current.lastAt = event.timeStamp;

    const nextDrag = current.mode === "opening"
      ? Math.min(current.drawerWidth, Math.max(0, dx))
      : Math.max(-current.drawerWidth, Math.min(0, dx));
    setDragX(nextDrag);
  }, [pathname, resetGesture]);

  const endGesture = useCallback((event: PointerEvent<HTMLElement>) => {
    const current = gesture.current;
    if (!current || event.pointerId !== current.pointerId) return;
    if (current.accepted && current.pathname === pathname) {
      const distance = Math.abs(current.lastX - current.startX);
      const progress = distance / current.drawerWidth;
      const fastEnough = current.mode === "opening"
        ? current.velocityX >= VELOCITY_THRESHOLD
        : current.velocityX <= -VELOCITY_THRESHOLD;

      if (current.mode === "opening") {
        setOpenState(progress >= OPEN_PROGRESS_THRESHOLD || fastEnough);
      } else {
        setOpenState(!(progress >= CLOSE_PROGRESS_THRESHOLD || fastEnough));
      }
      settlingUntil.current = performance.now() + SETTLE_DURATION;
      suppressClickUntil.current = performance.now() + CLICK_SUPPRESSION_DURATION;
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetGesture();
  }, [pathname, resetGesture]);

  const cancelGesture = useCallback((event: PointerEvent<HTMLElement>) => {
    // Restore the stable state that existed before the cancelled gesture.
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetGesture();
  }, [resetGesture]);

  const suppressGestureClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (performance.now() >= suppressClickUntil.current) return;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  return {
    open,
    dragX,
    edgeSwipeEnabled: true,
    openDrawer,
    close,
    edgeGestureProps: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => beginGesture(event, "opening"),
      onPointerMove: moveGesture,
      onPointerUp: endGesture,
      onPointerCancel: cancelGesture,
      onLostPointerCapture: cancelGesture,
    },
    drawerGestureProps: {
      onPointerDown: (event: PointerEvent<HTMLElement>) => beginGesture(event, "closing"),
      onPointerMove: moveGesture,
      onPointerUp: endGesture,
      onPointerCancel: cancelGesture,
      onLostPointerCapture: cancelGesture,
      onClickCapture: suppressGestureClick,
    },
  };
}
