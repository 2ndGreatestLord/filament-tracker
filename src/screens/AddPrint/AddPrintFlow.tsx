import { useState, type Dispatch, type SetStateAction } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { EMPTY_DRAFT, type PrintDraft } from '../../domain/printDraft';

export interface DraftContext {
  draft: PrintDraft;
  setDraft: Dispatch<SetStateAction<PrintDraft>>;
}

/** Holds the one draft shared by every step, so Back never loses input. */
export function AddPrintFlow() {
  const [draft, setDraft] = useState<PrintDraft>(EMPTY_DRAFT);
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Outlet context={{ draft, setDraft } satisfies DraftContext} />
    </div>
  );
}

export function useDraft(): DraftContext {
  return useOutletContext<DraftContext>();
}
