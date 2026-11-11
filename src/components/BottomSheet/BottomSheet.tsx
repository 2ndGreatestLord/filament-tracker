import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { CloseIcon } from '../Icons/Icons';

const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), [tabindex="0"]';

// Sheets can stack, and can close in any order or all at once, so page scrolling is locked
// while any sheet is open and restored only when the last one closes.
let openSheets = 0;
let overflowBeforeSheets = '';

function lockScroll() {
  if (openSheets++ === 0) {
    overflowBeforeSheets = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
}

function unlockScroll() {
  if (--openSheets === 0) document.body.style.overflow = overflowBeforeSheets;
}

interface BottomSheetProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ title, onClose, children }: BottomSheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    lockScroll();
    panel.current?.focus();
    return () => {
      unlockScroll();
      previous?.focus?.();
    };
  }, []);

  const handleKey = (event: KeyboardEvent<HTMLDivElement>) => {
    // A sheet can open on top of another (the photo color picker inside Add Filament in the
    // Add Print flow). Keys belong to the top sheet only, so Escape closes just that one.
    event.stopPropagation();
    if (event.key === 'Escape') {
      onClose();
      return;
    }
    if (event.key !== 'Tab' || !panel.current) return;
    const focusable = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panel.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKey}
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
