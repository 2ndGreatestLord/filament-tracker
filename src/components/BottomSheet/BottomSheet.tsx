import { useEffect, useRef, type ReactNode } from 'react';
import { CloseIcon } from '../Icons/Icons';

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus?.();
  }, []);

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className="relative max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-bg pb-[env(safe-area-inset-bottom)] outline-none"
      >
        <div className="sticky top-0 z-10 flex min-h-14 items-center bg-bg px-4">
          <h2 className="flex-1 text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-11 w-11 items-center justify-center rounded-full"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
