const http = require('http');
const request = require('supertest');
const { io: createClient } = require('socket.io-client');
const {
  app,
  API,
  registerAndLogin,
  authHeader,
  latestEmailTo,
} = require('./helpers');
const { clearOutbox } = require('../services/email.service');
const { initializeSocket, closeSocket } = require('../sockets');
const { runDeadlineReminders } = require('../jobs/deadlineReminders');
const Notification = require('../models/Notification');
const Message = require('../models/Message');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const SavedOpportunity = require('../models/SavedOpportunity');

function userId(account) {
  return account.loginResponse.body.data.user.id;
}

async function connect(first, second) {
  const sent = await request(app)
    .post(`${API}/connections/requests`)
    .set(authHeader(first.accessToken))
    .send({ userId: userId(second), message: 'Let us connect.' });
  expect(sent.status).toBe(201);

  const accepted = await request(app)
    .post(`${API}/connections/${sent.body.data.connection.id}/accept`)
    .set(authHeader(second.accessToken));
  expect(accepted.status).toBe(200);
}

async function start(first, second) {
  const response = await request(app)
    .post(`${API}/messages`)
    .set(authHeader(first.accessToken))
    .send({ userId: userId(second) });
  expect([200, 201]).toContain(response.status);
  return response.body.data.conversation;
}

async function send(account, conversationId, text) {
  return request(app)
    .post(`${API}/messages/${conversationId}/messages`)
    .set(authHeader(account.accessToken))
    .send({ text });
}

