import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomSheet } from '../../components/BottomSheet/BottomSheet';
import { Button } from '../../components/Button/Button';
import { FilamentForm, INPUT_CLASS } from '../../components/FilamentForm/FilamentForm';
import { CloseIcon, PlusIcon } from '../../components/Icons/Icons';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SpoolGraphic } from '../../components/SpoolGraphic/SpoolGraphic';
import { SpoolGrid } from '../../components/SpoolGrid/SpoolGrid';
import { useSpools } from '../../db/hooks';
import { addSpool, type SpoolWithRemaining } from '../../db/repository';
import { useLowStockThreshold } from '../../db/settings';
import { formatGrams, fractionRemaining, spoolCapacity } from '../../domain/grams';
import { assignSlot, canLeaveSlots, clearSlot, SLOTS } from '../../domain/printDraft';
import type { Slot } from '../../domain/types';
import { useDraft } from './AddPrintFlow';

function spoolLabel(spool: SpoolWithRemaining): string {
  return `${spool.material} · ${spool.finish}`;
}

export function StepSlots() {
  const navigate = useNavigate();
  const { draft, setDraft } = useDraft();
  const spools = useSpools();
  const threshold = useLowStockThreshold();
  const [pickingSlot, setPickingSlot] = useState<Slot | null>(null);
  const [addingSpool, setAddingSpool] = useState(false);

  const closeSheet = () => {
    setPickingSlot(null);
    setAddingSpool(false);
  };

  const pick = (spoolId: string) => {
    if (pickingSlot === null) return;
    const slot = pickingSlot;
    setDraft((current) => assignSlot(current, slot, spoolId));
    closeSheet();
  };

  const usedElsewhere = new Set(
    SLOTS.filter((slot) => slot !== pickingSlot).flatMap((slot) => draft.spools[slot] ?? []),
  );
  const pickable = spools?.filter((spool) => !spool.archived) ?? [];

  return (
    <>
      <ScreenHeader title="Add Print" backTo="/prints" />
      <div className="flex flex-1 flex-col gap-5 px-4 pt-2">
        <label className="block">
          <span className="mb-1 block font-semibold">Name</span>
          <input
            className={INPUT_CLASS}
            value={draft.name}
            onChange={(event) => {
              const name = event.target.value;
              setDraft((current) => ({ ...current, name }));
            }}
          />
        </label>

        <div>
          <h2 className="mb-2 font-semibold">Filament slots</h2>
          <ul className="grid grid-cols-2 gap-3">
            {SLOTS.map((slot) => {
              const spool = spools?.find((candidate) => candidate.id === draft.spools[slot]);
              return (
                <li key={slot} className="relative">
                  <button
                    type="button"
                    aria-label={
                      spool ? `Slot ${slot}: ${spoolLabel(spool)}` : `Slot ${slot}: add filament`
                    }
                    onClick={() => setPickingSlot(slot)}
                    className={`flex min-h-40 w-full flex-col items-center justify-center gap-1 rounded-2xl p-2 ${
                      spool
                        ? 'border-2 border-line bg-surface'
                        : 'border-2 border-dashed border-line text-muted'
                    }`}
                  >
                    {spool ? (
                      <>
                        <SpoolGraphic
                          colorHex={spool.colorHex}
                          fraction={fractionRemaining(spool.remaining, spoolCapacity(spool))}
                          className="h-20 w-20"
                        />
                        <span className="text-sm">{spoolLabel(spool)}</span>
                        <span className="text-xs text-muted">{formatGrams(spool.remaining)}</span>
                      </>
                    ) : (
                      <PlusIcon className="h-8 w-8" />
                    )}
                  </button>
                  {spool && (
                    <button
                      type="button"
                      aria-label={`Clear slot ${slot}`}
                      onClick={() => setDraft((current) => clearSlot(current, slot))}
                      className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center text-muted"
                    >
                      <CloseIcon className="h-5 w-5" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="sticky bottom-0 mt-auto bg-bg py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            className="w-full"
            disabled={!canLeaveSlots(draft)}
            onClick={() => navigate('/prints/new/grams/0')}
          >
            Next
          </Button>
        </div>
      </div>

      {pickingSlot !== null && (
        <BottomSheet title={addingSpool ? 'Add Filament' : 'Choose filament'} onClose={closeSheet}>
          {addingSpool ? (
            <FilamentForm
              submitLabel="Save and use"
              onSubmit={async (fields) => {
                const spool = await addSpool(fields);
                pick(spool.id);
              }}
            />
          ) : (
            <div className="px-3 pb-4">
              <SpoolGrid
                spools={pickable}
                threshold={threshold}
                onPick={(spool) => pick(spool.id)}
                disabledIds={usedElsewhere}
                onAdd={() => setAddingSpool(true)}
              />
            </div>
          )}
        </BottomSheet>
      )}
    </>
  );
}
