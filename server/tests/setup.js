const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const config = require('../config/env');
const { clearOutbox } = require('../services/email.service');

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create({ instance: { dbName: 'sportlinked_test' } });
  await mongoose.connect(mongod.getUri('sportlinked_test'));
  const User = require('../models/User');
  const AthleteProfile = require('../models/AthleteProfile');
  const Achievement = require('../models/Achievement');
  const SavedCandidate = require('../models/SavedCandidate');
  const BlockedUser = require('../models/BlockedUser');
  const Opportunity = require('../models/Opportunity');
  const Application = require('../models/Application');
  const SavedOpportunity = require('../models/SavedOpportunity');
  const Notification = require('../models/Notification');
  const VerificationRequest = require('../models/VerificationRequest');
  const VerificationEvidence = require('../models/VerificationEvidence');
  const VerificationAuditLog = require('../models/VerificationAuditLog');
  const Report = require('../models/Report');
  const Connection = require('../models/Connection');
  const Follow = require('../models/Follow');
  const Post = require('../models/Post');
  const Comment = require('../models/Comment');
  const Like = require('../models/Like');
  const Conversation = require('../models/Conversation');
  const Message = require('../models/Message');
  const Event = require('../models/Event');
  const EventRegistration = require('../models/EventRegistration');
  const Team = require('../models/Team');
  const TeamMembership = require('../models/TeamMembership');
  await Promise.all([
    User.init(),
    AthleteProfile.init(),
    Achievement.init(),
    SavedCandidate.init(),
    BlockedUser.init(),
    Opportunity.init(),
    Application.init(),
    SavedOpportunity.init(),
    Notification.init(),
    VerificationRequest.init(),
    VerificationEvidence.init(),
    VerificationAuditLog.init(),
    Report.init(),
    Connection.init(),
    Follow.init(),
    Post.init(),
    Comment.init(),
    Like.init(),
    Conversation.init(),
    Message.init(),
    Event.init(),
    EventRegistration.init(),
    Team.init(),
    TeamMembership.init(),
  ]);
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
  clearOutbox();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
  if (config.isTest) {
    await fs.rm(config.uploadsDir, { recursive: true, force: true });
    await fs.rm(config.privateUploadsDir, { recursive: true, force: true });
  }
});
