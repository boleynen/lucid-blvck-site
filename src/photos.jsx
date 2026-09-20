import React, { useEffect, useId, useState } from 'react';
import { MAX_PHOTOS, MAX_PHOTO_BYTES, recordPhotos } from './photos.js';

function PhotoPreview({ file }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    const preview = URL.createObjectURL(file);
    setUrl(preview);
    return () => URL.revokeObjectURL(preview);
  }, [file]);
  return <img src={url || undefined} alt={file.name} />;
}

export function PhotoPicker({ label, photos, coverId, onChange, disabled }) {
  const group = useId();
  const [error, setError] = useState('');
  function addFiles(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length) return;
    if (photos.length + files.length > MAX_PHOTOS) return setError(`Choose at most ${MAX_PHOTOS} photos.`);
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > MAX_PHOTO_BYTES)) {
      return setError('Use JPG, PNG or WebP images up to 10 MB each.');
    }
    const next = [...photos, ...files.map(file => ({ id: crypto.randomUUID(), file }))];
    setError('');
    onChange(next, coverId || next[0].id);
  }
  function removePhoto(id) {
    const next = photos.filter(photo => photo.id !== id);
    onChange(next, coverId === id ? next[0]?.id || '' : coverId);
    setError('');
  }
  return <fieldset className="photo-picker" disabled={disabled}>
    <legend>{label}</legend>
    <p>Add up to {MAX_PHOTOS} photos, then choose the cover shown in the overview.</p>
    <label className="photo-picker-input">Add photos
      <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={addFiles} />
    </label>
    {error && <p role="alert">{error}</p>}
    <div className="photo-picker-grid">{photos.map((photo, index) => <div className="photo-picker-card" key={photo.id}>
      <PhotoPreview file={photo.file} />
      <label><input type="radio" name={group} checked={coverId === photo.id} onChange={() => onChange(photos, photo.id)} />{coverId === photo.id ? 'Cover photo' : `Use photo ${index + 1} as cover`}</label>
      <button type="button" onClick={() => removePhoto(photo.id)} aria-label={`Remove photo ${index + 1}`}>Remove</button>
    </div>)}</div>
  </fieldset>;
}

export function PhotoGallery({ record }) {
  const photos = recordPhotos(record);
  const [selectedUrl, setSelectedUrl] = useState(record.image_url);
  const index = Math.max(0, photos.findIndex(photo => photo.image_url === selectedUrl));
  const selected = photos[index];
  if (!selected) return null;
  const change = (offset) => setSelectedUrl(photos[(index + offset + photos.length) % photos.length].image_url);
  return <div className="photo-gallery">
    <img className="photo-gallery-main" src={selected.image_url} alt={`${record.title} — photo ${index + 1}`} />
    {photos.length > 1 && <>
      <div className="photo-gallery-controls">
        <button type="button" onClick={() => change(-1)} aria-label="Previous photo">←</button>
        <span aria-live="polite">{index + 1} / {photos.length}</span>
        <button type="button" onClick={() => change(1)} aria-label="Next photo">→</button>
      </div>
      <div className="photo-gallery-thumbs">{photos.map((photo, photoIndex) => <button type="button" key={photo.image_url} aria-label={`Show photo ${photoIndex + 1}`} aria-pressed={index === photoIndex} onClick={() => setSelectedUrl(photo.image_url)}>
        <img src={photo.image_url} alt="" />
      </button>)}</div>
    </>}
  </div>;
}
