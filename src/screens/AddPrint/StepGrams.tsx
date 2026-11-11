import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { GramsDial } from '../../components/GramsDial/GramsDial';
import { GramsField } from '../../components/GramsField/GramsField';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { useSpools } from '../../db/hooks';
import type { SpoolWithRemaining } from '../../db/repository';
import {
  formatGrams,
  fractionRemaining,
  remainingAfter,
  spoolCapacity,
} from '../../domain/grams';
import { filledSlots, setSlotGrams } from '../../domain/printDraft';
import type { Slot } from '../../domain/types';
import { useDraft } from './AddPrintFlow';

interface GramsContentProps {
  slot: Slot;
  spool: SpoolWithRemaining;
}

function GramsContent({ slot, spool }: GramsContentProps) {
  const { draft, setDraft } = useDraft();
  const grams = draft.grams[slot] ?? 0;
  const after = remainingAfter(spool.remaining, grams);
  const setGrams = (value: number) => setDraft((current) => setSlotGrams(current, slot, value));

  return (
    <>
      <p className="text-center text-muted">
        {spool.material} · {spool.finish}
        {spool.colorName ? ` · ${spool.colorName}` : ''}
      </p>
      <GramsDial
        value={grams}
        onChange={setGrams}
        paint={spool}
        fraction={fractionRemaining(after, spoolCapacity(spool))}
        label="Grams dial"
      />
      <p className="text-center text-sm text-muted">
        Swipe around the spool to spin it, or flick it. One turn is 100 g.
      </p>
      <GramsField value={grams} onChange={setGrams} label="Grams used" />
      <p className="text-center">
        {formatGrams(spool.remaining)} left → {formatGrams(after)} after this print.
      </p>
      {grams > spool.remaining && (
        <p role="alert" className="text-center text-sm font-semibold text-warn">
          That’s more than this spool holds. It will be treated as reaching 0 g.
        </p>
      )}
    </>
  );
}

export function StepGrams() {
  const navigate = useNavigate();
  const params = useParams();
  const { draft } = useDraft();
  const spools = useSpools();

  const slots = filledSlots(draft);
  const index = Number(params.index);
  const slot = slots[index];

  // A reload clears the in-memory draft, so start the flow again.
  if (slot === undefined) return <Navigate to="/prints/new" replace />;
  if (!spools) return null;

  const spool = spools.find((candidate) => candidate.id === draft.spools[slot]);
  if (!spool) return <Navigate to="/prints/new" replace />;

  const isLast = index === slots.length - 1;

  return (
    <>
      <ScreenHeader title={`Filament ${index + 1} of ${slots.length}`} />
      <div className="flex flex-1 flex-col gap-3 px-4">
        <GramsContent key={slot} slot={slot} spool={spool} />
        <div className="sticky bottom-0 mt-auto flex gap-3 bg-bg py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button variant="secondary" className="flex-1" onClick={() => navigate(-1)}>
            Back
          </Button>
          <Button
            className="flex-1"
            onClick={() =>
              navigate(isLast ? '/prints/new/photo' : `/prints/new/grams/${index + 1}`)
            }
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
