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
  const [viewerOpen, setViewerOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const index = Math.max(0, photos.findIndex(photo => photo.image_url === selectedUrl));
  const selected = photos[index];
  useEffect(() => {
    if (!viewerOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => { if (event.key === 'Escape') setViewerOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [viewerOpen]);
  if (!selected) return null;
  const change = (offset) => setSelectedUrl(photos[(index + offset + photos.length) % photos.length].image_url);
  return <div className="photo-gallery">
    <div className="photo-gallery-stage">
      <button className="photo-gallery-open" type="button" onClick={() => { setZoom(1); setViewerOpen(true); }} aria-label={`Enlarge ${record.title}, photo ${index + 1}`}>
        <img className="photo-gallery-main" src={selected.image_url} alt={`${record.title} — photo ${index + 1}`} />
      </button>
      {photos.length > 1 && <button className="photo-gallery-next" type="button" onClick={() => change(1)} aria-label={`Show next photo. Photo ${index + 1} of ${photos.length} is currently shown`}>&gt;</button>}
    </div>
    {viewerOpen && <div className="photo-zoom" role="dialog" aria-modal="true" aria-label={`Enlarged view of ${record.title}`} onMouseDown={() => setViewerOpen(false)}>
      <div className="photo-zoom-toolbar" onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" onClick={() => setZoom((value) => Math.max(1, value - .5))} disabled={zoom === 1} aria-label="Zoom out">−</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button type="button" onClick={() => setZoom((value) => Math.min(3, value + .5))} disabled={zoom === 3} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => setViewerOpen(false)} aria-label="Close enlarged photo">×</button>
      </div>
      <div className="photo-zoom-canvas" onMouseDown={(event) => event.stopPropagation()}>
        <img src={selected.image_url} alt={`${record.title} — enlarged photo ${index + 1}`} style={{ transform: `scale(${zoom})` }} onClick={() => setZoom((value) => value === 3 ? 1 : Math.min(3, value + .5))} />
      </div>
    </div>}
  </div>;
}
