import { NavLink, Outlet } from 'react-router-dom';
import { PrintsIcon, SpoolIcon } from '../Icons/Icons';

const tabClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
    isActive ? 'text-accent' : 'text-muted'
  }`;

export function TabLayout() {
  return (
    <div className="mx-auto min-h-dvh max-w-3xl pb-24">
      <main>
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto flex max-w-3xl">
          <NavLink to="/filament" className={tabClass}>
            <SpoolIcon />
            Filament
          </NavLink>
          <NavLink to="/prints" className={tabClass}>
            <PrintsIcon />
            Prints
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
