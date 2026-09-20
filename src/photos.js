export const MAX_PHOTOS = 12;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function recordPhotos(record) {
  const photos = Array.isArray(record.images) ? record.images : [];
  const cover = { image_url: record.image_url, storage_path: record.storage_path };
  return [cover, ...photos].filter((photo, index, all) => photo.image_url &&
    all.findIndex((other) => other.image_url === photo.image_url) === index);
}

export async function removeRecordPhotos(record, remove) {
  const paths = [...new Set([record.storage_path, ...(record.images || []).map(photo => photo.storage_path)].filter(Boolean))];
  const results = await Promise.allSettled(paths.map(remove));
  if (results.some(result => result.status === 'rejected')) {
    throw new Error('The item was deleted, but some image files could not be removed.');
  }
}

// Keep the existing cover fields for listing cards, cart and Stripe compatibility.
export async function publishPhotos({ photos, coverId, userId, upload, remove, insert, record, onProgress = () => {} }) {
  if (!photos.length || photos.length > MAX_PHOTOS) throw new Error(`Choose 1–${MAX_PHOTOS} photos.`);
  if (photos.some(({ file }) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_PHOTO_BYTES)) {
    throw new Error('Use JPG, PNG or WebP images up to 10 MB each.');
  }
  const coverIndex = photos.findIndex(photo => photo.id === coverId);
  if (coverIndex < 0) throw new Error('Choose a cover photo.');
  const uploaded = [];
  const attemptedPaths = [];
  try {
    for (const { file } of photos) {
      const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
      const storage_path = `${userId}/${crypto.randomUUID()}.${extension}`;
      attemptedPaths.push(storage_path);
      onProgress(`Uploading photo ${uploaded.length + 1} of ${photos.length}…`);
      let image_url;
      try {
        image_url = await upload(file, storage_path);
      } catch (error) {
        // A rejected upload never created an object; do not report failed cleanup for it.
        if (error.status >= 400 && error.status < 500) attemptedPaths.pop();
        throw error;
      }
      uploaded.push({ image_url, storage_path });
    }
    const cover = uploaded[coverIndex];
    await insert({ ...record, ...cover, images: uploaded });
  } catch (error) {
    const cleanup = await Promise.allSettled(attemptedPaths.map(remove));
    const setupMissing = /images.*(column|schema)|column.*images/i.test(error.message);
    const message = setupMissing ? 'Photo albums need a database update. Run supabase/multi-photo-setup.sql in Supabase, then retry.' : error.message;
    throw new Error(message + (cleanup.some(result => result.status === 'rejected') ? ' Some uploaded files could not be cleaned up.' : ''));
  }
}
