import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Button } from '../../components/Button/Button';
import { PhotoPicker } from '../../components/PhotoPicker/PhotoPicker';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { useToast } from '../../components/Toast/Toast';
import { addPrint } from '../../db/repository';
import { canLeaveSlots, draftFilaments } from '../../domain/printDraft';
import { useDraft } from './AddPrintFlow';

export function StepPhoto() {
  const navigate = useNavigate();
  const toast = useToast();
  const { draft, setDraft } = useDraft();
  const [saving, setSaving] = useState(false);

  if (!canLeaveSlots(draft)) return <Navigate to="/prints/new" replace />;

  const save = async (options: { photo?: Blob; photoPending?: boolean }) => {
    setSaving(true);
    try {
      await addPrint({ name: draft.name, filaments: draftFilaments(draft), ...options });
      toast('Print saved');
      navigate('/prints', { replace: true });
    } catch {
      toast('Couldn’t save the print');
      setSaving(false);
    }
  };

  return (
    <>
      <ScreenHeader title="Photo" />
      <div className="flex flex-1 flex-col gap-3 px-4">
        <PhotoPicker
          photo={draft.photo}
          onPhoto={(photo) => setDraft((current) => ({ ...current, photo }))}
        />
        {draft.photo && (
          <button
            type="button"
            className="min-h-11 text-sm text-muted underline"
            onClick={() => setDraft(({ photo: _removed, ...rest }) => rest)}
          >
            Remove photo
          </button>
        )}
        <div className="sticky bottom-0 mt-auto flex flex-col gap-3 bg-bg py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <Button
            disabled={saving || !draft.photo}
            onClick={() => void save({ photo: draft.photo })}
          >
            Save
          </Button>
          {!draft.photo && (
            <div className="flex gap-3">
              <Button
                variant="secondary"
                className="flex-1"
                disabled={saving}
                onClick={() => void save({})}
              >
                Skip
              </Button>
              <Button
                variant="secondary"
                className="flex-1"
                disabled={saving}
                onClick={() => void save({ photoPending: true })}
              >
                Save later
              </Button>
            </div>
          )}
          <Button variant="secondary" disabled={saving} onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
      </div>
    </>
  );
}
