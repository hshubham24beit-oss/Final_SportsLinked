const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Like = require('../models/Like');
const User = require('../models/User');
const Follow = require('../models/Follow');
const ApiError = require('../utils/ApiError');
const { encodeCursor, decodeCursor } = require('../utils/cursor');
const connectionService = require('./connection.service');
const blockService = require('./block.service');
const notificationService = require('./notification.service');
const { safeDeleteImage, uploadImage } = require('./media.service');
const {
  getUserSummaryMap,
  getUserProfile,
  lower,
} = require('./social.service');
const {
  ROLES,
  USER_STATUS,
  POST_TYPES,
  POST_VISIBILITY_VALUES,
  FEED_PAGE_DEFAULT,
  FEED_PAGE_MAX,
  POST_MEDIA_MAX,
  COMMENT_TEXT_MAX,
} = require('../config/constants');

function clampFeedLimit(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return FEED_PAGE_DEFAULT;
  }
  return Math.min(Math.floor(parsed), FEED_PAGE_MAX);
}

function assertNotAdmin(user, action = 'create posts') {
  if (user.role === ROLES.ADMIN) {
    throw ApiError.forbidden(
      `Administrator accounts cannot ${action}.`,
      'POST_ADMIN_FORBIDDEN',
    );
  }
}

async function getViewerContext(viewer) {
  if (!viewer) {
    return {
      connectionIds: [],
      connectionSet: new Set(),
      followSet: new Set(),
      sports: [],
      blockedIds: [],
      blockedSet: new Set(),
    };
  }

  const [connectionIds, followingIds, profile, blockedIds] = await Promise.all([
    connectionService.acceptedPartnerIds(viewer._id),
    Follow.find({ follower: viewer._id }).distinct('following'),
    getUserProfile(viewer),
    blockService.getBlockedUserIds(viewer._id),
  ]);

  return {
    connectionIds,
    connectionSet: new Set(connectionIds.map(String)),
    followSet: new Set(followingIds.map(String)),
    sports: (profile?.sports || []).filter(Boolean),
    blockedIds,
    blockedSet: new Set(blockedIds.map(String)),
  };
}

function canViewPost(post, viewer, context) {
  if (!post) {
    return false;
  }
  if (!viewer) {
    return post.visibility === 'public';
  }
  if (String(post.author) === String(viewer._id)) {
    return true;
  }
  if (post.visibility === 'public') {
    return true;
  }
  return context.connectionSet.has(String(post.author));
}

