const request = require('supertest');
const {
  app,
  API,
  registerAndLogin,
  authHeader,
} = require('./helpers');
const Notification = require('../models/Notification');
const Connection = require('../models/Connection');

function athleteProfile(overrides = {}) {
  return {
    headline: 'Athlete building a sporting network',
    bio: 'Training and competing while connecting with the sporting community.',
    location: { city: 'Pune', region: 'Maharashtra', country: 'India' },
    sports: ['Athletics'],
    positions: ['100m'],
    level: 'professional',
    ageCategory: 'senior',
    competitionLevel: 'national',
    experienceYears: 5,
    ...overrides,
  };
}

async function onboardAthlete(name, overrides = {}) {
  const registered = await registerAndLogin({ name, role: 'athlete' });
  const response = await request(app)
    .post(`${API}/profiles/onboarding`)
    .set(authHeader(registered.accessToken))
    .send(athleteProfile(overrides));
  expect([200, 201]).toContain(response.status);
  return {
    ...registered,
    profile: response.body.data.profile,
    userId: registered.loginResponse.body.data.user.id,
  };
}

async function sendConnection(from, to) {
  const response = await request(app)
    .post(`${API}/connections/requests`)
    .set(authHeader(from.accessToken))
    .send({ userId: to.userId, message: 'Let us connect.' });
  expect(response.status).toBe(201);
  return response.body.data.connection;
}

async function acceptConnection(recipient, connectionId) {
  const response = await request(app)
    .post(`${API}/connections/${connectionId}/accept`)
    .set(authHeader(recipient.accessToken));
  expect(response.status).toBe(200);
  return response.body.data.connection;
}

async function connect(first, second) {
  const connection = await sendConnection(first, second);
  return acceptConnection(second, connection.id);
}

async function createPost(athlete, overrides = {}) {
  const response = await request(app)
    .post(`${API}/posts`)
    .set(authHeader(athlete.accessToken))
    .send({
      text: `Post from ${athlete.payload.name}`,
      visibility: 'public',
      ...overrides,
    });
  expect(response.status).toBe(201);
  return response.body.data.post;
}

