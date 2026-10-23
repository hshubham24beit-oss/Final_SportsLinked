import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiCpu,
  FiGlobe,
  FiImage,
  FiSend,
  FiUsers,
  FiX,
} from 'react-icons/fi';
import Avatar from '../ui/Avatar';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import { postsApi } from '../../api/posts.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/apiError';

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function PostComposer({ onCreated }) {
  const { user } = useAuth();
  const toast = useToast();
  const inputRef = useRef(null);
  const previewsRef = useRef([]);
  const [text, setText] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [sport, setSport] = useState('');
  const [images, setImages] = useState([]);
  const [isPosting, setIsPosting] = useState(false);
  const [uploadLabel, setUploadLabel] = useState('');
  const [error, setError] = useState('');

  useEffect(
    () => () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  if (!user || user.role === 'admin') {
    return null;
  }

  const discardPreviews = () => {
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewsRef.current = [];
  };

  const reset = () => {
    discardPreviews();
    setImages([]);
    setText('');
    setSport('');
    setVisibility('public');
    setUploadLabel('');
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const addImages = (event) => {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    setError('');

    const available = MAX_IMAGES - images.length;
    if (available <= 0) {
      toast.info('Image limit reached', `You can attach up to ${MAX_IMAGES} images.`);
      return;
    }

    const next = [];
    for (const file of selected.slice(0, available)) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error('Unsupported image', 'Use a JPEG, PNG, or WebP image.');
        continue;
      }
      if (file.size > MAX_IMAGE_BYTES) {
        toast.error('Image too large', 'Each image must be 5 MB or smaller.');
        continue;
      }
      const preview = URL.createObjectURL(file);
      previewsRef.current.push(preview);
      next.push({ id: `${file.name}-${file.size}-${Math.random()}`, file, preview });
    }

    if (next.length > 0) {
      setImages((current) => [...current, ...next]);
    }
    if (selected.length > available) {
      toast.info('Some images were not added', `You can attach up to ${MAX_IMAGES} images.`);
    }
  };

  const removeImage = (image) => {
    URL.revokeObjectURL(image.preview);
    previewsRef.current = previewsRef.current.filter((url) => url !== image.preview);
    setImages((current) => current.filter((entry) => entry.id !== image.id));
  };

  const submit = async (event) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed && images.length === 0) {
      setError('Write something or add an image before posting.');
      return;
    }

    setIsPosting(true);
    setError('');
    try {
      const uploaded = [];
      for (let index = 0; index < images.length; index += 1) {
        setUploadLabel(
          `Uploading image ${index + 1} of ${images.length}...`,
        );
        const response = await postsApi.uploadMedia(images[index].file);
        uploaded.push(response.data.data.media);
      }

      setUploadLabel('Publishing...');
      const response = await postsApi.create({
        text: trimmed,
        media: uploaded,
        visibility,
        sport: sport.trim(),
        type: 'text',
      });
      toast.success('Post published', 'Your post is now in the feed.');
      reset();
      onCreated?.(response.data.data.post);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsPosting(false);
      setUploadLabel('');
    }
  };

  return (
    <section className="rounded-card border border-line bg-white p-4 shadow-card sm:p-5">
      <form onSubmit={submit}>
        <div className="flex items-start gap-3">
          <Avatar name={user.name} src={user.avatarUrl} size="md" />
          <div className="min-w-0 flex-1">
            <Textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={3}
              maxLength={3000}
              placeholder={`Share an update, ${user.name.split(' ')[0]}...`}
              className="!resize-none !border-0 !px-0 !py-1 !shadow-none focus:!ring-0"
              aria-label="Write a post"
            />
            <p className="mt-1 text-right text-[11px] text-slate">
              {text.length}/3000
            </p>
          </div>
        </div>

        {images.length > 0 ? (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {images.map((image) => (
              <div
                key={image.id}
                className="group relative aspect-square overflow-hidden rounded-tile border border-line bg-sand"
              >
                <img
                  src={image.preview}
                  alt="Selected upload preview"
                  className="h-full w-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(image)}
                  className="absolute right-1.5 top-1.5 rounded-full bg-navy/70 p-1 text-white transition-colors hover:bg-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  aria-label="Remove image"
                >
                  <FiX className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-tile border border-red-200 bg-danger-50 p-2.5 text-xs text-danger-700" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={addImages}
              className="sr-only"
              id="post-image-input"
            />
            <label
              htmlFor="post-image-input"
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-tile px-2.5 text-xs font-semibold text-body transition-colors hover:bg-sand hover:text-navy focus-within:ring-2 focus-within:ring-track"
            >
              <FiImage className="h-4 w-4" aria-hidden="true" />
              Photo
              <span className="text-slate">
                {images.length}/{MAX_IMAGES}
              </span>
            </label>

            <Link
              to="/ai?tab=content&kind=post"
              className="inline-flex h-9 items-center gap-1.5 rounded-tile px-2.5 text-xs font-semibold text-body transition-colors hover:bg-sand hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-track"
            >
              <FiCpu className="h-4 w-4" aria-hidden="true" />
              AI draft
            </Link>

            <Select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              options={[
                { value: 'public', label: 'Anyone' },
                { value: 'connections', label: 'Connections only' },
              ]}
              aria-label="Post visibility"
              containerClassName="w-auto"
              className="!h-9 !py-0 !pl-2.5 !pr-7 !text-xs"
            />

            <input
              value={sport}
              onChange={(event) => setSport(event.target.value)}
              placeholder="Sport (optional)"
              maxLength={60}
              aria-label="Post sport"
              className="h-9 w-36 rounded-tile border border-line-strong bg-white px-2.5 text-xs text-navy placeholder:text-slate focus:border-track focus:outline-none focus:ring-2 focus:ring-track/20"
            />
          </div>

          <div className="flex items-center gap-2">
            {visibility === 'public' ? (
              <FiGlobe className="h-3.5 w-3.5 text-slate" aria-hidden="true" />
            ) : (
              <FiUsers className="h-3.5 w-3.5 text-slate" aria-hidden="true" />
            )}
            <Button
              type="submit"
              size="sm"
              isLoading={isPosting}
              disabled={!text.trim() && images.length === 0}
              leftIcon={<FiSend className="h-4 w-4" aria-hidden="true" />}
            >
              {uploadLabel || 'Post'}
            </Button>
          </div>
        </div>
      </form>
    </section>
  );
}
