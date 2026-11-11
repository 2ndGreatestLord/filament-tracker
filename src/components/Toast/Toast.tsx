import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export const UNDO_MS = 5000;
const TOAST_MS = 2500;

interface ToastOptions {
  /** Offers an Undo button for 5 seconds. */
  undo?: () => void | Promise<void>;
}

interface ToastState extends ToastOptions {
  id: number;
  message: string;
}

type ShowToast = (message: string, options?: ToastOptions) => void;

const ToastContext = createContext<ShowToast | null>(null);

export function useToast(): ShowToast {
  const show = useContext(ToastContext);
  if (!show) throw new Error('useToast must be used inside ToastProvider');
  return show;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const nextId = useRef(1);

  const show = useCallback<ShowToast>((message, options) => {
    setToast({ id: nextId.current++, message, ...options });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), toast.undo ? UNDO_MS : TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const undo = async () => {
    if (!toast?.undo) return;
    const action = toast.undo;
    setToast(null);
    try {
      await action();
      show('Restored');
    } catch {
      show('Couldn’t undo that');
    }
  };

  const value = useMemo(() => show, [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 pb-[env(safe-area-inset-bottom)]"
      >
        {toast && (
          <div className="pointer-events-auto flex min-h-12 max-w-sm items-center gap-3 rounded-xl border border-line bg-surface-2 px-4 py-2 text-ink shadow-lg">
            <span>{toast.message}</span>
            {toast.undo && (
              <button
                type="button"
                onClick={() => void undo()}
                className="min-h-11 px-2 font-semibold text-accent"
              >
                Undo
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
