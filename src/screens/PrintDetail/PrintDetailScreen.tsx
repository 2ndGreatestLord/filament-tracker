import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BottomSheet } from '../../components/BottomSheet/BottomSheet';
import { Button } from '../../components/Button/Button';
import { GramsField } from '../../components/GramsField/GramsField';
import { NotFound } from '../../components/NotFound/NotFound';
import { PhotoPicker } from '../../components/PhotoPicker/PhotoPicker';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SpoolGraphic } from '../../components/SpoolGraphic/SpoolGraphic';
import { useToast } from '../../components/Toast/Toast';
import { usePrint } from '../../db/hooks';
import {
  deletePrint,
  restorePrint,
  setPrintPhoto,
  updatePrintGrams,
  type PrintFilamentWithSpool,
} from '../../db/repository';
import { formatDate } from '../../domain/date';
import {
  computeRemaining,
  formatGrams,
  fractionRemaining,
  roundGrams,
  spoolCapacity,
} from '../../domain/grams';

/** What the spool would hold if this print's row used `grams` instead. */
function remainingIfEdited(filament: PrintFilamentWithSpool, grams: number): number {
  const { spool } = filament;
  return computeRemaining(spool, [roundGrams(spool.used - filament.grams + grams)]);
}

export function PrintDetailScreen() {
  const { id = '' } = useParams();
  const summary = usePrint(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [edits, setEdits] = useState<Record<string, number> | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (summary === undefined) return null;
  if (summary === null) return <NotFound what="Print" backTo="/prints" />;

  const { print, filaments, totalGrams } = summary;

  const startEditing = () =>
    setEdits(Object.fromEntries(filaments.map((filament) => [filament.id, filament.grams])));

  const saveEdits = async () => {
    if (!edits) return;
    try {
      await updatePrintGrams(print.id, edits);
      setEdits(null);
      toast('Grams updated');
    } catch {
      toast('Couldn’t update the grams');
    }
  };

  const remove = async () => {
    try {
      const snapshot = await deletePrint(print.id);
      navigate('/prints', { replace: true });
      toast('Print deleted', { undo: () => restorePrint(snapshot) });
    } catch {
      setConfirmingDelete(false);
      toast('Couldn’t delete the print');
    }
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-6">
      <ScreenHeader title={print.name} backTo="/prints" />
      <div className="flex flex-col gap-5 px-4 pt-2">
        <div className="flex flex-col items-center gap-1">
          <PhotoPicker
            photo={print.photo}
            alt={`Photo of ${print.name}`}
            emptyLabel="Tap to add a photo"
            onPhoto={async (photo) => {
              await setPrintPhoto(print.id, photo);
              toast('Photo saved');
            }}
          />
          {print.photo && <p className="text-sm text-muted">Tap the photo to replace it</p>}
          {print.photoPending && (
            <span className="rounded-full bg-surface-2 px-3 py-1 text-sm font-medium">
              Photo needed
            </span>
          )}
        </div>

        <p className="text-center text-muted">
          {formatDate(print.createdAt)} · {formatGrams(totalGrams)} total
        </p>

        <section>
          <h2 className="mb-2 font-semibold">Filaments</h2>
          <ul className="flex flex-col gap-2">
            {filaments.map((filament) => {
              const { spool } = filament;
              const label = `${spool.material} · ${spool.finish}`;
              const edited = edits?.[filament.id];
              return (
                <li key={filament.id} className="rounded-2xl bg-surface p-3">
                  <Link to={`/filament/${spool.id}`} className="flex items-center gap-3">
                    <SpoolGraphic
                      paint={spool}
                      fraction={fractionRemaining(spool.remaining, spoolCapacity(spool))}
                      className="h-12 w-12"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{label}</span>
                      {spool.colorName && (
                        <span className="block text-sm text-muted">{spool.colorName}</span>
                      )}
                    </span>
                    {edited === undefined && (
                      <span className="font-semibold">{formatGrams(filament.grams)}</span>
                    )}
                  </Link>
                  {edited !== undefined && (
                    <div className="mt-3 flex flex-col gap-2">
                      <GramsField
                        value={edited}
                        label={`Grams of ${label}, slot ${filament.slot}`}
                        onChange={(grams) =>
                          setEdits((current) => ({ ...current, [filament.id]: grams }))
                        }
                      />
                      <p className="text-center text-sm text-muted">
                        {formatGrams(remainingIfEdited(filament, edited))} left after this change
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        {edits ? (
          <div className="flex gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setEdits(null)}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={() => void saveEdits()}>
              Save grams
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Button variant="secondary" onClick={startEditing}>
              Edit grams
            </Button>
            <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
              Delete
            </Button>
          </div>
        )}
      </div>

      {confirmingDelete && (
        <BottomSheet title="Delete this print?" onClose={() => setConfirmingDelete(false)}>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <p>The grams it used will go back to its spools.</p>
            <Button variant="danger" onClick={() => void remove()}>
              Delete print
            </Button>
            <Button variant="secondary" onClick={() => setConfirmingDelete(false)}>
              Keep it
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
