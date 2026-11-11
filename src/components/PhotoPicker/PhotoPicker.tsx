import { useState, type ChangeEvent } from 'react';
import { CameraIcon } from '../Icons/Icons';
import { useToast } from '../Toast/Toast';
import { compressPhoto } from './compressPhoto';
import { useObjectUrl } from './useObjectUrl';

interface PhotoPickerProps {
  photo?: Blob;
  onPhoto: (photo: Blob) => void | Promise<void>;
  emptyLabel?: string;
}

/** A dashed photo frame. Tapping it opens the camera, with a link for the photo library. */
export function PhotoPicker({ photo, onPhoto, emptyLabel = 'Tap to take a photo' }: PhotoPickerProps) {
  const toast = useToast();
  const url = useObjectUrl(photo);
  const [busy, setBusy] = useState(false);

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      await onPhoto(await compressPhoto(file));
    } catch {
      toast('Couldn’t read that photo');
    } finally {
      setBusy(false);
      input.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <label className="flex aspect-square w-full max-w-72 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed border-line text-muted has-focus-visible:outline-2 has-focus-visible:outline-accent">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          aria-label="Take photo"
          className="sr-only"
          onChange={(event) => void handleFile(event)}
        />
        {url ? (
          <img src={url} alt="Selected print" className="h-full w-full object-cover" />
        ) : (
          <>
            <CameraIcon className="h-10 w-10" />
            <span>{busy ? 'Processing…' : emptyLabel}</span>
          </>
        )}
      </label>
      <label className="flex min-h-11 cursor-pointer items-center font-semibold text-accent has-focus-visible:outline-2 has-focus-visible:outline-accent">
        <input
          type="file"
          accept="image/*"
          aria-label="Choose from library"
          className="sr-only"
          onChange={(event) => void handleFile(event)}
        />
        Choose from library
      </label>
    </div>
  );
}
