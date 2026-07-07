import { useState, useCallback } from "react";

interface UseModalReturn<T = any> {
  isOpen: boolean;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
  toggle: (data?: T) => void;
}

export function useModal<T = any>(initialOpen = false): UseModalReturn<T> {
  const [isOpen, setIsOpen] = useState(initialOpen);
  const [data, setData] = useState<T | null>(null);

  const open = useCallback((modalData?: T) => {
    if (modalData !== undefined) {
      setData(modalData);
    }
    setIsOpen(true);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setData(null);
  }, []);

  const toggle = useCallback((modalData?: T) => {
    setIsOpen((prev) => {
      if (prev) {
        setData(null);
      } else if (modalData !== undefined) {
        setData(modalData);
      }
      return !prev;
    });
  }, []);

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
  };
}
