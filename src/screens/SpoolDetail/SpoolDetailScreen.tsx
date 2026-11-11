import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BottomSheet } from '../../components/BottomSheet/BottomSheet';
import { Button, buttonClass } from '../../components/Button/Button';
import { INPUT_CLASS } from '../../components/FilamentForm/FilamentForm';
import { NotFound } from '../../components/NotFound/NotFound';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SpoolGraphic } from '../../components/SpoolGraphic/SpoolGraphic';
import { useToast } from '../../components/Toast/Toast';
import { useSpoolDetail } from '../../db/hooks';
import {
  adjustSpoolRemaining,
  deleteSpool,
  restoreSpool,
  setSpoolArchived,
} from '../../db/repository';
import { useLowStockThreshold } from '../../db/settings';
import { formatDate } from '../../domain/date';
import { formatGrams, fractionRemaining, spoolCapacity } from '../../domain/grams';
import { paintDescription } from '../../domain/paint';
import { getStockStatus, stockLabel } from '../../domain/stock';

type Sheet = 'adjust' | 'blocked' | null;

function Attribute({ name, value }: { name: string; value?: string }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted">{name}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

export function SpoolDetailScreen() {
  const { id = '' } = useParams();
  const spool = useSpoolDetail(id);
  const threshold = useLowStockThreshold();
  const navigate = useNavigate();
  const toast = useToast();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [measured, setMeasured] = useState('');
  const [adjustError, setAdjustError] = useState('');

  if (spool === undefined) return null;
  if (spool === null) return <NotFound what="Spool" backTo="/filament" />;

  const status = getStockStatus(spool.remaining, threshold);
  const label = stockLabel(status);
  const title = `${spool.material} · ${spool.finish}`;
  const fraction = fractionRemaining(spool.remaining, spoolCapacity(spool));

  const openAdjust = () => {
    setMeasured(String(spool.remaining));
    setAdjustError('');
    setSheet('adjust');
  };

  const saveAdjustment = async (event: FormEvent) => {
    event.preventDefault();
    const grams = Number(measured);
    if (measured.trim() === '' || !Number.isFinite(grams) || grams < 0) {
      setAdjustError('Enter a weight of 0 g or more.');
      return;
    }
    await adjustSpoolRemaining(spool.id, grams);
    setSheet(null);
    toast('Remaining updated');
  };

  const toggleArchive = async () => {
    await setSpoolArchived(spool.id, !spool.archived);
    setSheet(null);
    toast(spool.archived ? 'Spool restored' : 'Spool archived');
  };

  const remove = async () => {
    if (spool.history.length > 0) {
      setSheet('blocked');
      return;
    }
    const deleted = await deleteSpool(spool.id);
    navigate('/filament', { replace: true });
    toast('Spool deleted', { undo: () => restoreSpool(deleted) });
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-6">
      <ScreenHeader title={title} backTo="/filament" />
      <div className="flex flex-col gap-5 px-4 pt-2">
        <div className="flex flex-col items-center gap-1">
          <SpoolGraphic
            paint={spool}
            fraction={fraction}
            title={`${spool.colorName ?? 'Filament'} spool, ${Math.round(fraction * 100)}% remaining`}
            className="h-56 w-56"
          />
          <p className="text-3xl font-semibold">{formatGrams(spool.remaining)}</p>
          <p className="text-muted">remaining · {formatGrams(spool.used)} used</p>
          {label && (
            <p className={`font-semibold ${status === 'low' ? 'text-warn' : 'text-danger'}`}>
              {label}
            </p>
          )}
          {spool.archived && <p className="text-muted">Archived</p>}
        </div>

        <dl className="divide-y divide-line rounded-2xl bg-surface px-3">
          <Attribute name="Material" value={spool.material} />
          <Attribute name="Finish" value={spool.finish} />
          <Attribute name="Color" value={paintDescription(spool, spool.colorName)} />
          <Attribute name="Brand" value={spool.brand} />
          <Attribute
            name="Price paid"
            value={spool.price !== undefined ? spool.price.toFixed(2) : undefined}
          />
          <Attribute name="Starting weight" value={formatGrams(spool.startGrams)} />
          <Attribute
            name="Full spool size"
            value={spool.spoolSizeGrams ? formatGrams(spool.spoolSizeGrams) : undefined}
          />
          <Attribute
            name="Adjustment"
            value={spool.adjustmentGrams ? formatGrams(spool.adjustmentGrams) : undefined}
          />
          <Attribute name="Added" value={formatDate(spool.createdAt)} />
        </dl>

        <section>
          <h2 className="mb-2 font-semibold">Usage history</h2>
          {spool.history.length === 0 ? (
            <p className="text-muted">Not used in any prints yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {spool.history.map(({ print, grams }) => (
                <li key={print.id}>
                  <Link
                    to={`/prints/${print.id}`}
                    className="flex min-h-12 items-center justify-between gap-3 rounded-xl bg-surface px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{print.name}</span>
                      <span className="block text-sm text-muted">
                        {formatDate(print.createdAt)}
                      </span>
                    </span>
                    <span className="font-semibold">{formatGrams(grams)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-3">
          <Link to={`/filament/${spool.id}/edit`} className={buttonClass('secondary')}>
            Edit
          </Link>
          <Button variant="secondary" onClick={openAdjust}>
            Adjust remaining
          </Button>
          <Button variant="secondary" onClick={() => void toggleArchive()}>
            {spool.archived ? 'Unarchive' : 'Archive'}
          </Button>
          <Button variant="danger" onClick={() => void remove()}>
            Delete
          </Button>
        </div>
      </div>

      {sheet === 'adjust' && (
        <BottomSheet title="Adjust remaining" onClose={() => setSheet(null)}>
          <form
            onSubmit={(event) => void saveAdjustment(event)}
            noValidate
            className="flex flex-col gap-3 px-4 pb-4"
          >
            <label className="block">
              <span className="mb-1 block">Grams of filament left on the spool</span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                className={INPUT_CLASS}
                value={measured}
                onChange={(event) => setMeasured(event.target.value)}
              />
            </label>
            {adjustError && (
              <p role="alert" className="text-sm font-medium text-danger">
                {adjustError}
              </p>
            )}
            <Button type="submit">Save</Button>
          </form>
        </BottomSheet>
      )}

      {sheet === 'blocked' && (
        <BottomSheet title="Can’t delete this spool" onClose={() => setSheet(null)}>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <p>
              {spool.history.length === 1
                ? '1 print uses this spool.'
                : `${spool.history.length} prints use this spool.`}{' '}
              You can archive it instead, which hides it from the pickers.
            </p>
            {!spool.archived && <Button onClick={() => void toggleArchive()}>Archive</Button>}
            <Button variant="secondary" onClick={() => setSheet(null)}>
              Close
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