describe('Phase 7 messaging, preferences, reminders, and sockets', () => {
  it('only permits accepted connections to start a conversation', async () => {
    const first = await registerAndLogin({ name: 'Message First', role: 'athlete' });
    const second = await registerAndLogin({ name: 'Message Second', role: 'athlete' });
    const stranger = await registerAndLogin({ name: 'Message Stranger', role: 'coach' });

    const denied = await request(app)
      .post(`${API}/messages`)
      .set(authHeader(stranger.accessToken))
      .send({ userId: userId(first) });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('MESSAGE_NOT_ALLOWED');

    const self = await request(app)
      .post(`${API}/messages`)
      .set(authHeader(first.accessToken))
      .send({ userId: userId(first) });
    expect(self.status).toBe(400);
    expect(self.body.code).toBe('MESSAGE_SELF');

    await connect(first, second);
    const conversation = await start(first, second);
    const existing = await start(second, first);
    expect(existing.id).toBe(conversation.id);

    const conversations = await request(app)
      .get(`${API}/messages`)
      .set(authHeader(first.accessToken));
    expect(conversations.status).toBe(200);
    expect(conversations.body.data.conversations).toHaveLength(1);
    expect(conversations.body.data.conversations[0].participant.name).toBe(
      'Message Second',
    );
  });

  it('allows a coach and an applicant to message without a connection', async () => {
    const coach = await registerAndLogin({ name: 'Applicant Coach', role: 'coach' });
    const athlete = await registerAndLogin({
      name: 'Applicant Athlete',
      role: 'athlete',
    });
    const stranger = await registerAndLogin({
      name: 'Unrelated Athlete',
      role: 'athlete',
    });

    const opportunity = await Opportunity.create({
      publisher: userId(coach),
      publisherName: 'Applicant Coach',
      publisherRole: 'coach',
      type: 'trials',
      title: 'Applicant trial',
      description: 'A trial used to test applicant messaging permissions.',
      sport: 'Athletics',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      status: 'published',
    });
    await Application.create({
      opportunity: opportunity._id,
      athlete: userId(athlete),
      submittedSnapshot: { name: 'Applicant Athlete' },
    });

    const coachConversation = await start(coach, athlete);
    expect(coachConversation.participant.name).toBe('Applicant Athlete');

    const athleteConversation = await start(athlete, coach);
    expect(athleteConversation.id).toBe(coachConversation.id);

    const denied = await request(app)
      .post(`${API}/messages`)
      .set(authHeader(stranger.accessToken))
      .send({ userId: userId(coach) });
    expect(denied.status).toBe(403);
    expect(denied.body.code).toBe('MESSAGE_NOT_ALLOWED');
  });

  it('tracks unread counts, paginates history, and marks messages read', async () => {
    const sender = await registerAndLogin({ name: 'Message Sender', role: 'athlete' });
    const recipient = await registerAndLogin({
      name: 'Message Recipient',
      role: 'athlete',
    });
    await connect(sender, recipient);
    const conversation = await start(sender, recipient);

    for (const text of ['First message', 'Second message', 'Third message']) {
      const response = await send(sender, conversation.id, text);
      expect(response.status).toBe(201);
    }

    const inbound = await request(app)
      .get(`${API}/messages/${conversation.id}/messages?limit=2`)
      .set(authHeader(recipient.accessToken));
    expect(inbound.status).toBe(200);
    expect(inbound.body.data.messages.map((message) => message.text)).toEqual([
      'Second message',
      'Third message',
    ]);
    expect(inbound.body.meta.hasMore).toBe(true);
    expect(inbound.body.meta.nextCursor).toBeTruthy();

    const earlier = await request(app)
      .get(
        `${API}/messages/${conversation.id}/messages?limit=2&before=${inbound.body.meta.nextCursor}`,
      )
      .set(authHeader(recipient.accessToken));
    expect(earlier.body.data.messages.map((message) => message.text)).toEqual([
      'First message',
    ]);

    const listBeforeRead = await request(app)
      .get(`${API}/messages`)
      .set(authHeader(recipient.accessToken));
    expect(listBeforeRead.body.data.conversations[0].unreadCount).toBe(3);

    const read = await request(app)
      .post(`${API}/messages/${conversation.id}/read`)
      .set(authHeader(recipient.accessToken));
    expect(read.status).toBe(200);
    expect(read.body.data.updated).toBe(3);
    expect(
      await Message.countDocuments({ conversation: conversation.id, readAt: null }),
    ).toBe(0);

    const listAfterRead = await request(app)
      .get(`${API}/messages`)
      .set(authHeader(recipient.accessToken));
    expect(listAfterRead.body.data.conversations[0].unreadCount).toBe(0);
  });

  it('hides conversations from non-participants and blocked users', async () => {
    const first = await registerAndLogin({ name: 'Message Owner', role: 'athlete' });
    const second = await registerAndLogin({ name: 'Message Partner', role: 'athlete' });
    const outsider = await registerAndLogin({ name: 'Message Outsider', role: 'coach' });
    await connect(first, second);
    const conversation = await start(first, second);

    const hidden = await request(app)
      .get(`${API}/messages/${conversation.id}`)
      .set(authHeader(outsider.accessToken));
    expect(hidden.status).toBe(404);

    const hiddenSend = await send(outsider, conversation.id, 'Not allowed');
    expect(hiddenSend.status).toBe(404);

    const report = await request(app)
      .post(`${API}/messages/${conversation.id}/report`)
      .set(authHeader(second.accessToken))
      .send({ reason: 'harassment', details: 'Conversation report' });
    expect(report.status).toBe(201);
    expect(report.body.data.report).toMatchObject({
      targetType: 'message',
      targetId: conversation.id,
    });

    const block = await request(app)
      .post(`${API}/blocks`)
      .set(authHeader(second.accessToken))
      .send({ userId: userId(first), reason: 'Testing conversation block' });
    expect(block.status).toBe(201);

    const blockedRead = await request(app)
      .get(`${API}/messages/${conversation.id}`)
      .set(authHeader(first.accessToken));
    expect(blockedRead.status).toBe(404);

    const blockedSend = await send(first, conversation.id, 'Blocked message');
    expect(blockedSend.status).toBe(404);

    const blockedList = await request(app)
      .get(`${API}/messages`)
      .set(authHeader(first.accessToken));
    expect(blockedList.body.data.conversations).toHaveLength(0);
  });

  it('honors per-category email preferences for message notifications', async () => {
    const sender = await registerAndLogin({ name: 'Pref Sender', role: 'athlete' });
    const recipient = await registerAndLogin({
      name: 'Pref Recipient',
      role: 'athlete',
    });
    await connect(sender, recipient);
    const conversation = await start(sender, recipient);

    const preferences = await request(app)
      .get(`${API}/notifications/preferences`)
      .set(authHeader(recipient.accessToken));
    expect(preferences.status).toBe(200);
    expect(preferences.body.data.preferences.messages).toBe(true);
    expect(preferences.body.data.preferences.social).toBe(false);

    const disabled = await request(app)
      .patch(`${API}/notifications/preferences`)
      .set(authHeader(recipient.accessToken))
      .send({ messages: false });
    expect(disabled.status).toBe(200);
    expect(disabled.body.data.preferences.messages).toBe(false);

    clearOutbox();
    await send(sender, conversation.id, 'No email for this message');
    expect(latestEmailTo(recipient.payload.email, 'New message')).toBeUndefined();

    await request(app)
      .patch(`${API}/notifications/preferences`)
      .set(authHeader(recipient.accessToken))
      .send({ messages: true });
    clearOutbox();
    await send(sender, conversation.id, 'Email this message');
    expect(latestEmailTo(recipient.payload.email, 'New message')).toBeTruthy();
  });

  it('reminds users once about saved opportunities closing soon', async () => {
    const owner = await registerAndLogin({ name: 'Reminder Owner', role: 'athlete' });
    const soon = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const later = new Date(Date.now() + 48 * 60 * 60 * 1000);

    const [soonOpportunity, laterOpportunity] = await Opportunity.create([
      {
        publisher: userId(owner),
        publisherName: 'Reminder Club',
        publisherRole: 'coach',
        type: 'trials',
        title: 'Reminder trial',
        description: 'A trial opportunity used to test deadline reminders.',
        sport: 'Athletics',
        deadline: soon,
        status: 'published',
      },
      {
        publisher: userId(owner),
        publisherName: 'Reminder Club',
        publisherRole: 'coach',
        type: 'trials',
        title: 'Later trial',
        description: 'A later opportunity outside the reminder window.',
        sport: 'Athletics',
        deadline: later,
        status: 'published',
      },
    ]);

    await SavedOpportunity.create([
      { user: userId(owner), opportunity: soonOpportunity._id },
      { user: userId(owner), opportunity: laterOpportunity._id },
    ]);

    const firstRun = await runDeadlineReminders();
    expect(firstRun.reminded).toBe(1);
    expect(
      await Notification.countDocuments({
        user: userId(owner),
        type: 'opportunity_deadline',
      }),
    ).toBe(1);

    const secondRun = await runDeadlineReminders();
    expect(secondRun.reminded).toBe(0);
    expect(
      await Notification.countDocuments({
        user: userId(owner),
        type: 'opportunity_deadline',
      }),
    ).toBe(1);
  });

  it('authenticates sockets, joins user rooms, and emits typing and message events', async () => {
    const first = await registerAndLogin({ name: 'Socket First', role: 'athlete' });
    const second = await registerAndLogin({ name: 'Socket Second', role: 'athlete' });
    await connect(first, second);
    const conversation = await start(first, second);

    const httpServer = http.createServer(app);
    initializeSocket(httpServer);
    await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
    const url = `http://127.0.0.1:${httpServer.address().port}`;

    const sockets = [];
    try {
      const rejected = createClient(url, {
        auth: { token: 'not-a-token' },
        transports: ['websocket'],
        forceNew: true,
      });
      sockets.push(rejected);
      const authError = await new Promise((resolve) => {
        rejected.on('connect_error', resolve);
      });
      expect(authError.message).toBe('AUTH_INVALID');
      rejected.close();

      const firstSocket = createClient(url, {
        auth: { token: first.accessToken },
        transports: ['websocket'],
        forceNew: true,
      });
      const secondSocket = createClient(url, {
        auth: { token: second.accessToken },
        transports: ['websocket'],
        forceNew: true,
      });
      sockets.push(firstSocket, secondSocket);
      await Promise.all([
        new Promise((resolve) => firstSocket.on('connect', resolve)),
        new Promise((resolve) => secondSocket.on('connect', resolve)),
      ]);

      const typingEvent = new Promise((resolve) => {
        secondSocket.on('message:typing', resolve);
      });
      const acknowledged = new Promise((resolve) => {
        firstSocket.emit(
          'message:typing',
          { conversationId: conversation.id, isTyping: true },
          resolve,
        );
      });
      expect(await acknowledged).toEqual({ ok: true });
      expect(await typingEvent).toMatchObject({
        conversationId: conversation.id,
        userId: userId(first),
        isTyping: true,
      });

      const messageEvent = new Promise((resolve) => {
        secondSocket.on('message:new', resolve);
      });
      const sent = await send(first, conversation.id, 'Live socket message');
      expect(sent.status).toBe(201);
      expect(await messageEvent).toMatchObject({
        conversationId: conversation.id,
        message: { text: 'Live socket message' },
      });
    } finally {
      sockets.forEach((socket) => socket.close());
      await closeSocket();
      if (httpServer.listening) {
        await new Promise((resolve) => httpServer.close(resolve));
      }
    }
  });
});
