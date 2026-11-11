import { useState } from 'react';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SettingsLink } from '../../components/SettingsLink/SettingsLink';
import { SpoolGrid } from '../../components/SpoolGrid/SpoolGrid';
import { useSpools } from '../../db/hooks';
import { useLowStockThreshold } from '../../db/settings';

export function FilamentScreen() {
  const spools = useSpools();
  const threshold = useLowStockThreshold();
  const [showArchived, setShowArchived] = useState(false);

  const archivedCount = spools?.filter((spool) => spool.archived).length ?? 0;
  const visible = spools?.filter((spool) => showArchived || !spool.archived);

  return (
    <>
      <ScreenHeader title="Filament" action={<SettingsLink />} />
      {spools && spools.length === 0 && (
        <EmptyState
          message="No filament yet, add your first spool"
          actionLabel="Add Filament"
          to="/filament/new"
        />
      )}
      {spools && spools.length > 0 && visible && (
        <div className="px-3 pt-2">
          <SpoolGrid
            spools={visible}
            threshold={threshold}
            linkTo={(spool) => `/filament/${spool.id}`}
            addTo="/filament/new"
          />
          {archivedCount > 0 && (
            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className="mt-3 min-h-11 w-full text-sm text-muted underline"
            >
              {showArchived ? 'Hide archived' : `Show archived (${archivedCount})`}
            </button>
          )}
        </div>
      )}
    </>
  );
}
