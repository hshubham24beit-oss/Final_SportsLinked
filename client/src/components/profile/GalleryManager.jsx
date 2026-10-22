import { useRef, useState } from 'react';
import { FiImage, FiPlus, FiTrash2 } from 'react-icons/fi';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Modal from '../ui/Modal';
import { profileApi } from '../../api/profile.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/apiError';
import ImageUploader from './ImageUploader';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateFile(file) {
  if (!file) return 'Choose an image to upload.';
  if (!ALLOWED_TYPES.includes(file.type)) return 'Choose a JPEG, PNG, or WebP image.';
  if (file.size > MAX_FILE_BYTES) return 'Images must be 5 MB or smaller.';
  return null;
}

export default function GalleryManager({ profile, setProfile, user }) {
  const toast = useToast();
  const { updateUser } = useAuth();
  const galleryInputRef = useRef(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [clearTarget, setClearTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const uploadAvatar = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error('Photo not uploaded', validationError);
      return;
    }
    setAvatarUploading(true);
    try {
      const response = await profileApi.uploadAvatar(file);
      const updatedProfile = response.data.data.profile;
      setProfile(updatedProfile);
      updateUser({ avatarUrl: updatedProfile.avatar?.url || null });
      toast.success('Profile photo updated', 'Your new photo is now on your profile.');
    } catch (error) {
      toast.error('Photo not uploaded', getErrorMessage(error));
    } finally {
      setAvatarUploading(false);
    }
  };

  const uploadCover = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      toast.error('Cover not uploaded', validationError);
      return;
    }
    setCoverUploading(true);
    try {
      const response = await profileApi.uploadCover(file);
      setProfile(response.data.data.profile);
      toast.success('Cover image updated', 'Your new cover is now on your profile.');
    } catch (error) {
      toast.error('Cover not uploaded', getErrorMessage(error));
    } finally {
      setCoverUploading(false);
    }
  };

  const uploadGalleryImage = async (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;

    const validationError = validateFile(file);
    if (validationError) {
      toast.error('Photo not uploaded', validationError);
      return;
    }

    setGalleryUploading(true);
    try {
      const response = await profileApi.addGalleryImage(file);
      setProfile(response.data.data.profile);
      toast.success('Gallery photo added', 'The photo is now part of your profile gallery.');
    } catch (error) {
      toast.error('Photo not uploaded', getErrorMessage(error));
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const response = await profileApi.removeGalleryImage(deleteTarget.id);
      setProfile(response.data.data.profile);
      setDeleteTarget(null);
      toast.success('Gallery photo removed', 'The photo has been deleted.');
    } catch (error) {
      toast.error('Could not remove the photo', getErrorMessage(error));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClear = async () => {
    if (!clearTarget) return;
    setIsClearing(true);
    try {
      const response =
        clearTarget === 'avatar'
          ? await profileApi.removeAvatar()
          : await profileApi.removeCover();
      setProfile(response.data.data.profile);
      if (clearTarget === 'avatar') {
        updateUser({ avatarUrl: null });
      }
      const isAvatar = clearTarget === 'avatar';
      setClearTarget(null);
      toast.success(
        isAvatar ? 'Profile photo removed' : 'Cover image removed',
        isAvatar ? 'Your initials will be shown instead.' : 'The cover area will use the default design.',
      );
    } catch (error) {
      toast.error('Could not remove the photo', getErrorMessage(error));
    } finally {
      setIsClearing(false);
    }
  };

  const gallery = profile.mediaGallery || [];
  const atLimit = gallery.length >= 12;

  return (
    <div>
      <div className="border-b border-line pb-4">
        <h2 className="text-base font-semibold text-ink">Profile photos</h2>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-ink-muted">
          Upload a profile photo and cover image, then build a gallery. Images are stored through
          the configured media provider.
        </p>
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-[160px_minmax(0,1fr)]">
        <ImageUploader
          name={user.name}
          label="Profile photo"
          description="Shown beside your name."
          imageUrl={profile.avatar?.url}
          onFile={uploadAvatar}
          onClear={() => setClearTarget('avatar')}
          isUploading={avatarUploading}
          isClearing={isClearing && clearTarget === 'avatar'}
        />
        <ImageUploader
          name={user.name}
          label="Cover image"
          description="Adds context to the top of your public profile."
          imageUrl={profile.cover?.url}
          onFile={uploadCover}
          onClear={() => setClearTarget('cover')}
          isUploading={coverUploading}
          isClearing={isClearing && clearTarget === 'cover'}
          variant="cover"
        />
      </div>

      <div className="mt-8 border-t border-line pt-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-ink">Gallery</h3>
              <span className="text-xs text-ink-subtle">
                {gallery.length}/12
              </span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-ink-muted">
              Add training, competition, or team photos. Captions are not required.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
            isLoading={galleryUploading}
            disabled={atLimit}
            leftIcon={<FiPlus className="h-4 w-4" aria-hidden="true" />}
          >
            Add gallery photo
          </Button>
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={uploadGalleryImage}
            tabIndex={-1}
          />
        </div>

        <div className="mt-4">
          {gallery.length === 0 ? (
            <EmptyState
              icon={FiImage}
              title="Your gallery is empty"
              description="Add up to 12 photos to show your sporting context."
              action={
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => galleryInputRef.current && galleryInputRef.current.click()}
                  isLoading={galleryUploading}
                >
                  Add a photo
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {gallery.map((item) => (
                <div
                  key={item.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-slate-100"
                >
                  <img
                    src={item.url}
                    alt={item.caption || 'Profile gallery image'}
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="absolute right-2 top-2 rounded-full bg-white/95 p-2 text-ink-muted shadow-sm transition-colors hover:text-danger-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
                    aria-label="Remove gallery photo"
                  >
                    <FiTrash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                  {item.caption ? (
                    <p className="absolute inset-x-0 bottom-0 truncate bg-ink/60 px-2.5 py-1.5 text-[11px] text-white">
                      {item.caption}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => (isDeleting ? null : setDeleteTarget(null))}
        title="Remove this gallery photo?"
        description="The image will be deleted from your profile."
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleDelete} isLoading={isDeleting}>
              Remove photo
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">This cannot be undone.</p>
      </Modal>
      <Modal
        open={Boolean(clearTarget)}
        onClose={() => (isClearing ? null : setClearTarget(null))}
        title={clearTarget === 'cover' ? 'Remove your cover image?' : 'Remove your profile photo?'}
        description={
          clearTarget === 'cover'
            ? 'Your public profile will return to the default cover design.'
            : 'Your profile will show your initials instead of a photo.'
        }
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setClearTarget(null)}
              disabled={isClearing}
            >
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleClear} isLoading={isClearing}>
              {clearTarget === 'cover' ? 'Remove cover' : 'Remove photo'}
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          The image will be deleted permanently. You can upload a new one at any time.
        </p>
      </Modal>
    </div>
  );
}
