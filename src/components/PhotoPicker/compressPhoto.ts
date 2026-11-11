import { fitWithin, PHOTO_QUALITY } from '../../domain/photo';

type LoadedImage = ImageBitmap | HTMLImageElement;

function loadWithElement(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image.'));
    };
    image.src = url;
  });
}

async function loadImage(file: Blob): Promise<LoadedImage> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return loadWithElement(file);
  }
}

/** Shrinks a photo to at most 1280 px on its longest side, as a JPEG at about 0.8 quality. */
export async function compressPhoto(file: Blob): Promise<Blob> {
  const image = await loadImage(file);
  const { width, height } = fitWithin(image.width, image.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not process that image.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);
  if ('close' in image) image.close();

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not process that image.'))),
      'image/jpeg',
      PHOTO_QUALITY,
    );
  });
}
