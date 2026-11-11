import { useNavigate, useParams } from 'react-router-dom';
import { FilamentForm } from '../../components/FilamentForm/FilamentForm';
import { NotFound } from '../../components/NotFound/NotFound';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { useToast } from '../../components/Toast/Toast';
import { useSpoolDetail } from '../../db/hooks';
import { updateSpool } from '../../db/repository';
import { filamentFieldsToForm } from '../../domain/filamentForm';

export function EditFilamentScreen() {
  const { id = '' } = useParams();
  const spool = useSpoolDetail(id);
  const navigate = useNavigate();
  const toast = useToast();

  if (spool === undefined) return null;
  if (spool === null) return <NotFound what="Spool" backTo="/filament" />;

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <ScreenHeader title="Edit Filament" backTo={`/filament/${spool.id}`} />
      <FilamentForm
        initial={filamentFieldsToForm(spool)}
        onSubmit={async (fields) => {
          await updateSpool(spool.id, fields);
          toast('Filament updated');
          navigate(`/filament/${spool.id}`, { replace: true });
        }}
      />
    </div>
  );
}
