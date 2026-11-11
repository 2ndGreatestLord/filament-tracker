import { ScreenHeader } from '../ScreenHeader/ScreenHeader';

export function NotFound({ what, backTo }: { what: string; backTo: string }) {
  return (
    <div className="mx-auto min-h-dvh max-w-md">
      <ScreenHeader title={what} backTo={backTo} />
      <p className="px-4 py-8 text-center text-muted">This {what.toLowerCase()} no longer exists.</p>
    </div>
  );
}