async function assertAccessiblePost(postId, viewer, context = null) {
  if (!mongoose.Types.ObjectId.isValid(postId)) {
    throw ApiError.notFound('That post could not be found.', 'POST_NOT_FOUND');
  }

  const post = await Post.findById(postId);
  if (!post) {
    throw ApiError.notFound('That post could not be found.', 'POST_NOT_FOUND');
  }

  const author = await User.findById(post.author).select('status');
  if (
    !author ||
    ![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(author.status)
  ) {
    throw ApiError.notFound('That post could not be found.', 'POST_NOT_FOUND');
  }

  if (viewer) {
    await blockService.assertNotBlocked(viewer._id, post.author);
  }

  const viewerContext = context || (await getViewerContext(viewer));
  if (!canViewPost(post, viewer, viewerContext)) {
    throw ApiError.notFound('That post could not be found.', 'POST_NOT_FOUND');
  }

  return { post, context: viewerContext };
}

async function hydratePosts(rawPosts, viewer, context = null) {
  if (rawPosts.length === 0) {
    return [];
  }

  const viewerContext = context || (await getViewerContext(viewer));
  const postIds = rawPosts.map((post) => post._id);
  const summaries = await getUserSummaryMap(rawPosts.map((post) => post.author));

  let likedIds = new Set();
  if (viewer) {
    const likes = await Like.find({
      post: { $in: postIds },
      user: viewer._id,
    })
      .select('post')
      .lean();
    likedIds = new Set(likes.map((like) => String(like.post)));
  }

  return rawPosts
    .map((post) => {
      const author = summaries.get(String(post.author));
      if (!author) {
        return null;
      }

      let priorityReason = null;
      if (viewer) {
        if (String(post.author) === String(viewer._id)) {
          priorityReason = 'Your post';
        } else if (viewerContext.connectionSet.has(String(post.author))) {
          priorityReason = 'Connection';
        } else if (viewerContext.followSet.has(String(post.author))) {
          priorityReason = 'Following';
        } else if (
          post.sport &&
          viewerContext.sports.some((sport) => lower(sport) === lower(post.sport))
        ) {
          priorityReason = 'Shared sport';
        }
      }

      return {
        id: String(post._id),
        text: post.text || '',
        media: post.media || [],
        type: post.type,
        visibility: post.visibility,
        sport: post.sport || '',
        author,
        sharedPost: post.sharedPost ? { unavailable: true } : null,
        commentCount: post.commentCount || 0,
        likeCount: post.likeCount || 0,
        shareCount: post.shareCount || 0,
        likedByMe: likedIds.has(String(post._id)),
        canDelete: Boolean(viewer && String(post.author) === String(viewer._id)),
        priorityReason,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      };
    })
    .filter(Boolean);
}

function serializeSharedPost(shared, summaries, context) {
  if (
    context.blockedSet.has(String(shared.author)) ||
    (shared.visibility === 'connections' &&
      !context.connectionSet.has(String(shared.author)))
  ) {
    return { unavailable: true };
  }
  const author = summaries.get(String(shared.author));
  if (!author) {
    return { unavailable: true };
  }
  return {
    id: String(shared._id),
    text: shared.text || '',
    media: shared.media || [],
    type: shared.type,
    visibility: shared.visibility,
    sport: shared.sport || '',
    author,
    createdAt: shared.createdAt,
  };
}

async function finalizeSharedPosts(posts, rawPosts, context) {
  const sharedIds = [
    ...new Set(
      rawPosts
        .map((post) => (post.sharedPost ? String(post.sharedPost) : null))
        .filter(Boolean),
    ),
  ];
  if (sharedIds.length === 0) {
    return posts;
  }

  const rawById = new Map(rawPosts.map((post) => [String(post._id), post]));
  const sharedPosts = await Post.find({ _id: { $in: sharedIds } })
    .select('author text media type visibility sport createdAt')
    .lean();
  const sharedMap = new Map(sharedPosts.map((post) => [String(post._id), post]));
  const summaries = await getUserSummaryMap(sharedPosts.map((post) => post.author));

  return posts.map((post) => {
    const raw = rawById.get(post.id);
    if (!raw?.sharedPost || !sharedMap.has(String(raw.sharedPost))) {
      return post;
    }
    return {
      ...post,
      sharedPost: serializeSharedPost(
        sharedMap.get(String(raw.sharedPost)),
        summaries,
        context,
      ),
    };
  });
}

async function hydratePostsComplete(rawPosts, viewer, context = null) {
  const viewerContext = context || (await getViewerContext(viewer));
  const base = await hydratePosts(rawPosts, viewer, viewerContext);
  return finalizeSharedPosts(base, rawPosts, viewerContext);
}

async function listFeed(viewer, query = {}) {
  const limit = clampFeedLimit(query.limit);
  const cursor = decodeCursor(query.cursor);
  const context = await getViewerContext(viewer);
  const connectionObjectIds = context.connectionIds.map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  const followObjectIds = [...context.followSet].map(
    (id) => new mongoose.Types.ObjectId(id),
  );
  const blockedObjectIds = context.blockedIds.map(
    (id) => new mongoose.Types.ObjectId(id),
  );

  const match = {
    author: { $nin: blockedObjectIds },
    $and: [
      { visibility: { $in: POST_VISIBILITY_VALUES } },
      {
        $or: [
          { visibility: 'public' },
          { author: viewer._id },
          { author: { $in: connectionObjectIds } },
        ],
      },
    ],
  };

  const pipeline = [
    { $match: match },
    {
      $lookup: {
        from: 'users',
        localField: 'author',
        foreignField: '_id',
        as: 'authorUser',
      },
    },
    {
      $match: {
        'authorUser.status': { $in: [USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED] },
      },
    },
    {
      $addFields: {
        priorityScore: {
          $add: [
            {
              $cond: [{ $eq: ['$author', viewer._id] }, 4, 0],
            },
            {
              $cond: [{ $in: ['$author', connectionObjectIds] }, 3, 0],
            },
            {
              $cond: [{ $in: ['$author', followObjectIds] }, 2, 0],
            },
            {
              $cond: [
                {
                  $and: [
                    { $ne: ['$sport', ''] },
                    {
                      $in: [
                        { $toLower: '$sport' },
                        context.sports.map((sport) => lower(sport)),
                      ],
                    },
                  ],
                },
                1,
                0,
              ],
            },
          ],
        },
      },
    },
  ];

  if (cursor) {
    if (!mongoose.Types.ObjectId.isValid(cursor.id)) {
      throw ApiError.badRequest('The feed cursor is invalid.', 'INVALID_CURSOR');
    }
    pipeline.push({
      $match: {
        $or: [
          { priorityScore: { $lt: cursor.score } },
          {
            priorityScore: cursor.score,
            createdAt: { $lt: new Date(cursor.createdAt) },
          },
          {
            priorityScore: cursor.score,
            createdAt: new Date(cursor.createdAt),
            _id: { $lt: new mongoose.Types.ObjectId(cursor.id) },
          },
        ],
      },
    });
  }

  pipeline.push(
    { $sort: { priorityScore: -1, createdAt: -1, _id: -1 } },
    { $limit: limit + 1 },
    { $unset: 'authorUser' },
  );

  const results = await Post.aggregate(pipeline);
  const hasMore = results.length > limit;
  const pageRows = hasMore ? results.slice(0, limit) : results;
  const posts = await hydratePostsComplete(pageRows, viewer, context);

  let nextCursor = null;
  if (hasMore && pageRows.length > 0) {
    const last = pageRows[pageRows.length - 1];
    nextCursor = encodeCursor({
      score: last.priorityScore,
      createdAt: last.createdAt.toISOString(),
      id: String(last._id),
    });
  }

  return { posts, meta: { nextCursor, hasMore, limit } };
}

function normalizeMedia(media = []) {
  if (!Array.isArray(media)) {
    return [];
  }
  return media.slice(0, POST_MEDIA_MAX).map((item) => ({
    url: item.url,
    publicId: item.publicId || '',
    provider: item.provider || 'external',
    width: item.width,
    height: item.height,
  }));
}

async function resolvePostSport(user, requestedSport = '') {
  if (String(requestedSport || '').trim()) {
    return String(requestedSport).trim();
  }
  const profile = await getUserProfile(user);
  return profile?.sports?.[0] || '';
}

async function createPost(user, input) {
  assertNotAdmin(user);
  const text = String(input.text || '').trim();
  const media = normalizeMedia(input.media);
  if (!text && media.length === 0) {
    throw ApiError.badRequest(
      'Write something or add an image before posting.',
      'POST_CONTENT_REQUIRED',
    );
  }

  const type = input.type || 'text';
  if (!POST_TYPES.includes(type)) {
    throw ApiError.badRequest('Choose a valid post type.', 'POST_TYPE_INVALID');
  }

  const post = await Post.create({
    author: user._id,
    text,
    media,
    type,
    visibility: input.visibility || 'public',
    sport: await resolvePostSport(user, input.sport),
  });

  const [serialized] = await hydratePostsComplete([post.toObject()], user);
  return serialized;
}

async function getPost(user, postId) {
  const { post, context } = await assertAccessiblePost(postId, user);
  const [serialized] = await hydratePostsComplete([post.toObject()], user, context);
  return serialized;
}

async function updatePost(user, postId, input) {
  const { post } = await assertAccessiblePost(postId, user);
  if (String(post.author) !== String(user._id)) {
    throw ApiError.forbidden('You can only edit your own posts.', 'POST_OWNER_ONLY');
  }

  if (post.type === 'share') {
    if (input.text !== undefined) {
      post.text = String(input.text || '').trim();
    }
    if (input.visibility !== undefined) {
      post.visibility = input.visibility;
    }
    await post.save();
    const [serialized] = await hydratePostsComplete([post.toObject()], user);
    return serialized;
  }

  const previousMedia = (post.media || []).map((item) =>
    item.toObject ? item.toObject() : { ...item },
  );

  if (input.text !== undefined) {
    post.text = String(input.text || '').trim();
  }
  if (input.media !== undefined) {
    post.media = normalizeMedia(input.media);
  }
  if (input.visibility !== undefined) {
    post.visibility = input.visibility;
  }
  if (input.sport !== undefined) {
    post.sport = String(input.sport || '').trim();
  }

  if (!String(post.text || '').trim() && post.media.length === 0) {
    throw ApiError.badRequest(
      'Write something or add an image before saving.',
      'POST_CONTENT_REQUIRED',
    );
  }

  await post.save();

  const retained = new Set((post.media || []).map((item) => item.publicId).filter(Boolean));
  for (const media of previousMedia) {
    if (media.publicId && !retained.has(media.publicId)) {
      await safeDeleteImage(media);
    }
  }

  const [serialized] = await hydratePostsComplete([post.toObject()], user);
  return serialized;
}

async function deletePost(user, postId) {
  const { post } = await assertAccessiblePost(postId, user);
  if (String(post.author) !== String(user._id)) {
    throw ApiError.forbidden('You can only delete your own posts.', 'POST_OWNER_ONLY');
  }

  if (post.type === 'share' && post.sharedPost) {
    await Post.updateOne(
      { _id: post.sharedPost, shareCount: { $gt: 0 } },
      { $inc: { shareCount: -1 } },
    );
  }

  const roots = post.type === 'share' ? [] : [post._id];
  const shared = roots.length
    ? await Post.find({ sharedPost: { $in: roots } }).select('_id').lean()
    : [];
  const ids = [post._id, ...shared.map((entry) => entry._id)];
  const allPosts = await Post.find({ _id: { $in: ids } }).select('media').lean();

  await Promise.all([
    Comment.deleteMany({ post: { $in: ids } }),
    Like.deleteMany({ post: { $in: ids } }),
    Post.deleteMany({ _id: { $in: ids } }),
  ]);

  for (const entry of allPosts) {
    for (const media of entry.media || []) {
      await safeDeleteImage(media);
    }
  }

  return { deleted: true, id: String(post._id) };
}

async function listComments(user, postId, query = {}) {
  const { post } = await assertAccessiblePost(postId, user);
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(Math.max(1, Number(query.limit) || 20), 50);

  const [comments, total] = await Promise.all([
    Comment.find({ post: post._id })
      .sort({ createdAt: 1, _id: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Comment.countDocuments({ post: post._id }),
  ]);

  const summaries = await getUserSummaryMap(comments.map((comment) => comment.author));
  return {
    comments: comments
      .map((comment) => {
        const author = summaries.get(String(comment.author));
        if (!author) {
          return null;
        }
        return {
          id: String(comment._id),
          text: comment.text,
          author,
          canDelete:
            String(comment.author) === String(user._id) ||
            String(post.author) === String(user._id),
          createdAt: comment.createdAt,
        };
      })
      .filter(Boolean),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function addComment(user, postId, text) {
  const { post } = await assertAccessiblePost(postId, user);
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw ApiError.badRequest('Write a comment before sending.', 'COMMENT_REQUIRED');
  }
  if (trimmed.length > COMMENT_TEXT_MAX) {
    throw ApiError.badRequest(
      `Comments cannot exceed ${COMMENT_TEXT_MAX} characters.`,
      'COMMENT_TOO_LONG',
    );
  }

  const comment = await Comment.create({
    post: post._id,
    author: user._id,
    text: trimmed,
  });
  await Post.updateOne({ _id: post._id }, { $inc: { commentCount: 1 } });

  if (String(post.author) !== String(user._id)) {
    await notificationService.createNotification({
      userId: post.author,
      type: 'post_comment',
      title: 'New comment on your post',
      message: `${user.name} commented: ${trimmed.slice(0, 120)}`,
      link: `/feed#post-${post._id}`,
      metadata: { postId: String(post._id), commentId: String(comment._id) },
    });
  }

  const summaries = await getUserSummaryMap([user._id]);
  return {
    id: String(comment._id),
    text: comment.text,
    author: summaries.get(String(user._id)) || null,
    canDelete: true,
    createdAt: comment.createdAt,
  };
}

async function deleteComment(user, postId, commentId) {
  const { post } = await assertAccessiblePost(postId, user);
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw ApiError.notFound('Comment not found.', 'COMMENT_NOT_FOUND');
  }

  const comment = await Comment.findOne({ _id: commentId, post: post._id });
  if (!comment) {
    throw ApiError.notFound('Comment not found.', 'COMMENT_NOT_FOUND');
  }
  if (
    String(comment.author) !== String(user._id) &&
    String(post.author) !== String(user._id)
  ) {
    throw ApiError.forbidden(
      'You can only delete your own comments.',
      'COMMENT_FORBIDDEN',
    );
  }

  await Comment.deleteOne({ _id: comment._id });
  await Post.updateOne(
    { _id: post._id, commentCount: { $gt: 0 } },
    { $inc: { commentCount: -1 } },
  );
  return { deleted: true, id: String(comment._id) };
}

async function likePost(user, postId) {
  const { post } = await assertAccessiblePost(postId, user);
  const result = await Like.updateOne(
    { post: post._id, user: user._id },
    { $setOnInsert: { post: post._id, user: user._id } },
    { upsert: true },
  );

  if (result.upsertedCount > 0) {
    await Post.updateOne({ _id: post._id }, { $inc: { likeCount: 1 } });
    if (String(post.author) !== String(user._id)) {
      await notificationService.createNotification({
        userId: post.author,
        type: 'post_like',
        title: 'New like on your post',
        message: `${user.name} liked your post.`,
        link: `/feed#post-${post._id}`,
        metadata: { postId: String(post._id), userId: String(user._id) },
      });
    }
  }

  return {
    liked: true,
    likeCount: await Post.findById(post._id).then((entry) => entry?.likeCount || 0),
  };
}

async function unlikePost(user, postId) {
  const { post } = await assertAccessiblePost(postId, user);
  const result = await Like.deleteOne({ post: post._id, user: user._id });
  if (result.deletedCount > 0) {
    await Post.updateOne(
      { _id: post._id, likeCount: { $gt: 0 } },
      { $inc: { likeCount: -1 } },
    );
  }

  return {
    liked: false,
    likeCount: await Post.findById(post._id).then((entry) => entry?.likeCount || 0),
  };
}

async function sharePost(user, postId, text = '') {
  const { post } = await assertAccessiblePost(postId, user);
  if (post.visibility !== 'public') {
    throw ApiError.badRequest(
      'Only public posts can be shared.',
      'POST_SHARE_VISIBILITY',
    );
  }

  const rootId = post.sharedPost || post._id;
  const root = await Post.findById(rootId);
  if (!root) {
    throw ApiError.notFound('That post could not be found.', 'POST_NOT_FOUND');
  }

  const existing = await Post.findOne({ author: user._id, type: 'share', sharedPost: root._id });
  if (existing) {
    const [serialized] = await hydratePostsComplete([existing.toObject()], user);
    return { post: serialized, alreadyShared: true };
  }

  const share = await Post.create({
    author: user._id,
    text: String(text || '').trim(),
    type: 'share',
    visibility: 'public',
    sport: root.sport || '',
    sharedPost: root._id,
  });
  await Post.updateOne({ _id: root._id }, { $inc: { shareCount: 1 } });

  if (String(root.author) !== String(user._id)) {
    await notificationService.createNotification({
      userId: root.author,
      type: 'post_share',
      title: 'Your post was shared',
      message: `${user.name} shared your post.`,
      link: `/feed#post-${share._id}`,
      metadata: { postId: String(share._id), originalPostId: String(root._id) },
    });
  }

  const [serialized] = await hydratePostsComplete([share.toObject()], user);
  return { post: serialized, alreadyShared: false };
}

async function listUserPosts(targetUserId, viewer, query = {}) {
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }
  const target = await User.findById(targetUserId).select('status');
  if (
    !target ||
    ![USER_STATUS.ACTIVE, USER_STATUS.RESTRICTED].includes(target.status)
  ) {
    throw ApiError.notFound('That account could not be found.', 'USER_NOT_FOUND');
  }

  const context = await getViewerContext(viewer);
  if (viewer) {
    await blockService.assertNotBlocked(viewer._id, target._id);
  }

  const limit = Math.min(Math.max(1, Number(query.limit) || 5), 20);
  const isSelf = Boolean(viewer && String(viewer._id) === String(target._id));
  const visibilityFilter = isSelf
    ? {}
    : {
        $or: [
          { visibility: 'public' },
          ...(viewer && context.connectionSet.has(String(target._id))
            ? [{ visibility: 'connections' }]
            : []),
        ],
      };

  const posts = await Post.find({ author: target._id, ...visibilityFilter })
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  return hydratePostsComplete(posts, viewer, context);
}

async function uploadPostMedia(user, file) {
  assertNotAdmin(user);
  return uploadImage(file, { folder: `${user.role}/posts` });
}

async function deletePostsForUser(userId) {
  const owned = await Post.find({ author: userId }).select('_id').lean();
  const ownedIds = owned.map((entry) => entry._id);
  const shared = await Post.find({ sharedPost: { $in: ownedIds } }).select('_id').lean();
  const ids = [...ownedIds, ...shared.map((entry) => entry._id)];

  const posts = await Post.find({ _id: { $in: ids } }).select('media').lean();
  await Promise.all([
    Comment.deleteMany({ $or: [{ post: { $in: ids } }, { author: userId }] }),
    Like.deleteMany({ $or: [{ post: { $in: ids } }, { user: userId }] }),
    Post.deleteMany({ _id: { $in: ids } }),
  ]);

  for (const post of posts) {
    for (const media of post.media || []) {
      await safeDeleteImage(media);
    }
  }
}

module.exports = {
  listFeed,
  getPost,
  createPost,
  updatePost,
  deletePost,
  listComments,
  addComment,
  deleteComment,
  likePost,
  unlikePost,
  sharePost,
  listUserPosts,
  uploadPostMedia,
  deletePostsForUser,
  hydratePosts: hydratePostsComplete,
  getViewerContext,
};
