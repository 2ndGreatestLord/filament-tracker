import { Link } from 'react-router-dom';
import type { SpoolWithRemaining } from '../../db/repository';
import { PlusIcon } from '../Icons/Icons';
import { SpoolTile } from '../SpoolTile/SpoolTile';

const ADD_CLASS =
  'flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line text-muted';

interface SpoolGridProps {
  spools: readonly SpoolWithRemaining[];
  threshold: number;
  /** Tiles link to Spool Detail when given. */
  linkTo?: (spool: SpoolWithRemaining) => string;
  /** Tiles act as buttons when given. */
  onPick?: (spool: SpoolWithRemaining) => void;
  disabledIds?: ReadonlySet<string>;
  addTo?: string;
  onAdd?: () => void;
}

export function SpoolGrid({ spools, threshold, linkTo, onPick, disabledIds, addTo, onAdd }: SpoolGridProps) {
  const addContent = (
    <>
      <PlusIcon className="h-8 w-8" />
      <span>Add filament</span>
    </>
  );

  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {spools.map((spool) => (
        <li key={spool.id}>
          <SpoolTile
            spool={spool}
            threshold={threshold}
            to={linkTo?.(spool)}
            onPick={onPick ? () => onPick(spool) : undefined}
            disabled={disabledIds?.has(spool.id)}
          />
        </li>
      ))}
      <li>
        {addTo ? (
          <Link to={addTo} className={ADD_CLASS}>
            {addContent}
          </Link>
        ) : (
          <button type="button" onClick={onAdd} className={ADD_CLASS}>
            {addContent}
          </button>
        )}
      </li>
    </ul>
  );
}
