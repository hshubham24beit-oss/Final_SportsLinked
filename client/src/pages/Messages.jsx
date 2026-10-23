import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  FiArrowLeft,
  FiFlag,
  FiMessageCircle,
  FiPlus,
  FiSend,
  FiUserPlus,
} from 'react-icons/fi';
import Alert from '../components/ui/Alert';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Modal from '../components/ui/Modal';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import { connectionsApi } from '../api/connections.api';
import { messagesApi } from '../api/messages.api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../hooks/useToast';
import { getErrorMessage } from '../utils/apiError';
import { formatRelativeTime } from '../utils/format';
import { getRoleLabel } from '../utils/roles';

const PAGE_SIZE = 30;
const REPORT_REASONS = [
  { value: 'spam', label: 'Spam or misleading' },
  { value: 'harassment', label: 'Harassment or abuse' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'inappropriate_content', label: 'Inappropriate content' },
  { value: 'fraud', label: 'Fraud or scam' },
  { value: 'other', label: 'Other' },
];

function mergeMessages(current, incoming) {
  const seen = new Set(current.map((message) => message.id));
  return [...current, ...incoming.filter((message) => !seen.has(message.id))];
}

function ConversationRow({ conversation, active, onSelect }) {
  const participant = conversation.participant;
  if (!participant) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={`flex w-full items-start gap-3 border-b border-line px-4 py-3.5 text-left transition-colors ${
        active ? 'bg-sand' : 'hover:bg-sand/60'
      }`}
    >
      <Avatar name={participant.name} src={participant.avatarUrl} size="md" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-navy">
            {participant.name}
          </span>
          {conversation.unreadCount > 0 ? (
            <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-track px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          <span className="truncate text-xs text-slate">
            {getRoleLabel(participant.role)}
          </span>
          <span className="text-[10px] text-slate">·</span>
          <span className="truncate text-xs text-slate">
            {conversation.lastMessageAt
              ? formatRelativeTime(conversation.lastMessageAt)
              : 'New conversation'}
          </span>
        </span>
        <span className="mt-1 block truncate text-xs text-body">
          {conversation.lastMessage?.text || 'Start the conversation.'}
        </span>
      </span>
    </button>
  );
}

function MessageBubble({ message, isMine }) {
  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-card px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
          isMine
            ? 'rounded-br-md bg-track text-white'
            : 'rounded-bl-md border border-line bg-white text-navy'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.text}</p>
        <p
          className={`mt-1 text-right text-[10px] ${
            isMine ? 'text-ivory/70' : 'text-slate'
          }`}
        >
          {formatRelativeTime(message.createdAt)}
          {isMine ? (message.readAt ? ' · Read' : ' · Sent') : ''}
        </p>
      </div>
    </div>
  );
}

