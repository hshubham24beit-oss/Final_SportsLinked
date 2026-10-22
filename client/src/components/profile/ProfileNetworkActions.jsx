import { useState } from 'react';
import {
  FiCheck,
  FiUserCheck,
  FiUserPlus,
  FiUserX,
  FiX,
} from 'react-icons/fi';
import Button from '../ui/Button';
import { connectionsApi } from '../../api/connections.api';
import { followsApi } from '../../api/follows.api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/apiError';

export default function ProfileNetworkActions({ ownerId, ownerName, network, onChange }) {
  const { user } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState('');

  if (!user || user.role === 'admin' || !ownerId || !network) {
    return null;
  }
  if (network.connectionStatus === 'self') {
    return null;
  }

  const update = (patch) => onChange({ ...network, ...patch });

  const run = async (action, task, success) => {
    setBusy(action);
    try {
      const result = await task();
      success(result);
    } catch (error) {
      toast.error('Could not update your network', getErrorMessage(error));
    } finally {
      setBusy('');
    }
  };

  const sendRequest = () =>
    run(
      'connect',
      () => connectionsApi.send(ownerId),
      (response) => {
        update({
          connectionStatus: 'pending_outgoing',
          connectionId: response.data.data.connection.id,
        });
        toast.success('Request sent', `${ownerName} will see your connection request.`);
      },
    );

  const cancelRequest = () =>
    run(
      'cancel',
      () => connectionsApi.cancel(network.connectionId),
      () => {
        update({ connectionStatus: 'none', connectionId: null });
        toast.success('Request cancelled');
      },
    );

  const acceptRequest = () =>
    run(
      'accept',
      () => connectionsApi.accept(network.connectionId),
      () => {
        update({ connectionStatus: 'accepted' });
        toast.success('Connected', `You are now connected with ${ownerName}.`);
      },
    );

  const rejectRequest = () =>
    run(
      'reject',
      () => connectionsApi.reject(network.connectionId),
      () => {
        update({ connectionStatus: 'none', connectionId: null });
        toast.success('Request declined');
      },
    );

  const removeConnection = () =>
    run(
      'remove',
      () => connectionsApi.remove(network.connectionId),
      () => {
        update({ connectionStatus: 'none', connectionId: null });
        toast.success('Connection removed');
      },
    );

  const toggleFollow = () =>
    run(
      network.isFollowing ? 'unfollow' : 'follow',
      () =>
        network.isFollowing
          ? followsApi.unfollow(ownerId)
          : followsApi.follow(ownerId),
      (response) => {
        update({
          isFollowing: !network.isFollowing,
          followerCount: response.data.data.followerCount,
        });
        toast.success(
          network.isFollowing ? 'Unfollowed' : 'Following',
          network.isFollowing
            ? `You no longer follow ${ownerName}.`
            : `You will see more from ${ownerName} in your feed.`,
        );
      },
    );

  const connectionButton = (() => {
    if (network.connectionStatus === 'accepted') {
      return (
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled
            leftIcon={<FiUserCheck className="h-4 w-4" aria-hidden="true" />}
          >
            Connected
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={busy === 'remove'}
            onClick={removeConnection}
            leftIcon={<FiUserX className="h-4 w-4" aria-hidden="true" />}
          >
            Remove
          </Button>
        </>
      );
    }

    if (network.connectionStatus === 'pending_outgoing') {
      return (
        <>
          <Button variant="secondary" size="sm" disabled>
            Request sent
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={busy === 'cancel'}
            onClick={cancelRequest}
          >
            Cancel
          </Button>
        </>
      );
    }

    if (network.connectionStatus === 'pending_incoming') {
      return (
        <>
          <Button
            size="sm"
            isLoading={busy === 'accept'}
            onClick={acceptRequest}
            leftIcon={<FiCheck className="h-4 w-4" aria-hidden="true" />}
          >
            Accept
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={busy === 'reject'}
            onClick={rejectRequest}
            leftIcon={<FiX className="h-4 w-4" aria-hidden="true" />}
          >
            Decline
          </Button>
        </>
      );
    }

    return (
      <Button
        variant="secondary"
        size="sm"
        isLoading={busy === 'connect'}
        onClick={sendRequest}
        leftIcon={<FiUserPlus className="h-4 w-4" aria-hidden="true" />}
      >
        Connect
      </Button>
    );
  })();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {connectionButton}
      <Button
        variant={network.isFollowing ? 'secondary' : 'ghost'}
        size="sm"
        isLoading={busy === 'follow' || busy === 'unfollow'}
        onClick={toggleFollow}
        leftIcon={
          network.isFollowing ? (
            <FiUserCheck className="h-4 w-4" aria-hidden="true" />
          ) : (
            <FiUserPlus className="h-4 w-4" aria-hidden="true" />
          )
        }
      >
        {network.isFollowing ? 'Following' : 'Follow'}
      </Button>
    </div>
  );
}
