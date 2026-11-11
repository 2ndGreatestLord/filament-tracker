import { Link } from 'react-router-dom';
import { GearIcon } from '../Icons/Icons';

export function SettingsLink() {
  return (
    <Link
      to="/settings"
      aria-label="Settings"
      className="flex h-11 w-11 items-center justify-center rounded-full text-muted"
    >
      <GearIcon />
    </Link>
  );
}
