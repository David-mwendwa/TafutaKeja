import { useRef, useState } from 'react';
import apiClient, { errorMessage } from '../../api/apiClient.js';
import { imageUrl } from '../../lib/images.js';
import Alert from '../ui/Alert.jsx';
import Spinner from '../ui/Spinner.jsx';

const MAX = 12;

export const ImageUploader = ({ images = [], onChange }) => {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const upload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (images.length + files.length > MAX) {
      setError(`A listing can carry at most ${MAX} photographs.`);
      return;
    }

    setBusy(true);
    setError('');
    const body = new FormData();
    // FormData deliberately, not JSON: the server resizes each upload into
    // responsive WebP before the listing ever references it.
    files.forEach((file) => body.append('images', file));

    try {
      const data = await apiClient.post('/uploads/listing-images', body);
      onChange([...images, ...data.images]);
    } catch (err) {
      setError(errorMessage(err, 'Could not upload those photographs'));
    } finally {
      setBusy(false);
      // Cleared so choosing the same file twice in a row still fires a change.
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const move = (from, to) => {
    if (to < 0 || to >= images.length) return;
    const next = [...images];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <Alert>{error}</Alert>

      {images.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, i) => (
            <li key={image.url} className="group relative overflow-hidden rounded-lg border border-dark-200 dark:border-dark-800">
              <img
                src={imageUrl(image.url)}
                alt=""
                loading="lazy"
                className="aspect-[4/3] w-full object-cover"
              />
              {i === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded bg-primary-700 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  Cover
                </span>
              ) : null}
              <div className="absolute inset-x-0 bottom-0 flex justify-between bg-dark-950/70 px-1 py-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0}
                  aria-label="Move earlier" className="px-1.5 text-white disabled:opacity-30">‹</button>
                <button type="button" onClick={() => onChange(images.filter((_, n) => n !== i))}
                  aria-label="Remove photograph" className="px-1.5 text-xs text-white">Remove</button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === images.length - 1}
                  aria-label="Move later" className="px-1.5 text-white disabled:opacity-30">›</button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      <div>
        <label htmlFor="images" className="label">
          {images.length ? 'Add more photographs' : 'Photographs'}
        </label>
        <input
          ref={inputRef}
          id="images"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={upload}
          disabled={busy || images.length >= MAX}
          className="field text-sm file:mr-3 file:rounded file:border-0 file:bg-primary-700 file:px-3 file:py-1.5 file:text-sm file:text-white"
        />
        <p className="mt-1 text-xs text-dark-500">
          JPEG, PNG or WebP, up to 8MB each. The first photograph is the cover. Drag the
          arrows to reorder. {images.length}/{MAX} used.
        </p>
        {busy ? (
          <p className="mt-2 flex items-center gap-2 text-sm text-dark-600">
            <Spinner size="sm" /> Uploading and resizing…
          </p>
        ) : null}
      </div>
    </div>
  );
};

export default ImageUploader;
