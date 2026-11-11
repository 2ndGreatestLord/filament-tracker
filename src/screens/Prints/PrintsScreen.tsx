import { Link } from 'react-router-dom';
import { buttonClass } from '../../components/Button/Button';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { CameraIcon, PlusIcon } from '../../components/Icons/Icons';
import { useObjectUrl } from '../../components/PhotoPicker/useObjectUrl';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { SettingsLink } from '../../components/SettingsLink/SettingsLink';
import { usePrints } from '../../db/hooks';
import type { PrintSummary } from '../../db/repository';
import { formatGrams } from '../../domain/grams';

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function PrintRow({ summary }: { summary: PrintSummary }) {
  const { print, filaments, totalGrams } = summary;
  const thumbnail = useObjectUrl(print.photo);
  return (
    <li>
      <Link
        to={`/prints/${print.id}`}
        className="flex items-center gap-3 rounded-2xl bg-surface p-2"
      >
        {thumbnail ? (
          <img src={thumbnail} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-surface-2 text-muted">
            <CameraIcon />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{print.name}</p>
          <p className="text-sm text-muted">
            {formatDate(print.createdAt)} · {formatGrams(totalGrams)}
          </p>
          <div className="mt-1 flex items-center gap-1">
            {filaments.map((filament) => (
              <span
                key={filament.id}
                role="img"
                aria-label={`${filament.spool.colorName ?? filament.spool.colorHex} ${filament.spool.material}`}
                className="h-3.5 w-3.5 rounded-full border border-line"
                style={{ backgroundColor: filament.spool.colorHex }}
              />
            ))}
            {print.photoPending && (
              <span className="ml-1 rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium">
                Photo needed
              </span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

export function PrintsScreen() {
  const prints = usePrints();

  return (
    <>
      <ScreenHeader title="Prints" action={<SettingsLink />} />
      {prints && prints.length === 0 && (
        <EmptyState
          message="No prints yet, log your first one"
          actionLabel="Add Print"
          to="/prints/new"
        />
      )}
      {prints && prints.length > 0 && (
        <>
          <ul className="flex flex-col gap-2 px-3 pt-2 pb-20">
            {prints.map((summary) => (
              <PrintRow key={summary.print.id} summary={summary} />
            ))}
          </ul>
          <div className="fixed inset-x-0 bottom-[calc(3.75rem+env(safe-area-inset-bottom))] z-10 mx-auto max-w-3xl px-3 pb-3">
            <Link to="/prints/new" className={buttonClass('primary', 'w-full shadow-lg')}>
              <PlusIcon />
              Add Print
            </Link>
          </div>
        </>
      )}
    </>
  );
}
