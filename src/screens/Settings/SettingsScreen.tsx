import { useState, type ChangeEvent, type ReactNode } from 'react';
import { BottomSheet } from '../../components/BottomSheet/BottomSheet';
import { Button, buttonClass } from '../../components/Button/Button';
import { INPUT_CLASS } from '../../components/FilamentForm/FilamentForm';
import { ScreenHeader } from '../../components/ScreenHeader/ScreenHeader';
import { useToast } from '../../components/Toast/Toast';
import {
  BackupError,
  eraseAllData,
  exportBackupText,
  importBackupText,
  parseBackup,
} from '../../db/backup';
import { getLowStockThreshold, setLowStockThreshold } from '../../db/settings';

const ERASE_WORD = 'ERASE';

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-2xl bg-surface p-4">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function downloadText(text: string, filename: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function SettingsScreen() {
  const toast = useToast();
  const [threshold, setThreshold] = useState(() => String(getLowStockThreshold()));
  const [thresholdError, setThresholdError] = useState('');
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [erasing, setErasing] = useState(false);
  const [eraseText, setEraseText] = useState('');
  const [busy, setBusy] = useState(false);

  const changeThreshold = (text: string) => {
    setThreshold(text);
    const grams = Number(text);
    if (text.trim() === '' || !Number.isFinite(grams) || grams < 0) {
      setThresholdError('Enter 0 g or more.');
      return;
    }
    setThresholdError('');
    setLowStockThreshold(grams);
  };

  const exportBackup = async () => {
    setBusy(true);
    try {
      const date = new Date().toISOString().slice(0, 10);
      downloadText(await exportBackupText(), `filament-tracker-backup-${date}.json`);
      toast('Backup exported');
    } catch {
      toast('Couldn’t export the backup');
    } finally {
      setBusy(false);
    }
  };

  const chooseImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      parseBackup(text);
      setPendingImport(text);
    } catch (error) {
      toast(error instanceof BackupError ? error.message : 'Couldn’t read that file');
    } finally {
      input.value = '';
    }
  };

  const confirmImport = async () => {
    if (pendingImport === null) return;
    setBusy(true);
    try {
      await importBackupText(pendingImport);
      setThreshold(String(getLowStockThreshold()));
      setThresholdError('');
      toast('Backup imported');
    } catch (error) {
      toast(error instanceof BackupError ? error.message : 'Couldn’t import that backup');
    } finally {
      setBusy(false);
      setPendingImport(null);
    }
  };

  const confirmErase = async () => {
    if (eraseText !== ERASE_WORD) return;
    setBusy(true);
    try {
      await eraseAllData();
      setThreshold(String(getLowStockThreshold()));
      setThresholdError('');
      toast('All data erased');
    } catch {
      toast('Couldn’t erase the data');
    } finally {
      setBusy(false);
      setErasing(false);
      setEraseText('');
    }
  };

  return (
    <div className="mx-auto min-h-dvh max-w-md pb-6">
      <ScreenHeader title="Settings" backTo="/filament" />
      <div className="flex flex-col gap-4 px-4 pt-2">
        <Card title="Low-stock threshold">
          <label className="block">
            <span className="mb-1 block text-sm text-muted">
              Spools below this many grams are marked Low
            </span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              className={INPUT_CLASS}
              value={threshold}
              onChange={(event) => changeThreshold(event.target.value)}
            />
          </label>
          {thresholdError && (
            <p role="alert" className="text-sm font-medium text-danger">
              {thresholdError}
            </p>
          )}
        </Card>

        <Card title="Backup">
          <p className="text-sm text-muted">
            Your data lives only on this device. Export a backup now and then to keep it safe.
          </p>
          <Button variant="secondary" disabled={busy} onClick={() => void exportBackup()}>
            Export backup
          </Button>
          <label
            className={buttonClass(
              'secondary',
              'cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-accent',
            )}
          >
            <input
              type="file"
              accept="application/json,.json"
              aria-label="Import backup"
              className="sr-only"
              onChange={(event) => void chooseImport(event)}
            />
            Import backup
          </label>
        </Card>

        <Card title="Danger zone">
          <Button variant="danger" onClick={() => setErasing(true)}>
            Erase all data
          </Button>
        </Card>
      </div>

      {pendingImport !== null && (
        <BottomSheet title="Replace all data?" onClose={() => setPendingImport(null)}>
          <div className="flex flex-col gap-3 px-4 pb-4">
            <p>Importing replaces every spool and print on this device with the backup.</p>
            <Button disabled={busy} onClick={() => void confirmImport()}>
              Replace with backup
            </Button>
            <Button variant="secondary" onClick={() => setPendingImport(null)}>
              Cancel
            </Button>
          </div>
        </BottomSheet>
      )}

      {erasing && (
        <BottomSheet
          title="Erase all data?"
          onClose={() => {
            setErasing(false);
            setEraseText('');
          }}
        >
          <div className="flex flex-col gap-3 px-4 pb-4">
            <p>This deletes every spool, print, and photo, and can’t be undone.</p>
            <label className="block">
              <span className="mb-1 block">Type {ERASE_WORD} to confirm</span>
              <input
                className={INPUT_CLASS}
                autoCapitalize="characters"
                autoComplete="off"
                value={eraseText}
                onChange={(event) => setEraseText(event.target.value)}
              />
            </label>
            <Button
              variant="danger"
              disabled={busy || eraseText !== ERASE_WORD}
              onClick={() => void confirmErase()}
            >
              Erase everything
            </Button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
