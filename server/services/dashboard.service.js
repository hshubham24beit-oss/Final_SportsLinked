const AthleteProfile = require('../models/AthleteProfile');
const CoachProfile = require('../models/CoachProfile');
const Organization = require('../models/Organization');
const Opportunity = require('../models/Opportunity');
const Application = require('../models/Application');
const SavedOpportunity = require('../models/SavedOpportunity');
const Notification = require('../models/Notification');
const VerificationRequest = require('../models/VerificationRequest');
const Report = require('../models/Report');
const User = require('../models/User');
const Event = require('../models/Event');
const EventRegistration = require('../models/EventRegistration');
const { ROLES, USER_STATUS } = require('../config/constants');
const { activeFilter, containsRegex } = require('./opportunity.service');

function countByStatus(records) {
  return records.reduce((counts, entry) => {
    counts[entry._id] = entry.count;
    return counts;
  }, {});
}

async function applicationStatusCounts(filter) {
  const rows = await Application.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  return countByStatus(rows);
}

function serializeDashboardEvent(event, registrationStatus, organized) {
  return {
    id: event._id.toString(),
    title: event.title,
    type: event.type,
    sport: event.sport,
    startAt: event.startAt,
    endAt: event.endAt,
    city: event.venue?.location?.city || '',
    status: event.status,
    capacity: event.capacity,
    registrationCount: event.registrationCount,
    organizerName: event.organizerName,
    registrationStatus: registrationStatus || null,
    organized,
  };
}

async function upcomingEventsFor(user) {
  const now = new Date();

  if (user.role === ROLES.ADMIN) {
    const events = await Event.find({ status: 'published', startAt: { $gt: now } })
      .sort({ startAt: 1, _id: 1 })
      .limit(5)
      .lean();
    return events.map((event) => serializeDashboardEvent(event, null, false));
  }

  const [registrations, organized] = await Promise.all([
    EventRegistration.find({
      user: user._id,
      status: { $in: ['registered', 'waitlisted', 'interested'] },
    })
      .populate(
        'event',
        'title type sport startAt endAt venue status capacity registrationCount organizerName',
      )
      .lean(),
    Event.find({
      organizer: user._id,
      status: { $in: ['draft', 'published'] },
      startAt: { $gt: now },
    })
      .sort({ startAt: 1, _id: 1 })
      .limit(5)
      .lean(),
  ]);

  const byEvent = new Map();
  for (const registration of registrations) {
    const event = registration.event;
    if (!event || event.status !== 'published' || new Date(event.startAt) <= now) {
      continue;
    }
    byEvent.set(String(event._id), serializeDashboardEvent(event, registration.status, false));
  }
  for (const event of organized) {
    if (!byEvent.has(String(event._id))) {
      byEvent.set(String(event._id), serializeDashboardEvent(event, null, true));
    }
  }

  return [...byEvent.values()]
    .sort((first, second) => new Date(first.startAt) - new Date(second.startAt))
    .slice(0, 5);
}

async function athleteDashboard(user) {
  const profile = await AthleteProfile.findOne({ user: user._id }).lean();
  const sports = profile?.sports || [];

  const sportConditions = sports.map((sport) => ({ sport: containsRegex(sport) }));
  const recommendedFilter = activeFilter();
  if (sportConditions.length > 0) {
    recommendedFilter.$or = sportConditions;
  }

  const [
    savedCount,
    applicationCounts,
    recentApplications,
    recommended,
    unreadNotifications,
    upcomingEvents,
  ] = await Promise.all([
    SavedOpportunity.countDocuments({ user: user._id }),
    applicationStatusCounts({ athlete: user._id }),
    Application.find({ athlete: user._id })
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .populate('opportunity', 'title type sport status deadline publisherName location'),
    Opportunity.find(recommendedFilter)
      .sort({ deadline: 1, createdAt: -1 })
      .limit(3)
      .select('title type sport deadline publisherName location positionsAvailable'),
    Notification.countDocuments({ user: user._id, readAt: null }),
    upcomingEventsFor(user),
  ]);

  return {
    role: user.role,
    profile: {
      name: user.name,
      completion: profile?.profileCompletion || 0,
      headline: profile?.headline || '',
      sports,
      avatar: profile?.avatar || null,
    },
    stats: {
      savedOpportunities: savedCount,
      applications: Object.values(applicationCounts).reduce(
        (total, count) => total + count,
        0,
      ),
      activeApplications:
        (applicationCounts.submitted || 0) +
        (applicationCounts.under_review || 0) +
        (applicationCounts.shortlisted || 0),
      upcomingEvents: upcomingEvents.length,
      unreadNotifications,
    },
    upcomingEvents,
    applicationCounts,
    recentApplications: recentApplications
      .filter((application) => application.opportunity)
      .map((application) => ({
        id: application.id,
        status: application.status,
        createdAt: application.createdAt,
        opportunity: {
          id: application.opportunity._id.toString(),
          title: application.opportunity.title,
          type: application.opportunity.type,
          sport: application.opportunity.sport,
          deadline: application.opportunity.deadline,
          publisherName: application.opportunity.publisherName,
        },
      })),
    recommendedOpportunities: recommended.map((opportunity) => ({
      id: opportunity._id.toString(),
      title: opportunity.title,
      type: opportunity.type,
      sport: opportunity.sport,
      deadline: opportunity.deadline,
      publisherName: opportunity.publisherName,
      location: opportunity.location,
    })),
  };
}

