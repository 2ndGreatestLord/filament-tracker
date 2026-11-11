import { Link } from 'react-router-dom';
import { buttonClass } from '../Button/Button';
import { PlusIcon } from '../Icons/Icons';
import { SpoolGraphic } from '../SpoolGraphic/SpoolGraphic';

interface EmptyStateProps {
  message: string;
  actionLabel: string;
  to: string;
}

export function EmptyState({ message, actionLabel, to }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <SpoolGraphic colorHex="#5eb1ff" fraction={0} className="h-32 w-32 opacity-70" />
      <p className="text-lg">{message}</p>
      <Link to={to} className={buttonClass('primary', 'w-full max-w-xs')}>
        <PlusIcon />
        {actionLabel}
      </Link>
    </div>
  );
}
