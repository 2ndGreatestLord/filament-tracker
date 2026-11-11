import { Link } from 'react-router-dom';
import type { SpoolWithRemaining } from '../../db/repository';
import { formatGrams, fractionRemaining, spoolCapacity } from '../../domain/grams';
import { getStockStatus, stockLabel, type StockStatus } from '../../domain/stock';
import { SpoolGraphic } from '../SpoolGraphic/SpoolGraphic';

const BORDER: Record<StockStatus, string> = {
  ok: 'border-line',
  low: 'border-warn',
  empty: 'border-danger',
};

const TEXT: Record<StockStatus, string> = {
  ok: 'text-ink',
  low: 'text-warn',
  empty: 'text-danger',
};

export const TILE_CLASS =
  'flex w-full flex-col items-center gap-1 rounded-2xl border-2 bg-surface p-3 text-center';

interface SpoolTileProps {
  spool: SpoolWithRemaining;
  threshold: number;
  to?: string;
  onPick?: () => void;
  disabled?: boolean;
}

export function SpoolTile({ spool, threshold, to, onPick, disabled }: SpoolTileProps) {
  const status = getStockStatus(spool.remaining, threshold);
  const label = stockLabel(status);
  const description = `${spool.material} · ${spool.finish}`;
  const className = `${TILE_CLASS} ${BORDER[status]} ${disabled ? 'opacity-50' : ''}`;

  const content = (
    <>
      <SpoolGraphic
        colorHex={spool.colorHex}
        fraction={fractionRemaining(spool.remaining, spoolCapacity(spool))}
        className="h-24 w-24"
      />
      <span className={`text-lg font-semibold ${TEXT[status]}`}>{formatGrams(spool.remaining)}</span>
      <span className="text-sm">{description}</span>
      {spool.colorName && <span className="text-xs text-muted">{spool.colorName}</span>}
      {label && <span className={`text-xs font-semibold ${TEXT[status]}`}>{label}</span>}
      {spool.archived && <span className="text-xs text-muted">Archived</span>}
      {disabled && <span className="text-xs text-muted">Already in a slot</span>}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={className} data-status={status}>
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      className={className}
      data-status={status}
    >
      {content}
    </button>
  );
}
