import type { ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { BackIcon } from '../Icons/Icons';

interface ScreenHeaderProps {
  title: string;
  /** Where Back goes when there is no history to return to. Leave out for no Back button. */
  backTo?: string;
  action?: ReactNode;
}

export function ScreenHeader({ title, backTo, action }: ScreenHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    if (location.key === 'default' && backTo) navigate(backTo, { replace: true });
    else navigate(-1);
  };

  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center gap-1 bg-bg/95 px-2 pt-[env(safe-area-inset-top)] backdrop-blur">
      {backTo && (
        <button
          type="button"
          onClick={goBack}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full"
        >
          <BackIcon />
        </button>
      )}
      <h1 className={`flex-1 truncate text-xl font-semibold ${backTo ? '' : 'pl-2'}`}>{title}</h1>
      {action}
    </header>
  );
}
