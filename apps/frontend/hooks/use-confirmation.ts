import { useState, useCallback } from "react";

interface ConfirmOptions {
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

interface UseConfirmationReturn {
  isOpen: boolean;
  options: ConfirmOptions;
  ask: (options: ConfirmOptions) => Promise<boolean>;
  confirm: () => void;
  cancel: () => void;
}

export function useConfirmation(): UseConfirmationReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);

  const ask = useCallback((opt: ConfirmOptions) => {
    setOptions(opt);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const confirm = useCallback(() => {
    if (resolver) resolver(true);
    setIsOpen(false);
    setResolver(null);
  }, [resolver]);

  const cancel = useCallback(() => {
    if (resolver) resolver(false);
    setIsOpen(false);
    setResolver(null);
  }, [resolver]);

  return {
    isOpen,
    options,
    ask,
    confirm,
    cancel,
  };
}
