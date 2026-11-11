import { PICK_MAX_EDGE, type Pixels } from '../../domain/eyedropper';
import { fitWithin } from '../../domain/photo';
import { loadImage } from '../PhotoPicker/compressPhoto';

/**
 * Decodes a photo and returns its pixels, shrunk so sampling is quick. The photo itself
 * is never stored; it's only used to pick a color.
 */
export async function loadPhotoPixels(file: Blob): Promise<Pixels> {
  const image = await loadImage(file);
  const { width, height } = fitWithin(image.width, image.height, PICK_MAX_EDGE);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not read that image.');
  context.drawImage(image, 0, 0, width, height);
  if ('close' in image) image.close();
  const { data } = context.getImageData(0, 0, width, height);
  return { width, height, data };
}