describe('Phase 6 networking, feed, and post interactions', () => {
  it('prevents duplicate and self connections while keeping follows distinct', async () => {
    const first = await onboardAthlete('Network First');
    const second = await onboardAthlete('Network Second');

    const self = await request(app)
      .post(`${API}/connections/requests`)
      .set(authHeader(first.accessToken))
      .send({ userId: first.userId });
    expect(self.status).toBe(400);
    expect(self.body.code).toBe('CONNECTION_SELF');

    const requestRecord = await sendConnection(first, second);

    const duplicate = await request(app)
      .post(`${API}/connections/requests`)
      .set(authHeader(first.accessToken))
      .send({ userId: second.userId });
    expect(duplicate.status).toBe(409);
    expect(duplicate.body.code).toBe('CONNECTION_DUPLICATE');

    const reverseDuplicate = await request(app)
      .post(`${API}/connections/requests`)
      .set(authHeader(second.accessToken))
      .send({ userId: first.userId });
    expect(reverseDuplicate.status).toBe(409);

    await acceptConnection(second, requestRecord.id);

    const acceptedNotification = await Notification.findOne({
      user: first.userId,
      type: 'connection_accepted',
    });
    expect(acceptedNotification).not.toBeNull();

    const follow = await request(app)
      .post(`${API}/follows/${first.userId}`)
      .set(authHeader(second.accessToken));
    expect(follow.status).toBe(200);
    expect(follow.body.data.isFollowing).toBe(true);

    const profile = await request(app)
      .get(`${API}/profiles/${first.profile.slug}`)
      .set(authHeader(second.accessToken));
    expect(profile.status).toBe(200);
    expect(profile.body.data.profile.network).toMatchObject({
      connectionStatus: 'accepted',
      isFollowing: true,
      followedBy: false,
      followerCount: 1,
      connectionCount: 1,
    });

    const followCount = await request(app)
      .post(`${API}/follows/${first.userId}`)
      .set(authHeader(second.accessToken));
    expect(followCount.status).toBe(200);
    expect(followCount.body.data.followerCount).toBe(1);

    const statuses = await request(app)
      .get(`${API}/connections`)
      .set(authHeader(second.accessToken));
    expect(statuses.body.data.connections[0].user.name).toBe('Network First');
  });

  it('blocks all interactions and feed visibility between blocked users', async () => {
    const author = await onboardAthlete('Blocked Author');
    const viewer = await onboardAthlete('Blocking Viewer');
    const post = await createPost(author);

    const block = await request(app)
      .post(`${API}/blocks`)
      .set(authHeader(viewer.accessToken))
      .send({ userId: author.userId, reason: 'Testing block' });
    expect(block.status).toBe(201);

    const connection = await request(app)
      .post(`${API}/connections/requests`)
      .set(authHeader(viewer.accessToken))
      .send({ userId: author.userId });
    expect(connection.status).toBe(404);

    const follow = await request(app)
      .post(`${API}/follows/${author.userId}`)
      .set(authHeader(viewer.accessToken));
    expect(follow.status).toBe(404);

    const viewPost = await request(app)
      .get(`${API}/posts/${post.id}`)
      .set(authHeader(viewer.accessToken));
    expect(viewPost.status).toBe(404);

    const like = await request(app)
      .post(`${API}/posts/${post.id}/like`)
      .set(authHeader(viewer.accessToken));
    expect(like.status).toBe(404);

    const comment = await request(app)
      .post(`${API}/posts/${post.id}/comments`)
      .set(authHeader(viewer.accessToken))
      .send({ text: 'This should be blocked.' });
    expect(comment.status).toBe(404);

    const feed = await request(app)
      .get(`${API}/feed`)
      .set(authHeader(viewer.accessToken));
    expect(feed.status).toBe(200);
    expect(feed.body.data.posts).toHaveLength(0);

    const profile = await request(app)
      .get(`${API}/profiles/${author.profile.slug}`)
      .set(authHeader(viewer.accessToken));
    expect(profile.status).toBe(404);
  });

  it('paginates the feed and prioritizes connections, follows, and shared sport', async () => {
    const viewer = await onboardAthlete('Feed Viewer');
    const connection = await onboardAthlete('Feed Connection');
    const followed = await onboardAthlete('Feed Followed');
    const sharedSport = await onboardAthlete('Feed Shared Sport');
    const unrelated = await onboardAthlete('Feed Unrelated', { sports: ['Football'] });

    await connect(viewer, connection);
    const follow = await request(app)
      .post(`${API}/follows/${followed.userId}`)
      .set(authHeader(viewer.accessToken));
    expect(follow.status).toBe(200);

    const connectionPost = await createPost(connection, { text: 'Connection post' });
    const followedPost = await createPost(followed, { text: 'Followed post' });
    const sharedPost = await createPost(sharedSport, {
      text: 'Shared sport post',
      sport: 'Athletics',
    });
    const unrelatedPost = await createPost(unrelated, {
      text: 'Unrelated sport post',
      sport: 'Football',
    });

    const firstPage = await request(app)
      .get(`${API}/feed?limit=2`)
      .set(authHeader(viewer.accessToken));
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.data.posts.map((post) => post.id)).toEqual([
      connectionPost.id,
      followedPost.id,
    ]);
    expect(firstPage.body.data.posts.map((post) => post.priorityReason)).toEqual([
      'Connection',
      'Following',
    ]);
    expect(firstPage.body.meta.hasMore).toBe(true);
    expect(firstPage.body.meta.nextCursor).toBeTruthy();

    const secondPage = await request(app)
      .get(
        `${API}/feed?limit=2&cursor=${encodeURIComponent(firstPage.body.meta.nextCursor)}`,
      )
      .set(authHeader(viewer.accessToken));
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.data.posts.map((post) => post.id)).toEqual([
      sharedPost.id,
      unrelatedPost.id,
    ]);
    expect(secondPage.body.data.posts[0].priorityReason).toBe('Shared sport');
    expect(secondPage.body.meta.hasMore).toBe(false);

    const ids = [
      ...firstPage.body.data.posts.map((post) => post.id),
      ...secondPage.body.data.posts.map((post) => post.id),
    ];
    expect(new Set(ids).size).toBe(4);
  });

  it('enforces post ownership and supports likes, comments, shares, and notifications', async () => {
    const author = await onboardAthlete('Post Author');
    const reader = await onboardAthlete('Post Reader');
    const post = await createPost(author, { text: 'A post to interact with' });

    const forbiddenUpdate = await request(app)
      .patch(`${API}/posts/${post.id}`)
      .set(authHeader(reader.accessToken))
      .send({ text: 'Hijacked' });
    expect(forbiddenUpdate.status).toBe(403);
    expect(forbiddenUpdate.body.code).toBe('POST_OWNER_ONLY');

    const forbiddenDelete = await request(app)
      .delete(`${API}/posts/${post.id}`)
      .set(authHeader(reader.accessToken));
    expect(forbiddenDelete.status).toBe(403);

    const like = await request(app)
      .post(`${API}/posts/${post.id}/like`)
      .set(authHeader(reader.accessToken));
    expect(like.status).toBe(200);
    expect(like.body.data).toMatchObject({ liked: true, likeCount: 1 });

    const duplicateLike = await request(app)
      .post(`${API}/posts/${post.id}/like`)
      .set(authHeader(reader.accessToken));
    expect(duplicateLike.body.data.likeCount).toBe(1);

    const comment = await request(app)
      .post(`${API}/posts/${post.id}/comments`)
      .set(authHeader(reader.accessToken))
      .send({ text: 'Useful update.' });
    expect(comment.status).toBe(201);
    expect(comment.body.data.comment.author.name).toBe('Post Reader');

    const comments = await request(app)
      .get(`${API}/posts/${post.id}/comments`)
      .set(authHeader(author.accessToken));
    expect(comments.status).toBe(200);
    expect(comments.body.data.comments).toHaveLength(1);

    const [likeNotification, commentNotification] = await Promise.all([
      Notification.exists({
        user: author.userId,
        type: 'post_like',
      }),
      Notification.exists({
        user: author.userId,
        type: 'post_comment',
      }),
    ]);
    expect(likeNotification).toBeTruthy();
    expect(commentNotification).toBeTruthy();

    const share = await request(app)
      .post(`${API}/posts/${post.id}/share`)
      .set(authHeader(reader.accessToken))
      .send({ text: 'Sharing this' });
    expect(share.status).toBe(201);
    expect(share.body.data.post.sharedPost.id).toBe(post.id);
    expect(share.body.data.post.sharedPost.author.name).toBe('Post Author');

    const duplicateShare = await request(app)
      .post(`${API}/posts/${post.id}/share`)
      .set(authHeader(reader.accessToken))
      .send({ text: 'Again' });
    expect(duplicateShare.status).toBe(201);
    expect(duplicateShare.body.data.alreadyShared).toBe(true);

    const shareNotification = await Notification.exists({
      user: author.userId,
      type: 'post_share',
    });
    expect(shareNotification).toBeTruthy();

    const deleteComment = await request(app)
      .delete(`${API}/posts/${post.id}/comments/${comment.body.data.comment.id}`)
      .set(authHeader(reader.accessToken));
    expect(deleteComment.status).toBe(200);

    const deletePost = await request(app)
      .delete(`${API}/posts/${post.id}`)
      .set(authHeader(author.accessToken));
    expect(deletePost.status).toBe(200);

    const deletedShare = await request(app)
      .get(`${API}/posts/${share.body.data.post.id}`)
      .set(authHeader(author.accessToken));
    expect(deletedShare.status).toBe(404);
  });

  it('suggests people using transparent criteria and lists mutual connections', async () => {
    const first = await onboardAthlete('Suggestion First');
    const second = await onboardAthlete('Suggestion Second');
    const bridge = await onboardAthlete('Suggestion Bridge');

    await connect(first, bridge);
    await connect(second, bridge);

    const suggestions = await request(app)
      .get(`${API}/connections/suggestions`)
      .set(authHeader(first.accessToken));
    expect(suggestions.status).toBe(200);
    const candidate = suggestions.body.data.suggestions.find(
      (entry) => entry.user.id === second.userId,
    );
    expect(candidate).toBeTruthy();
    expect(candidate.reasons).toEqual(
      expect.arrayContaining([
        'Shared sport: Athletics',
        'Same city: Pune',
        'Shared role: Athlete',
      ]),
    );
    expect(suggestions.body.data.criteria).toEqual(
      expect.arrayContaining(['Shared sport', 'Same city or country', 'Same platform role']),
    );

    const mutual = await request(app)
      .get(`${API}/connections/mutual/${second.userId}`)
      .set(authHeader(first.accessToken));
    expect(mutual.status).toBe(200);
    expect(mutual.body.data.count).toBe(1);
    expect(mutual.body.data.connections[0].id).toBe(bridge.userId);

    expect(await Connection.countDocuments({ status: 'accepted' })).toBe(2);
  });
});
