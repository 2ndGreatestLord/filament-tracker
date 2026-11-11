import { useNavigate } from 'react-router-dom';
import { FilamentForm } from '../../components/FilamentForm/FilamentForm';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { useToast } from '../../components/Toast/Toast';
import { addSpool } from '../../db/repository';

export function AddFilamentScreen() {
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <ScreenHeader title="Add Filament" backTo="/filament" />
      <FilamentForm
        onSubmit={async (fields) => {
          await addSpool(fields);
          toast('Filament added');
          navigate('/filament', { replace: true });
        }}
      />
    </div>
  );
}
