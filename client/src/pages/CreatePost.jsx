import { Link, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import PostComposer from '../components/feed/PostComposer';
import { buttonClasses } from '../components/ui/Button';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function CreatePost() {
  useDocumentTitle('Create post');
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Share your progress</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            Create a <span className="display-emphasis">post.</span>
          </h1>
          <p className="mt-1.5 text-sm text-body">
            Post an update, achievement, or moment from your sporting journey.
          </p>
        </div>
        <Link
          to="/feed"
          className={buttonClasses({ variant: 'ghost', size: 'sm' })}
        >
          <FiArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to feed
        </Link>
      </div>

      <div className="mt-5">
        <PostComposer onCreated={() => navigate('/feed')} />
      </div>
    </div>
  );
}
