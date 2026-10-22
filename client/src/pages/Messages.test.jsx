import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Messages from './Messages';
import { connectionsApi } from '../api/connections.api';
import { messagesApi } from '../api/messages.api';

const socketMock = vi.hoisted(() => {
  const handlers = {};
  return {
    handlers,
    on: vi.fn((event, handler) => {
      handlers[event] = handler;
    }),
    off: vi.fn((event) => {
      delete handlers[event];
    }),
    emit: vi.fn(),
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: 'Current User' } }),
}));

vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({ socket: socketMock, connected: true }),
}));

vi.mock('../hooks/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn(), info: vi.fn() }),
}));

vi.mock('../api/connections.api', () => ({
  connectionsApi: {
    list: vi.fn(),
  },
}));

vi.mock('../api/messages.api', () => ({
  messagesApi: {
    conversations: vi.fn(),
    conversation: vi.fn(),
    messages: vi.fn(),
    markRead: vi.fn(),
    send: vi.fn(),
    start: vi.fn(),
    report: vi.fn(),
  },
}));

const counterpart = {
  id: 'user-2',
  name: 'Alex Athlete',
  role: 'coach',
  avatarUrl: null,
  slug: 'alex-athlete',
  headline: 'Sprint coach',
};

const conversation = {
  id: 'conversation-1',
  participant: counterpart,
  lastMessage: {
    text: 'Earlier message',
    senderId: 'user-2',
    sentAt: '2026-10-22T08:00:00.000Z',
  },
  lastMessageAt: '2026-10-22T08:00:00.000Z',
  unreadCount: 1,
};

const initialMessage = {
  id: 'message-1',
  conversationId: 'conversation-1',
  senderId: 'user-2',
  text: 'Hello from Alex',
  readAt: null,
  createdAt: '2026-10-22T08:00:00.000Z',
};

const sentMessage = {
  id: 'message-0',
  conversationId: 'conversation-1',
  senderId: 'user-1',
  text: 'Message from me',
  readAt: null,
  createdAt: '2026-10-22T07:55:00.000Z',
};

function mockApi() {
  messagesApi.conversations.mockResolvedValue({
    data: { data: { conversations: [conversation] }, meta: { total: 1 } },
  });
  messagesApi.conversation.mockResolvedValue({
    data: { data: { conversation } },
  });
  messagesApi.messages.mockResolvedValue({
    data: {
      data: { messages: [sentMessage, initialMessage] },
      meta: { hasMore: false, nextCursor: null },
    },
  });
  messagesApi.markRead.mockResolvedValue({ data: { data: {} } });
  messagesApi.send.mockResolvedValue({
    data: {
      data: {
        message: {
          id: 'message-2',
          conversationId: 'conversation-1',
          senderId: 'user-1',
          text: 'Hello there',
          readAt: null,
          createdAt: '2026-10-22T08:05:00.000Z',
        },
      },
    },
  });
}

function renderMessages() {
  return render(
    <MemoryRouter initialEntries={['/messages?conversation=conversation-1']}>
      <Messages />
    </MemoryRouter>,
  );
}

describe('Messages', () => {
  beforeEach(() => {
    Object.keys(socketMock.handlers).forEach((event) => {
      delete socketMock.handlers[event];
    });
    socketMock.on.mockClear();
    socketMock.off.mockClear();
    socketMock.emit.mockClear();
    messagesApi.conversations.mockReset();
    messagesApi.conversation.mockReset();
    messagesApi.messages.mockReset();
    messagesApi.markRead.mockReset();
    messagesApi.send.mockReset();
    messagesApi.start.mockReset();
    messagesApi.report.mockReset();
    connectionsApi.list.mockReset();
    mockApi();
  });

  it('loads a conversation, marks it read, and sends a message', async () => {
    renderMessages();

    expect(await screen.findByText('Hello from Alex')).toBeInTheDocument();
    expect((await screen.findAllByText('Alex Athlete')).length).toBeGreaterThan(0);
    await waitFor(() =>
      expect(messagesApi.markRead).toHaveBeenCalledWith('conversation-1'),
    );

    fireEvent.change(screen.getByLabelText('Write a message'), {
      target: { value: 'Hello there' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(await screen.findByText('Hello there')).toBeInTheDocument();
    expect(messagesApi.send).toHaveBeenCalledWith('conversation-1', 'Hello there');
  });

  it('appends messages and read receipts received over the socket', async () => {
    renderMessages();
    await screen.findByText('Hello from Alex');

    act(() => {
      socketMock.handlers['message:new']({
        conversationId: 'conversation-1',
        message: {
          id: 'message-3',
          conversationId: 'conversation-1',
          senderId: 'user-2',
          text: 'Live update',
          readAt: null,
          createdAt: '2026-10-22T08:06:00.000Z',
        },
      });
    });

    expect(await screen.findByText('Live update')).toBeInTheDocument();

    act(() => {
      socketMock.handlers['message:read']({
        conversationId: 'conversation-1',
        readerId: 'user-2',
        readAt: '2026-10-22T08:07:00.000Z',
      });
    });

    expect((await screen.findAllByText(/Read/)).length).toBeGreaterThan(0);
  });
});
