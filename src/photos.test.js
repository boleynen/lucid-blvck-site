import test from 'node:test';
import assert from 'node:assert/strict';
import { publishPhotos, recordPhotos, removeRecordPhotos } from './photos.js';

const photos = [1, 2, 3].map(id => ({ id: String(id), file: { type: 'image/jpeg', size: 100 } }));

test('publishes the selected cover and retains every album photo', async () => {
  let saved;
  let count = 0;
  await publishPhotos({ photos, coverId: '2', userId: 'admin',
    upload: async () => `photo-${++count}`, remove: async () => assert.fail('No cleanup after success'),
    insert: async record => { saved = record; }, record: { title: 'Insect' } });
  assert.equal(saved.image_url, 'photo-2');
  assert.equal(saved.storage_path, saved.images[1].storage_path);
  assert.equal(saved.images.length, 3);
  assert.equal(saved.title, 'Insect');
  assert.deepEqual(recordPhotos(saved).map(photo => photo.image_url), ['photo-2', 'photo-1', 'photo-3']);
});

test('supports legacy records with only a cover', () => {
  assert.deepEqual(recordPhotos({ image_url: 'old', storage_path: 'old.jpg' }), [{ image_url: 'old', storage_path: 'old.jpg' }]);
});

test('cleans up partial uploads without publishing on upload failure', async () => {
  const removed = [];
  let count = 0;
  await assert.rejects(publishPhotos({ photos, coverId: '1', userId: 'admin', record: {},
    upload: async () => { if (++count === 2) throw Error('Upload failed'); return 'first'; },
    remove: async path => removed.push(path), insert: async () => assert.fail('Must not publish') }), /Upload failed/);
  assert.equal(removed.length, 2);
});

test('cleans every uploaded image and explains a missing migration', async () => {
  const removed = [];
  await assert.rejects(publishPhotos({ photos, coverId: '3', userId: 'admin', record: {},
    upload: async (_, path) => path, remove: async path => removed.push(path),
    insert: async () => { throw Error("Could not find the 'images' column in the schema cache"); } }), /multi-photo-setup.sql/);
  assert.equal(removed.length, 3);
});

test('rejects invalid files and invalid cover before uploading', async () => {
  const options = { photos, coverId: 'absent', upload: async () => assert.fail('Must not upload') };
  await assert.rejects(publishPhotos(options), /cover/);
  await assert.rejects(publishPhotos({ ...options, photos: [{ id: '1', file: { type: 'text/plain', size: 100 } }] }), /JPG/);
});

test('removes the cover and album files once, including legacy records', async () => {
  const removed = [];
  await removeRecordPhotos({ storage_path: 'cover', images: [{ storage_path: 'cover' }, { storage_path: 'extra' }] }, async path => removed.push(path));
  assert.deepEqual(removed, ['cover', 'extra']);
  await removeRecordPhotos({ storage_path: 'legacy' }, async path => removed.push(path));
  assert.equal(removed.at(-1), 'legacy');
});
