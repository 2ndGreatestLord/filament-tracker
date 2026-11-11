import { db, type StoredPrint } from './schema';

/**
 * Moves version 1 photos, stored as Blobs, into raw bytes. Runs at startup, outside the
 * Dexie upgrade, because reading a Blob isn't a database call and would end the upgrade's
 * transaction. A photo Safari can no longer read is dropped and the print marked
 * "Photo needed", so it can be added again from Print Detail.
 */
export async function migrateLegacyPhotos(): Promise<number> {
  const legacy = (await db.prints.toArray()).filter((print) => print.photo instanceof Blob);

  for (const row of legacy) {
    let update: Partial<StoredPrint>;
    try {
      const photo = row.photo as Blob;
      update = { photoData: await photo.arrayBuffer(), photoType: photo.type || 'image/jpeg' };
    } catch {
      update = { photoPending: true };
    }
    await db.transaction('rw', db.prints, async () => {
      const current = await db.prints.get(row.id);
      if (!current) return;
      const { photo: _legacy, ...rest } = current;
      await db.prints.put({ ...rest, ...update });
    });
  }
  return legacy.length;
}
