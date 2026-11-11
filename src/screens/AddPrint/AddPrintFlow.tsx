import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { clearDraft, loadDraft, saveDraft } from '../../db/draftStorage';
import { EMPTY_DRAFT, type PrintDraft } from '../../domain/printDraft';

export interface DraftContext {
  draft: PrintDraft;
  setDraft: Dispatch<SetStateAction<PrintDraft>>;
}

/** Holds the one draft shared by every step, so Back never loses input. */
export function AddPrintFlow() {
  const [draft, setDraft] = useState<PrintDraft>(() => loadDraft() ?? EMPTY_DRAFT);

  useEffect(() => saveDraft(draft), [draft]);
  // Leaving the flow discards the draft. A page reload never runs this, so it survives one.
  useEffect(() => clearDraft, []);

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Outlet context={{ draft, setDraft } satisfies DraftContext} />
    </div>
  );
}

export function useDraft(): DraftContext {
  return useOutletContext<DraftContext>();
}