export default function Messages() {
  useDocumentTitle('Messages');
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [conversationsError, setConversationsError] = useState('');
  const [selectedId, setSelectedId] = useState(searchParams.get('conversation'));
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [threadError, setThreadError] = useState('');
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [typingUser, setTypingUser] = useState(null);

  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [connections, setConnections] = useState([]);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [connectionSearch, setConnectionSearch] = useState('');
  const [startingUserId, setStartingUserId] = useState('');

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const bottomRef = useRef(null);
  const typingTimerRef = useRef(null);
  const typingSentRef = useRef(false);
  const startedUserIdRef = useRef('');
  const selectedIdRef = useRef(selectedId);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  const loadConversations = useCallback(async () => {
    setConversationsError('');
    try {
      const response = await messagesApi.conversations({ limit: 50 });
      setConversations(response.data.data.conversations || []);
    } catch (error) {
      setConversationsError(getErrorMessage(error));
    } finally {
      setIsLoadingConversations(false);
    }
  }, []);

  const markRead = useCallback(async (conversationId) => {
    try {
      await messagesApi.markRead(conversationId);
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation,
        ),
      );
    } catch {
      // The conversation remains usable if the read receipt cannot be saved.
    }
  }, []);

  const selectConversation = useCallback(
    (conversationId) => {
      setSelectedId(conversationId);
      setSearchParams({ conversation: conversationId }, { replace: true });
    },
    [setSearchParams],
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    const targetUserId = searchParams.get('user');
    if (
      !targetUserId ||
      targetUserId === user?.id ||
      startedUserIdRef.current === targetUserId
    ) {
      return;
    }

    startedUserIdRef.current = targetUserId;
    let cancelled = false;
    setStartingUserId(targetUserId);

    messagesApi
      .start(targetUserId)
      .then((response) => {
        if (cancelled) return;
        const conversation = response.data.data.conversation;
        setActiveConversation(conversation);
        setSelectedId(conversation.id);
        setSearchParams({ conversation: conversation.id }, { replace: true });
        loadConversations();
      })
      .catch((error) => {
        if (cancelled) return;
        toast.error('Could not start conversation', getErrorMessage(error));
        setSearchParams({}, { replace: true });
      })
      .finally(() => {
        if (!cancelled) {
          setStartingUserId('');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [loadConversations, searchParams, setSearchParams, toast, user?.id]);

  useEffect(() => {
    if (!selectedId) {
      setActiveConversation(null);
      setMessages([]);
      setNextCursor(null);
      setHasMore(false);
      return undefined;
    }

    let cancelled = false;
    setIsLoadingThread(true);
    setThreadError('');
    setTypingUser(null);

    Promise.all([
      messagesApi.conversation(selectedId),
      messagesApi.messages(selectedId, { limit: PAGE_SIZE }),
    ])
      .then(([conversationResponse, messagesResponse]) => {
        if (cancelled) return;
        setActiveConversation(conversationResponse.data.data.conversation);
        setMessages(messagesResponse.data.data.messages || []);
        setNextCursor(messagesResponse.data.meta?.nextCursor || null);
        setHasMore(Boolean(messagesResponse.data.meta?.hasMore));
        markRead(selectedId);
      })
      .catch((error) => {
        if (cancelled) return;
        setThreadError(getErrorMessage(error));
        setMessages([]);
        setActiveConversation(null);
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingThread(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [markRead, selectedId]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    bottomRef.current?.scrollIntoView?.({ block: 'end' });
  }, [messages.length]);

  useEffect(() => {
    if (!socket) {
      return undefined;
    }

    const handleNewMessage = ({ conversationId, message }) => {
      if (conversationId === selectedIdRef.current) {
        setMessages((current) => mergeMessages(current, [message]));
        if (message.senderId !== user?.id) {
          markRead(conversationId);
        }
      }
      loadConversations();
    };

    const handleRead = ({ conversationId, readerId, readAt }) => {
      if (conversationId !== selectedIdRef.current) {
        return;
      }
      if (readerId === user?.id) {
        return;
      }
      setMessages((current) =>
        current.map((message) =>
          message.senderId === user?.id ? { ...message, readAt } : message,
        ),
      );
    };

    const handleTyping = ({ conversationId, userId, isTyping }) => {
      if (conversationId !== selectedIdRef.current || userId === user?.id) {
        return;
      }
      setTypingUser(isTyping ? userId : null);
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:read', handleRead);
    socket.on('message:typing', handleTyping);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:read', handleRead);
      socket.off('message:typing', handleTyping);
    };
  }, [loadConversations, markRead, socket, user?.id]);

  useEffect(
    () => () => {
      if (typingTimerRef.current) {
        window.clearTimeout(typingTimerRef.current);
      }
    },
    [],
  );

  const stopTyping = useCallback(() => {
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    if (typingSentRef.current && socket && selectedId) {
      socket.emit('message:typing', { conversationId: selectedId, isTyping: false });
    }
    typingSentRef.current = false;
  }, [selectedId, socket]);

  const handleDraftChange = (event) => {
    setDraft(event.target.value);
    if (!socket || !selectedId) {
      return;
    }
    if (!typingSentRef.current) {
      socket.emit('message:typing', { conversationId: selectedId, isTyping: true });
      typingSentRef.current = true;
    }
    if (typingTimerRef.current) {
      window.clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = window.setTimeout(() => {
      if (typingSentRef.current) {
        socket.emit('message:typing', { conversationId: selectedId, isTyping: false });
        typingSentRef.current = false;
      }
      typingTimerRef.current = null;
    }, 1500);
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selectedId || isSending) {
      return;
    }

    setIsSending(true);
    try {
      const response = await messagesApi.send(selectedId, text);
      setMessages((current) =>
        mergeMessages(current, [response.data.data.message]),
      );
      setDraft('');
      stopTyping();
      loadConversations();
    } catch (error) {
      toast.error('Could not send message', getErrorMessage(error));
    } finally {
      setIsSending(false);
    }
  };

  const loadOlder = async () => {
    if (!selectedId || !nextCursor || isLoadingOlder) {
      return;
    }
    setIsLoadingOlder(true);
    try {
      const response = await messagesApi.messages(selectedId, {
        limit: PAGE_SIZE,
        before: nextCursor,
      });
      setMessages((current) =>
        mergeMessages(response.data.data.messages || [], current),
      );
      setNextCursor(response.data.meta?.nextCursor || null);
      setHasMore(Boolean(response.data.meta?.hasMore));
    } catch (error) {
      toast.error('Could not load older messages', getErrorMessage(error));
    } finally {
      setIsLoadingOlder(false);
    }
  };

  const openNewConversation = async () => {
    setNewConversationOpen(true);
    setConnectionSearch('');
    setIsLoadingConnections(true);
    try {
      const response = await connectionsApi.list({ limit: 100 });
      setConnections(response.data.data.connections || []);
    } catch (error) {
      toast.error('Could not load connections', getErrorMessage(error));
    } finally {
      setIsLoadingConnections(false);
    }
  };

  const startConversation = async (participant) => {
    setStartingUserId(participant.id);
    try {
      const response = await messagesApi.start(participant.id);
      const conversation = response.data.data.conversation;
      setNewConversationOpen(false);
      setActiveConversation(conversation);
      setSelectedId(conversation.id);
      setSearchParams({ conversation: conversation.id }, { replace: true });
      loadConversations();
    } catch (error) {
      toast.error('Could not start conversation', getErrorMessage(error));
    } finally {
      setStartingUserId('');
    }
  };

  const submitReport = async (event) => {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    setIsReporting(true);
    try {
      await messagesApi.report(selectedId, {
        reason: reportReason,
        details: reportDetails,
      });
      toast.success(
        'Conversation reported',
        'Our moderation team will review it.',
      );
      setReportOpen(false);
      setReportDetails('');
    } catch (error) {
      toast.error('Could not report conversation', getErrorMessage(error));
    } finally {
      setIsReporting(false);
    }
  };

  const filteredConnections = useMemo(() => {
    const query = connectionSearch.trim().toLowerCase();
    return connections.filter(
      (connection) =>
        connection.user &&
        (!query || connection.user.name.toLowerCase().includes(query)),
    );
  }, [connectionSearch, connections]);

  const participant = activeConversation?.participant;
  const hasSelectedThread = Boolean(selectedId);

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Inbox</p>
          <h1 className="mt-2 text-3xl leading-tight sm:text-4xl">
            <span className="display-emphasis">Messages.</span>
          </h1>
          <p className="mt-1.5 text-sm text-body">
            Private conversations with your connections and applicant contacts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={connected ? 'success' : 'neutral'} dot>
            {connected ? 'Live' : 'Reconnecting'}
          </Badge>
          <Button
            size="sm"
            onClick={openNewConversation}
            leftIcon={<FiPlus className="h-4 w-4" aria-hidden="true" />}
          >
            New message
          </Button>
        </div>
      </div>

      {conversationsError ? (
        <Alert variant="error" className="mt-5" title="Conversations could not be loaded">
          {conversationsError}
        </Alert>
      ) : null}

      <div className="mt-5 overflow-hidden rounded-card border border-line bg-white shadow-card">
        <div className="grid h-[calc(100vh-14rem)] min-h-[32rem] lg:grid-cols-[20rem_minmax(0,1fr)]">
          <aside
            aria-label="Conversations"
            className={`min-h-0 border-line lg:border-r ${
              hasSelectedThread ? 'hidden lg:block' : 'block'
            }`}
          >
            <div className="border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-navy">Conversations</p>
              <p className="mt-0.5 text-xs text-slate">
                {conversations.length} active
              </p>
            </div>
            <div className="h-[calc(100%-4.25rem)] overflow-y-auto">
              {isLoadingConversations ? (
                <p className="px-4 py-5 text-sm text-body">Loading conversations...</p>
              ) : null}
              {!isLoadingConversations && conversations.length === 0 ? (
                <div className="px-4 py-6">
                  <EmptyState
                    icon={FiMessageCircle}
                    title="No conversations yet"
                    description="Start a private conversation with an accepted connection."
                    action={
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={openNewConversation}
                        leftIcon={<FiUserPlus className="h-4 w-4" aria-hidden="true" />}
                      >
                        Find a connection
                      </Button>
                    }
                  />
                </div>
              ) : null}
              {conversations.map((conversation) => (
                <ConversationRow
                  key={conversation.id}
                  conversation={conversation}
                  active={conversation.id === selectedId}
                  onSelect={selectConversation}
                />
              ))}
            </div>
          </aside>

          <section className={`min-h-0 flex-col ${hasSelectedThread ? 'flex' : 'hidden lg:flex'}`}>
            {!hasSelectedThread ? (
              <div className="flex h-full items-center justify-center p-6">
                <EmptyState
                  icon={FiMessageCircle}
                  title="Select a conversation"
                  description="Choose a conversation from the list, or start a new message with a connection."
                  action={
                    <Button size="sm" variant="secondary" onClick={openNewConversation}>
                      New message
                    </Button>
                  }
                />
              </div>
            ) : null}

            {hasSelectedThread ? (
              <>
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(null);
                      setSearchParams({}, { replace: true });
                    }}
                    className="rounded-tile p-1.5 text-body hover:bg-sand lg:hidden"
                    aria-label="Back to conversations"
                  >
                    <FiArrowLeft className="h-5 w-5" aria-hidden="true" />
                  </button>
                  {participant ? (
                    <>
                      <Avatar
                        name={participant.name}
                        src={participant.avatarUrl}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        {participant.slug ? (
                          <Link
                            to={`/p/${participant.slug}`}
                            className="truncate text-sm font-semibold text-navy hover:text-track"
                          >
                            {participant.name}
                          </Link>
                        ) : (
                          <p className="truncate text-sm font-semibold text-navy">
                            {participant.name}
                          </p>
                        )}
                        <p className="truncate text-xs text-slate">
                          {getRoleLabel(participant.role)}
                          {participant.headline ? ` · ${participant.headline}` : ''}
                        </p>
                      </div>
                    </>
                  ) : (
                    <p className="flex-1 text-sm text-body">Loading conversation...</p>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReportOpen(true)}
                    aria-label="Report conversation"
                    title="Report conversation"
                  >
                    <FiFlag className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>

                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-sand/60 px-4 py-4">
                  {threadError ? <Alert variant="error">{threadError}</Alert> : null}
                  {isLoadingThread ? (
                    <p className="text-center text-sm text-body">Loading messages...</p>
                  ) : null}
                  {!isLoadingThread && hasMore ? (
                    <div className="text-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        isLoading={isLoadingOlder}
                        onClick={loadOlder}
                      >
                        Load older messages
                      </Button>
                    </div>
                  ) : null}
                  {!isLoadingThread && !threadError && messages.length === 0 ? (
                    <p className="py-8 text-center text-sm text-body">
                      No messages yet. Say hello.
                    </p>
                  ) : null}
                  {messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      isMine={message.senderId === user?.id}
                    />
                  ))}
                  {typingUser ? (
                    <p className="text-xs italic text-slate">
                      {participant?.name || 'They'} is typing...
                    </p>
                  ) : null}
                  <div ref={bottomRef} />
                </div>

                <form
                  onSubmit={handleSend}
                  className="border-t border-line bg-white p-3"
                >
                  <div className="flex items-end gap-2">
                    <label htmlFor="message-draft" className="sr-only">
                      Write a message
                    </label>
                    <textarea
                      id="message-draft"
                      rows={1}
                      value={draft}
                      onChange={handleDraftChange}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          handleSend(event);
                        }
                      }}
                      placeholder="Write a message..."
                      maxLength={4000}
                      className="max-h-32 min-h-[2.75rem] flex-1 resize-y rounded-tile border border-line-strong bg-white px-3.5 py-2.5 text-sm text-navy shadow-sm transition placeholder:text-slate focus:border-track focus:outline-none focus:ring-2 focus:ring-track/20"
                    />
                    <Button
                      type="submit"
                      size="md"
                      isLoading={isSending}
                      disabled={!draft.trim()}
                      leftIcon={<FiSend className="h-4 w-4" aria-hidden="true" />}
                    >
                      Send
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[11px] text-slate">
                    Enter to send · Shift + Enter for a new line
                  </p>
                </form>
              </>
            ) : null}
          </section>
        </div>
      </div>

      <Modal
        open={newConversationOpen}
        onClose={() => setNewConversationOpen(false)}
        title="New message"
        description="Choose an accepted connection to start a private conversation."
        size="md"
      >
        <label htmlFor="connection-search" className="sr-only">
          Search connections
        </label>
        <input
          id="connection-search"
          type="search"
          value={connectionSearch}
          onChange={(event) => setConnectionSearch(event.target.value)}
          placeholder="Search connections"
          className="w-full rounded-tile border border-line-strong bg-white px-3.5 py-2.5 text-sm text-navy shadow-sm focus:border-track focus:outline-none focus:ring-2 focus:ring-track/20"
        />
        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto">
          {isLoadingConnections ? (
            <p className="py-4 text-sm text-body">Loading connections...</p>
          ) : null}
          {!isLoadingConnections && filteredConnections.length === 0 ? (
            <p className="py-4 text-sm text-body">
              No matching connections. Connect with members from My network first.
            </p>
          ) : null}
          {filteredConnections.map((connection) => (
            <button
              key={connection.id}
              type="button"
              onClick={() => startConversation(connection.user)}
              disabled={Boolean(startingUserId)}
              className="flex w-full items-center gap-3 rounded-tile px-2.5 py-2.5 text-left transition-colors hover:bg-sand/60 disabled:opacity-60"
            >
              <Avatar
                name={connection.user.name}
                src={connection.user.avatarUrl}
                size="sm"
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-navy">
                  {connection.user.name}
                </span>
                <span className="block truncate text-xs text-slate">
                  {getRoleLabel(connection.user.role)}
                </span>
              </span>
              {startingUserId === connection.user.id ? (
                <span className="text-xs text-slate">Starting...</span>
              ) : (
                <FiMessageCircle className="h-4 w-4 text-slate" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Report this conversation?"
        description="Reports are confidential and reviewed by the SportLinked moderation team."
        footer={
          <>
            <Button
              variant="secondary"
              size="md"
              onClick={() => setReportOpen(false)}
              disabled={isReporting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              type="submit"
              form="report-conversation-form"
              isLoading={isReporting}
            >
              Submit report
            </Button>
          </>
        }
      >
        <form
          id="report-conversation-form"
          onSubmit={submitReport}
          className="space-y-4"
        >
          <Select
            label="Reason"
            value={reportReason}
            onChange={(event) => setReportReason(event.target.value)}
            options={REPORT_REASONS}
            required
          />
          <Textarea
            label="Additional details"
            value={reportDetails}
            onChange={(event) => setReportDetails(event.target.value)}
            maxLength={2000}
            rows={4}
            placeholder="Tell us what happened (optional)"
          />
        </form>
      </Modal>
    </div>
  );
}