async function publisherDashboard(user) {
  let profile = null;
  let displayName = user.name;
  if (user.role === ROLES.COACH) {
    profile = await CoachProfile.findOne({ user: user._id }).lean();
    displayName = user.name;
  } else if (user.role === ROLES.RECRUITER) {
    profile = await Organization.findOne({ user: user._id }).lean();
    displayName = profile?.name || user.name;
  }

  const opportunityIds = await Opportunity.find({ publisher: user._id }).distinct('_id');
  const [
    opportunityCounts,
    applicationCounts,
    recentApplications,
    unreadNotifications,
    upcomingEvents,
  ] = await Promise.all([
    Opportunity.aggregate([
      { $match: { publisher: user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    applicationStatusCounts({ opportunity: { $in: opportunityIds } }),
    Application.find({ opportunity: { $in: opportunityIds } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(5)
      .populate('athlete', 'name email')
      .populate('opportunity', 'title type sport status deadline'),
    Notification.countDocuments({ user: user._id, readAt: null }),
    upcomingEventsFor(user),
  ]);

  const counts = countByStatus(opportunityCounts);
  const activeCount = await Opportunity.countDocuments({
    publisher: user._id,
    ...activeFilter(),
  });
  const pendingReview = await Application.countDocuments({
    opportunity: { $in: opportunityIds },
    status: { $in: ['submitted', 'under_review'] },
  });

  return {
    role: user.role,
    profile: {
      name: displayName,
      headline: profile?.headline || '',
      avatar: profile?.avatar || null,
    },
    stats: {
      activeOpportunities: activeCount,
      drafts: counts.draft || 0,
      totalOpportunities: Object.values(counts).reduce((total, count) => total + count, 0),
      totalApplications: Object.values(applicationCounts).reduce(
        (total, count) => total + count,
        0,
      ),
      pendingReview,
      upcomingEvents: upcomingEvents.length,
      unreadNotifications,
    },
    upcomingEvents,
    opportunityCounts: counts,
    applicationCounts,
    recentApplications: recentApplications
      .filter((application) => application.opportunity)
      .map((application) => ({
        id: application.id,
        status: application.status,
        createdAt: application.createdAt,
        athlete: application.athlete
          ? { id: application.athlete._id.toString(), name: application.athlete.name }
          : null,
        opportunity: {
          id: application.opportunity._id.toString(),
          title: application.opportunity.title,
          type: application.opportunity.type,
          sport: application.opportunity.sport,
        },
      })),
  };
}

async function adminDashboard() {
  const [
    userCounts,
    publishedOpportunities,
    applications,
    recentUsers,
    pendingVerifications,
    overdueVerifications,
    openReports,
    restrictedUsers,
    upcomingEvents,
  ] = await Promise.all([
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    Opportunity.countDocuments({ status: 'published', deadline: { $gt: new Date() } }),
    Application.countDocuments(),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role status createdAt'),
    VerificationRequest.countDocuments({ status: { $in: ['requested', 'under_review'] } }),
    VerificationRequest.countDocuments({
      status: { $in: ['requested', 'under_review'] },
      submittedAt: { $lte: new Date(Date.now() - 72 * 60 * 60 * 1000) },
    }),
    Report.countDocuments({ status: { $in: ['open', 'under_review'] } }),
    User.countDocuments({ status: USER_STATUS.RESTRICTED }),
    upcomingEventsFor({ role: ROLES.ADMIN }),
  ]);

  return {
    role: ROLES.ADMIN,
    stats: {
      users: Object.values(countByStatus(userCounts)).reduce(
        (total, count) => total + count,
        0,
      ),
      activeUsers: await User.countDocuments({ status: USER_STATUS.ACTIVE }),
      restrictedUsers,
      publishedOpportunities,
      applications,
      pendingVerifications,
      overdueVerifications,
      openReports,
      upcomingEvents: upcomingEvents.length,
    },
    upcomingEvents,
    userCounts: countByStatus(userCounts),
    recentUsers: recentUsers.map((entry) => entry.toJSON()),
  };
}

async function getDashboard(user) {
  if (user.role === ROLES.ATHLETE) {
    return athleteDashboard(user);
  }
  if (user.role === ROLES.ADMIN) {
    return adminDashboard();
  }
  return publisherDashboard(user);
}

module.exports = { getDashboard };
