# SportLinked

SportLinked is a professional networking and talent-discovery platform for sport. This repository contains the Phase 1 to Phase 9 foundation: a React web client, an Express API, MongoDB persistence, complete email/password authentication, role-specific public profiles, onboarding, media uploads, athlete achievements/statistics, privacy-aware athlete discovery, opportunity publishing, applications, applicant review, saved opportunities, connections and follows, a ranked post feed with comments/likes/shares, direct messaging with real-time Socket.IO delivery, configurable email notifications, verification and moderation tools, in-app notifications, local events with registrations and waitlists, public and private teams with invitations and role-based management, role-specific dashboards, and review-first AI assistance.

The application deliberately contains no sample profiles, fabricated statistics, verification records, opportunities, applications, posts, messaging data, events, teams, registrations, or team updates. It stores only data entered by real users, and discovery exposes only sections an athlete has chosen to share. Future workspace items remain labelled **Soon**.

## Tech stack

- **Client:** React 18, Vite 5, React Router 6, Tailwind CSS 3, Axios, React Icons
- **Server:** Node.js, Express 4, Socket.IO 4, Mongoose 8, Zod 3, JWT, bcrypt, Nodemailer, Multer, Cloudinary, node-cron
- **Tests:** Jest + Supertest + `mongodb-memory-server` (API), Vitest + Testing Library (client)

## Prerequisites

- Node.js 18.18 or newer
- npm 9 or newer
- MongoDB 6+ locally or a MongoDB Atlas connection string
- Network access on first start if you use the in-memory database or Ethereal email

## Setup

```powershell
npm run setup
Copy-Item server\.env.example server\.env
Copy-Item client\.env.example client\.env
```

Then edit `server/.env`:

1. Set `MONGODB_URI` to your local MongoDB or Atlas connection string.
2. Generate two different JWT secrets:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

3. Set `ADMIN_EMAIL` and a strong `ADMIN_PASSWORD` if you want to use the admin seed.
4. Leave `SMTP_*` blank for an automatically created Ethereal development inbox, or fill in Mailtrap/SMTP credentials.
5. Leave `CLOUDINARY_*` blank for local development uploads, or provide all three Cloudinary values. Production requires Cloudinary. `API_PUBLIC_URL` must match the public API origin so locally stored development images resolve correctly.
6. `DEADLINE_REMINDER_HOURS` controls how far ahead saved-opportunity reminders are sent (default 24 hours).
7. `UPLOAD_DIR` is optional and defaults to `server/uploads`.
8. AI assistance works without an external provider by default. Set `AI_PROVIDER=openai-compatible`, `AI_API_KEY`, and optionally `AI_BASE_URL`/`AI_MODEL` to use an OpenAI-compatible endpoint. `AI_TIMEOUT_MS`, `AI_RATE_LIMIT_MAX` (default 20 per user), and `AI_RATE_LIMIT_WINDOW_MS` (default 15 minutes) control request behaviour.

`client/.env` contains:

```dotenv
VITE_API_URL=http://localhost:5000/api/v1
```

Both `.env` files are gitignored. Only the `.env.example` templates are committed.

## Run locally

### With MongoDB

```powershell
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:5000
- Health: http://localhost:5000/health

These are the example ports. If one is already in use, update `PORT`, `CLIENT_URL`, `CORS_ORIGINS`, and `client/.env` together. Start Vite on the matching web port with `npm --prefix client run dev -- --port <port> --strictPort`.

### Without a local MongoDB

```powershell
npm run dev:memory
```

This starts an ephemeral real MongoDB process via `mongodb-memory-server`, the API, and the client. Data is deleted when the process stops. A valid `server/.env` is still required for JWT secrets and URLs.

In development, verification and password-reset links are printed to the API console. Ethereal messages also include a preview URL. Example:

```text
Verification link for user@example.com: http://localhost:5173/verify-email?token=...
```

To allow sign-in without checking a mailbox during local development, copy the printed verification link into the browser.

### Seed the first administrator

Public registration always blocks the `admin` role. Seed an administrator from the environment:

```powershell
npm --prefix server run seed:admin
```

Use `npm --prefix server run seed:admin -- --force` to reset an existing seeded admin's password and status. The seed must connect to the same persistent MongoDB as the API.

For `dev:memory`, copy the `mongodb://127.0.0.1:<port>/sportlinked` URI from the API log, set it as `MONGODB_URI` for the seed command, and rerun the seed whenever the in-memory process restarts:

```powershell
$env:MONGODB_URI = 'mongodb://127.0.0.1:<port>/sportlinked'
npm --prefix server run seed:admin
Remove-Item Env:\MONGODB_URI
```

For the ephemeral database, copy the `mongodb://127.0.0.1:<port>/sportlinked` address printed by `dev:memory` and run the seed with it in another terminal:

```powershell
$env:MONGODB_URI="mongodb://127.0.0.1:<port>/sportlinked"
npm --prefix server run seed:admin
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run setup` | Install root, server, and client dependencies |
| `npm run dev` | API and client with a persistent MongoDB |
| `npm run dev:memory` | API and client with an ephemeral in-memory MongoDB |
| `npm run build` | Production client build |
| `npm run lint` | Lint server and client |
| `npm run test` | Run API tests |
| `npm run test:client` | Run client tests |
| `npm run format` | Format JS, JSX, JSON, CSS, and Markdown with Prettier |

## Authentication flow

1. Register with name, email, password, and a public role (`athlete`, `coach`, or `recruiter`).
2. Open the verification link sent by email.
3. Sign in. An unverified user can access the workspace, but verification-required actions remain blocked until the email is confirmed.
4. Access tokens stay in memory. A rotating refresh JWT is stored in an httpOnly cookie named `sportlinked_refresh`.
5. Signing out revokes the refresh session. Password reset and account deletion revoke stored refresh sessions.
6. Deactivated accounts cannot sign in. Suspended accounts can authenticate but are blocked from authenticated endpoints. Restricted accounts can sign in and browse, but cannot post achievements or opportunities, apply, publish, or submit verification. All states are distinct from soft deletion.

Email verification, identity verification, qualification verification, and achievement verification are separate concepts. Confirming an email does not verify any profile claim.

## API

Base path: `/api/v1`

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/auth/register` | Public |
| `POST` | `/auth/login` | Public |
| `POST` | `/auth/logout` | Public / refresh cookie |
| `POST` | `/auth/refresh` | Refresh cookie |
| `POST` | `/auth/verify-email` | Public with token |
| `POST` | `/auth/resend-verification` | Authenticated |
| `POST` | `/auth/forgot-password` | Public |
| `POST` | `/auth/reset-password` | Public with token |
| `GET` | `/auth/me` | Authenticated |
| `POST` | `/auth/deactivate` | Authenticated + password |
| `DELETE` | `/auth/account` | Authenticated + password |
| `GET` | `/profiles/me` | Authenticated profile owner |
| `PATCH` | `/profiles/me` | Authenticated profile owner |
| `POST` | `/profiles/onboarding` | Authenticated public role |
| `GET` | `/profiles/:slug` | Public, optional viewer session |
| `POST` | `/profiles/me/avatar` | Authenticated profile owner, multipart `image` |
| `DELETE` | `/profiles/me/avatar` | Authenticated profile owner |
| `POST` | `/profiles/me/cover` | Authenticated profile owner, multipart `image` |
| `DELETE` | `/profiles/me/cover` | Authenticated profile owner |
| `POST` | `/profiles/me/gallery` | Authenticated profile owner, multipart `image` |
| `DELETE` | `/profiles/me/gallery/:itemId` | Authenticated profile owner |
| `GET` | `/achievements` | Authenticated profile owner |
| `POST` | `/achievements` | Authenticated profile owner |
| `PATCH` | `/achievements/:achievementId` | Authenticated owner |
| `DELETE` | `/achievements/:achievementId` | Authenticated owner |
| `GET` | `/profiles/me/statistics` | Athlete owner |
| `POST` | `/profiles/me/statistics` | Athlete owner |
| `PATCH` | `/profiles/me/statistics/:statisticId` | Athlete owner |
| `DELETE` | `/profiles/me/statistics/:statisticId` | Athlete owner |
| `GET` | `/discovery/athletes` | Coach, recruiter, or admin |
| `GET` | `/discovery/saved` | Coach or recruiter |
| `POST` | `/discovery/saved/:athleteId` | Coach or recruiter |
| `DELETE` | `/discovery/saved/:athleteId` | Coach or recruiter |
| `GET` | `/opportunities` | Authenticated |
| `POST` | `/opportunities` | Coach or recruiter |
| `GET` | `/opportunities/mine` | Coach or recruiter |
| `GET` | `/opportunities/saved` | Authenticated |
| `GET` | `/opportunities/:id` | Authenticated, non-draft unless owner |
| `PATCH` | `/opportunities/:id` | Opportunity owner |
| `POST` | `/opportunities/:id/publish` | Opportunity owner |
| `POST` | `/opportunities/:id/close` | Opportunity owner |
| `POST` | `/opportunities/:id/save` | Authenticated |
| `DELETE` | `/opportunities/:id/save` | Authenticated |
| `POST` | `/opportunities/:id/apply` | Athlete |
| `GET` | `/opportunities/:id/applicants` | Opportunity owner (coach or recruiter) |
| `GET` | `/applications/me` | Athlete |
| `POST` | `/applications/documents` | Athlete, multipart `document` |
| `GET` | `/applications/:id` | Applicant, opportunity owner, or admin |
| `POST` | `/applications/:id/withdraw` | Applicant |
| `PATCH` | `/applications/:id/status` | Opportunity owner |
| `POST` | `/applications/:id/shortlist` | Opportunity owner |
| `GET` | `/events` | Authenticated, published upcoming events |
| `GET` | `/events/mine` | Athlete, coach, or recruiter, organizer's events |
| `POST` | `/events` | Athlete, coach, or recruiter, unrestricted |
| `GET` | `/events/:id` | Owner or authenticated viewer allowed by event status/blocks |
| `PATCH` | `/events/:id` | Event organizer, draft or published |
| `DELETE` | `/events/:id` | Event organizer, no confirmed or waitlisted registrations |
| `POST` | `/events/:id/publish` | Event organizer |
| `POST` | `/events/:id/cancel` | Event organizer, optional reason |
| `POST` | `/events/:id/register` | Athlete, coach, or recruiter, unrestricted |
| `POST` | `/events/:id/interest` | Athlete, coach, or recruiter, unrestricted |
| `DELETE` | `/events/:id/registration` | Event attendee, unrestricted |
| `GET` | `/events/:id/registrants` | Event organizer, page/status filters |
| `GET` | `/teams/discover` | Authenticated, public teams only |
| `GET` | `/teams/mine` | Athlete, coach, or recruiter |
| `POST` | `/teams` | Athlete, coach, or recruiter, unrestricted |
| `GET` | `/teams/:id` | Team owner, member, invitee, or public-team viewer |
| `PATCH` | `/teams/:id` | Team owner |
| `DELETE` | `/teams/:id` | Team owner |
| `POST` | `/teams/:id/members` | Team owner or manager, invite by email/user ID |
| `POST` | `/teams/:id/respond` | Invited member, accept or decline |
| `GET` | `/teams/:id/members` | Team viewer, filtered by privacy and role |
| `DELETE` | `/teams/:id/members/:userId` | Team owner or manager |
| `PATCH` | `/teams/:id/members/:userId` | Team owner, role updates |
| `DELETE` | `/teams/:id/membership` | Active non-owner member |
| `GET` | `/teams/:id/updates` | Team owner or active member |
| `POST` | `/teams/:id/updates` | Team owner, manager, or coach |
| `GET` | `/notifications` | Authenticated |
| `GET` | `/notifications/unread-count` | Authenticated |
| `GET` | `/notifications/preferences` | Authenticated |
| `PATCH` | `/notifications/preferences` | Authenticated |
| `PATCH` | `/notifications/:id/read` | Notification owner |
| `POST` | `/notifications/read-all` | Notification owner |
| `GET` | `/messages` | Authenticated public role |
| `POST` | `/messages` | Authenticated public role, accepted connection or applicant relationship |
| `GET` | `/messages/:id` | Conversation participant |
| `GET` | `/messages/:id/messages` | Conversation participant, cursor `before` / `limit` |
| `POST` | `/messages/:id/messages` | Conversation participant + unrestricted account |
| `POST` | `/messages/:id/read` | Conversation participant |
| `POST` | `/messages/:id/report` | Conversation participant |
| `GET` | `/connections` | Authenticated public role |
| `GET` | `/connections/requests` | Authenticated public role, `direction=incoming\|outgoing` |
| `GET` | `/connections/suggestions` | Authenticated public role |
| `GET` | `/connections/mutual/:userId` | Authenticated public role |
| `POST` | `/connections/requests` | Authenticated public role |
| `POST` | `/connections/:id/accept` | Request recipient |
| `POST` | `/connections/:id/reject` | Request recipient |
| `POST` | `/connections/:id/cancel` | Request sender |
| `DELETE` | `/connections/:id` | Either connected member |
| `GET` | `/follows/followers/:userId` | Authenticated |
| `GET` | `/follows/following/:userId` | Authenticated |
| `POST` | `/follows/:userId` | Authenticated public role |
| `DELETE` | `/follows/:userId` | Authenticated public role |
| `GET` | `/feed` | Authenticated, cursor pagination |
| `POST` | `/posts/media` | Authenticated public role, multipart `image` |
| `POST` | `/posts` | Authenticated public role |
| `GET` | `/posts/:id` | Viewer allowed by post visibility |
| `PATCH` | `/posts/:id` | Post owner |
| `DELETE` | `/posts/:id` | Post owner |
| `POST` | `/posts/:id/like` | Authenticated public role |
| `DELETE` | `/posts/:id/like` | Authenticated public role |
| `GET` | `/posts/:id/comments` | Viewer allowed by post visibility |
| `POST` | `/posts/:id/comments` | Authenticated public role |
| `DELETE` | `/posts/:id/comments/:commentId` | Comment or post owner |
| `POST` | `/posts/:id/share` | Authenticated public role, public posts only |
| `POST` | `/verifications/evidence` | Athlete, coach, or recruiter, multipart `evidence` |
| `POST` | `/verifications` | Athlete, coach, or recruiter (unrestricted) |
| `GET` | `/verifications` | Requester's requests, achievements, and summary |
| `GET` | `/verifications/:id` | Request owner |
| `POST` | `/verifications/:id/resubmit` | Request owner (unrestricted) |
| `GET` | `/verifications/:id/evidence/:evidenceId/url` | Request owner |
| `GET` | `/verifications/evidence/:token` | Public signed URL |
| `POST` | `/reports` | Authenticated public role |
| `GET` | `/reports/mine` | Reporter |
| `POST` | `/blocks` | Authenticated public role |
| `GET` | `/blocks` | Authenticated public role |
| `DELETE` | `/blocks/:userId` | Blocker |
| `GET` | `/admin/verifications` | Admin |
| `GET` | `/admin/verifications/:id` | Admin |
| `POST` | `/admin/verifications/:id/claim` | Admin |
| `POST` | `/admin/verifications/:id/decision` | Admin |
| `GET` | `/admin/verifications/:id/evidence/:evidenceId/url` | Admin |
| `GET` | `/admin/reports` | Admin |
| `PATCH` | `/admin/reports/:id` | Admin |
| `GET` | `/admin/users` | Admin |
| `GET` | `/admin/users/:id` | Admin |
| `PATCH` | `/admin/users/:id/status` | Admin |
| `GET` | `/admin/overview` | Admin |
| `GET` | `/admin/activity` | Admin |
| `POST` | `/ai/profile-suggestion` | Athlete, coach, or recruiter, rate limited |
| `POST` | `/ai/content-draft` | Athlete, coach, or recruiter, rate limited |
| `POST` | `/ai/opportunity-matches` | Athlete, coach, or recruiter, rate limited |
| `GET` | `/ai/profile-recommendations` | Athlete, coach, or recruiter, rate limited |
| `GET` | `/ai/performance-insights` | Athlete only, rate limited |
| `GET` | `/dashboard` | Authenticated |
| `GET` | `/health` and `/api/v1/health` | Public |

Socket.IO connects to the API origin at `/socket.io` and expects `{ auth: { token: <accessToken> } }`. REST pagination remains page-based except for the feed and message history, which use cursors.

Successful responses use:

```json
{
  "success": true,
  "data": {},
  "message": "Human-readable message."
}
```

Errors use the same envelope with `success: false`, `data: null`, a stable `code`, and optional field-level `errors`.

## Profiles and media

- Public roles are mapped to profiles automatically: athletes use `AthleteProfile`, coaches use `CoachProfile`, and recruiters use `Organization`. Administrators do not have public profiles.
- Onboarding requires a headline, bio, city, at least one sport, and the role-specific fields. Avatar and cover images are optional.
- Athlete profiles can also record an age group, competition level, and up to 20 skills. These optional fields are shown on the profile and used by discovery filters.
- Profile completion is weighted per role. Onboarding does not require 100% completion; the dashboard and editor show the remaining recommended details.
- Visibility is controlled per section with `public`, `connections`, or `private`. `connections` currently means any authenticated viewer. Owners always see their complete profile.
- Achievement evidence links are owner-only. Public responses expose a boolean `verified` only when `verificationStatus` is `verified`; pending, rejected, and self-reported claims are not presented as verified.
- Profile images and gallery photos accept JPEG, PNG, or WebP up to 5 MB. Galleries are limited to 12 images.
- Profile owners can remove their avatar, cover, or individual gallery photos. Removed images are deleted from media storage; the default avatar or cover design is restored.
- Cloudinary is used when all credentials are configured. Development falls back to local uploads served from `/uploads`; production rejects uploads when Cloudinary is incomplete.
- Public profiles show identity and qualification verification separately. An achievement badge appears only on that specific achievement; there is no blanket profile-wide verification badge.
- Account deletion removes the profile, achievements, statistics, saved candidates, blocks, connections, follows, owned posts/comments/likes/shares, conversations and messages, owned opportunities/applications, saved opportunities, owned events/registrations, owned teams/memberships, verification requests/evidence/audit logs, reports, notifications, and owned media/documents.

## Athlete discovery

Coaches, recruiters, and administrators can search athlete profiles at `/discovery`. Athletes cannot access discovery or save candidates. The UI supports debounced keyword search, filter chips, a mobile filter modal, pagination, quick preview, and a saved-candidate shortlist for coaches and recruiters.

`GET /discovery/athletes` accepts:

| Parameter | Behaviour |
| --- | --- |
| `q` | Full-text match on sports, positions, current team, and skills, plus athlete name |
| `sport`, `position`, `skill`, `team` | Case-insensitive partial matches |
| `location` | Partial match on city, region, or country |
| `lat`, `lng`, `radiusKm` | Coordinate search; radius defaults to 50 km and is capped at 500 km |
| `nearMe`, `radiusKm` | Uses the signed-in coach or organisation profile coordinates |
| `ageCategory` | `under_14`, `under_16`, `under_18`, `under_21`, `senior`, or `masters` |
| `level` | Athlete experience level |
| `competitionLevel` | `recreational`, `school`, `college`, `state`, `national`, or `international` |
| `availableForTrials` | Only athletes open to trials |
| `statMetric`, `statMin`, `statMax` | Match a visible statistic by metric and optional numeric range |
| `achievements`, `verification` | `any` for any achievement, `verified` for at least one verified achievement |
| `sort` | `relevance`, `completion`, `experience`, or `recent` |
| `page`, `limit` | Page defaults to 1; limit defaults to 12 and is capped at 48 |

Only active, onboarded athletes whose sport section is not private are discoverable. The display name is always required for a recognizable result, but headline, bio, sport details, career, location, statistics, achievements, and contact-related fields are omitted when the corresponding section is private. Filters that depend on a private section do not match that section. Suspended users and users on either side of a block are excluded. Achievement evidence remains owner-only; discovery exposes a count of verified achievements only. Sorting is deterministic and explainable rather than an opaque score: keyword relevance uses MongoDB text score, then profile completion and recency.

Paginated responses include a top-level `meta` object:

```json
{
  "success": true,
  "data": { "athletes": [] },
  "message": "Athletes retrieved.",
  "meta": { "page": 1, "limit": 12, "total": 0, "totalPages": 0 }
}
```

## Connections, follows, posts, and feed

Connections and follows are deliberately separate. A connection is a mutual, accepted relationship created through a request and is used for connection-only posts. A follow is a one-way subscription to another member's public activity. Members can send one pending request per person; duplicate, self, reversed, blocked, and already-accepted requests are rejected. A single unordered `pairKey` prevents duplicate connection records. Requests move through `pending`, `accepted`, `rejected`, or `cancelled`, with notifications for requests and responses.

- The network workspace at `/network` lists connections, incoming and outgoing pending requests, suggestions, followers, and following.
- Suggestions prioritise shared sports, the same city/country, and the same platform role. Existing connections, pending requests, blocked users, and the current user are excluded.
- Blocking removes both directions of follows and any connection record between the two accounts. Blocked pairs cannot view each other's public profiles, posts, connections, or suggestions, and cannot interact through posts.
- Post visibility is `public` or `connections`. Connection-only posts are visible only to the author and accepted connections. Public profiles show up to five recent posts the viewer is allowed to see.
- The feed is cursor-paginated, newest-first within a priority score: the member's own posts, accepted connections, followed members, then shared-sport posts. Each cursor is a signed-style base64url payload containing score, timestamp, and post ID; the feed does not use page numbers.
- Posts support text, achievement, opportunity, and shared-post feed entries. Text is capped at 3,000 characters, with up to four JPEG/PNG/WebP images at 5 MB each.
- Likes are idempotent. Comments are capped at 1,000 characters. A member can share a public post once per root post; shares cannot target connection-only posts. Post, comment, like, and share counts are stored on the post and updated atomically.
- The client at `/feed` provides composition, optional media uploads, visibility controls, infinite scrolling with a manual load-more fallback, inline comments, likes, shares, deletion, reporting, and blocking. `GET /feed?cursor=...&limit=10` returns `{ posts }` with top-level `meta` containing `nextCursor`, `hasMore`, and `limit`; the limit defaults to 10 and is capped at 25.
- Post reports use the existing moderation flow with `targetType: "post"` and the post ID as `targetId`. Administrators see the resolved target author in the report queue.
- Account deletion removes owned posts, comments, likes, shares, and uploaded post media, as well as connections and follows involving the account.

## Messaging, realtime events, and email preferences

Direct messaging is available to athletes, coaches, and recruiters at `/messages`. A member can start a conversation with an accepted connection, or a coach/recruiter and an athlete who has applied to one of that coach or recruiter's opportunities. Administrators cannot use direct messages. Existing threads remain readable only by their two participants; every read, send, typing, report, and receipt action checks participation and the current block relationship.

- Conversations store a unique unordered participant pair, last-message preview, and per-member unread count. Message history uses a `before` message ID cursor so older pages can be loaded without re-fetching the whole thread.
- Sending a message updates both participants' conversation views, creates a `message_received` in-app notification, emits a real-time event, and optionally sends an email. Opening a thread marks the other member's messages as read and emits a read receipt.
- Socket.IO authenticates with the same JWT access token as the REST API at the API origin. Each authenticated socket joins a private user room. `message:new`, `message:read`, `message:typing`, and `notification:new` events update the open client without polling.
- Conversation reports use the moderation queue with `targetType: "message"` and the conversation ID as `targetId`. A blocked participant receives a not-found response on every conversation action.
- Email notifications are controlled per category in Account settings: messages, connections, applications, verifications, social activity, events, teams, and saved-opportunity deadlines. In-app notifications remain available regardless of email preference.
- An hourly background job finds saved opportunities closing within `DEADLINE_REMINDER_HOURS` (default 24), creates one `opportunity_deadline` notification per saved record, and marks the reminder as sent to prevent duplicates.

## Events and teams

Events are available at `/events`, with organizer controls at `/events/mine`. Athletes, coaches, and recruiters can create events; administrators can browse published events but cannot organize or register. Events support competition, trial, training, camp, showcase, community, and other types, with schedule, registration deadline, venue, location, capacity, and an optional waitlist.

- New events start as drafts and are visible only to their organizer until published. Published events with a future start time appear in browsing and are searchable by keyword, sport, type, and location.
- Registration is unique per event and member. A full event returns `EVENT_FULL` when waitlisting is disabled; with waitlisting enabled, new attendees join a first-in-first-out waitlist. Duplicate active registrations, organizer self-registration, and registrations after the deadline are rejected.
- Cancelling a confirmed registration before an upcoming published event starts promotes the oldest waitlisted attendee and notifies them. Cancelling an event notifies all confirmed and waitlisted attendees. In-app and email notifications use the `events` email preference.
- Organizers can view registrant counts and paginated registrant details. An event can be deleted only when it has no confirmed or waitlisted registrations; otherwise it must be cancelled.
- Account deletion releases event places, promotes waitlisted attendees where the event is still upcoming, and removes owned events and registrations.

Teams and groups are available at `/teams` and `/teams/mine`. Athletes, coaches, and recruiters can create public or private teams with a sport, type, description, and location. Public teams appear in discovery; private teams are invite-only and hidden from discovery and non-members.

- The creator becomes the owner. Team roles are `owner`, `manager`, `coach`, and `member`; statuses are `invited`, `active`, `declined`, and `removed`.
- Owners and managers can invite members by email or user ID. Owners can change non-owner roles, and owners or managers can remove members. Owners cannot be removed and must delete or transfer the team instead.
- Owners, managers, and coaches can post team updates. Active members receive an in-app notification, controlled by the `teams` email preference. The 50 most recent updates are retained on the team.
- Private member lists are limited to the team. Decline and removal retain a membership record so the person can be invited again later.
- Account deletion removes owned teams and memberships, decrements member counts on other teams, and removes the member's authored updates.

## AI assistance

AI assistance is available at `/ai` for athletes, coaches, and recruiters, with entry points from profile editing, the post composer, and achievement management. The service is provider-agnostic: it uses an optional OpenAI-compatible provider when configured and otherwise returns deterministic rule-based or built-in fallback drafts.

- Profile suggestions rewrite only the supplied profile details. Post and achievement drafts use only the supplied topic, details, sport, tone, and achievement facts. External prompts exclude profile verification evidence, document links, and unknown request fields.
- Opportunity matches are explainable and rule-based. They return the criteria actually used, a score, and human-readable reasons; eligibility failures are excluded rather than presented as matches.
- Profile recommendations cover coaches, public teams, academies/organisations, and athletes. They use visible profile sections, exclude blocked accounts, and do not include private sports details.
- Performance insights are athlete-only and descriptive. They summarise stored statistics and personal bests, show the underlying records, and never assess ability or predict performance.
- Every result is labelled as an unverified suggestion. No AI endpoint saves, publishes, applies, or changes verification state. The client requires an explicit accept action before calling the existing profile, post, or achievement APIs.
- Per-user AI requests are limited in memory by default to 20 requests per 15 minutes. Exceeded limits return `429` with code `AI_RATE_LIMITED` and a `Retry-After` header. A distributed deployment should replace the in-memory limiter with shared storage.

## Opportunities and applications

Coaches and recruiters can create draft opportunities in eight categories: team recruitment, trials, scholarships, tournaments, camps, academy admissions, coaching positions, and internships. A draft becomes visible only after publishing. Publishing requires a future deadline. Closed and expired opportunities remain visible to their owner but are removed from public browsing and saved lists. A scheduled job runs every five minutes to mark published opportunities as `expired` once their deadline passes.

Opportunity fields include sport, positions, location, event dates, available places, required document labels, contact instructions, and optional eligibility rules. Eligibility can restrict athlete level, age category, competition level, minimum/maximum experience, and verified achievements. Athletes must have the relevant sport on their own profile. Applying requires a submitted cover note (optional), document metadata for every required label, and an athlete profile. One athlete can apply once per opportunity; the unique database index also prevents duplicate submissions after withdrawal.

Applications move through:

- `submitted`
- `under_review`
- `shortlisted`
- `accepted` or `rejected`
- `withdrawn`

All changes append to the application status history. Publishers can move applications according to the allowed transitions; athletes can withdraw until a decision is made. Each application stores a server-generated snapshot of the athlete profile and verified achievements at submission time, so later profile edits do not rewrite the record under review.

Application documents accept PDF, DOC, or DOCX up to 10 MB. Files are stored in Cloudinary when configured, or under local development uploads. Uploads are checked by MIME type and file signature. Only the uploaded document metadata is attached to an application.

In-app notifications are created when an application is submitted or withdrawn, when a publisher changes its status, when connection requests are sent or answered, when someone likes, comments on, or shares a member's post, when a direct message is received, when a saved opportunity is close to its deadline, when an event is cancelled or a waitlist place opens, and when a team invitation, join, or update occurs. The notification bell updates over Socket.IO, and the notification centre supports live refresh and marking one or all as read. Dashboards use live API data: athletes see applications, saved opportunities, profile completion, sport-matched recommendations, and upcoming events; coaches and recruiters see opportunity pipeline counts, recent applicants, and upcoming organized or registered events; administrators see user, moderation, verification, platform activity, and upcoming published event counts.

## Verification and moderation

Verification is claim-specific. Athletes, coaches, and recruiters can request identity, qualification, or achievement verification with a statement and private evidence. Identity and qualification verification are exposed as separate profile records; achievement verification only badges the reviewed achievement. A profile is never marked as globally verified.

- Requests move through `requested`, `under_review`, `verified`, `rejected`, or `expired`. Reviewers claim a request and approve or reject it with a reason.
- Evidence accepts up to five files per request, each up to 10 MB: JPEG, PNG, WebP, PDF, DOC, or DOCX. MIME types and file signatures are validated.
- Evidence is private. Cloudinary uses authenticated delivery and short-lived signed URLs; local development stores files outside the public upload directory and serves them through HMAC-signed, expiring URLs. Evidence access is audited.
- Default verification lifetimes are 730 days for identity, 1,095 days for qualifications, and no expiry for achievements. An hourly job marks elapsed verifications as expired and notifies the owner.
- Users can report a profile, post, opportunity, or conversation and block another user. Blocks are bidirectional for discovery, profiles, posts, connections, follows, opportunity details, and applications. Reporting does not automatically hide content.
- Administrators can review the verification queue, inspect private evidence, manage reports, search users, and set accounts to `active`, `restricted`, or `suspended`. Restricted accounts retain read access but cannot publish or submit. Suspended accounts are blocked from authenticated endpoints.

## Security controls

- bcrypt password hashing with a higher cost outside tests
- JWT access tokens and hashed, rotating refresh tokens
- httpOnly, SameSite refresh cookie scoped to `/api/v1/auth`
- SHA-256 hashes for email-verification and password-reset tokens
- Single-use verification/reset tokens with expiry
- Zod request validation and centralized error handling
- Helmet, restrictive CORS allow-list, rate limiting, body-size limits, and MongoDB operator sanitisation
- Role authorisation middleware plus active and unrestricted-account guards
- Per-section profile visibility and owner-only achievement evidence
- Private verification evidence with authenticated Cloudinary delivery or HMAC-signed local URLs, access auditing, and admin-only evidence access
- MIME-signature validation, 5 MB image limits, 10 MB document/evidence limits, gallery/document/evidence limits, and upload rate limiting
- Bidirectional blocks and abuse reports with admin moderation states
- Cloudinary-backed production media or development-only local storage
- Generic forgot-password responses to avoid account enumeration
- No public admin registration
- Secrets, local environment files, logs, and uploads excluded from source control

## Project layout

```text
.
├── client/
│   ├── src/
│   │   ├── api/          Axios API clients for auth, profiles, discovery, opportunities, applications, notifications, verification, moderation, AI, and dashboards
│   │   ├── components/   UI primitives, cards, auth, dashboard, events, teams, profile editors, and AI entry points
│   │   ├── context/      Authentication, Socket.IO, notifications, and toast providers
│   │   ├── hooks/        Auth, toast, and document-title hooks
│   │   ├── layouts/      Auth and dashboard shells
│   │   ├── pages/        Public, auth, onboarding, profile, workspace, and status pages
│   │   ├── routes/       Route guards and route table
│   │   ├── test/         Test setup
│   │   └── utils/        Role/profile/opportunity metadata, validation, API errors
│   └── ...
├── server/
│   ├── config/           Environment, database, constants
│   ├── controllers/      Auth, profile, discovery, opportunity, application, event, team, notification, dashboard, achievement, verification, report, block, and admin handlers
│   ├── middleware/       Auth, errors, validation, uploads, rate limits
│   ├── models/           User, profiles, achievements, opportunities, applications, events, registrations, teams, memberships, saved records, notifications, verifications, evidence, audit logs, reports, and blocks
│   ├── routes/           API and health routes
│   ├── scripts/          Admin seed and in-memory development startup
│   ├── services/         Auth, profiles, media, achievements, discovery, opportunities, applications, events, teams, notifications, verification, evidence, reports, blocks, admin, dashboards, email, and provider-agnostic AI logic
│   ├── jobs/             Scheduled opportunity-expiry, verification-expiry, and saved-deadline reminder jobs
│   ├── templates/        HTML email templates
│   ├── tests/            Jest + Supertest suite
│   ├── utils/            Tokens, cookies, responses, completion, logging
│   └── validators/       Zod schemas
└── package.json          Workspace scripts
```

## Phase 1 to Phase 9 scope

Complete:

- Project foundation and shared design system
- Registration, email verification, login, logout, session refresh
- Forgot/reset password
- Role-aware dashboard shell for athlete, coach, recruiter, and admin
- Account settings, resend verification, deactivate, delete account
- Admin seed and public-admin-registration blocking
- Role-specific onboarding and public profiles at `/p/:slug`
- Profile editor with basic, sport, experience, contact, and visibility sections
- Avatar, cover, and gallery uploads
- Athlete statistics and achievements with owner-only evidence
- Privacy-aware athlete discovery with sport, location, performance, achievement, and profile filters
- Explainable result sorting, pagination, quick preview, and saved candidates for coaches and recruiters
- Opportunity drafts, publishing, closing, expiry, browsing, filters, details, and saved opportunities
- Eligibility checks, required-document uploads, applications, duplicates prevention, withdrawal, and status history
- Applicant review, shortlisting, status transitions, and status counts
- In-app notifications for submissions, withdrawals, status changes, social activity, messages, and saved-opportunity deadlines
- Real-time notification updates over authenticated Socket.IO
- Connections, follows, ranked post feed, comments, likes, shares, post reporting, and account-deletion cascades
- Direct conversations with accepted connections and applicant relationships, unread counts, read receipts, typing indicators, message history, reporting, and live delivery
- Event drafts, publishing, browsing, capacity and waitlists, registration deadlines, interest, attendee lists, cancellation, and notifications
- Public/private teams, invitations, accept/decline, role-based management, member removal and leaving, private member lists, and team updates
- Upcoming-event summaries on athlete, coach, recruiter, and admin dashboards
- Per-category email notification preferences, including events and teams, and saved-opportunity deadline reminders
- Live athlete, coach, recruiter, and admin dashboards
- Profile completion, public links, and dashboard next steps
- Identity, qualification, and achievement verification requests with private evidence, admin review, expiry, and claim-specific badges
- Reports, bidirectional blocks, and restricted/suspended account enforcement
- Admin verification queue, user management, report review, activity feed, and moderation dashboard
- Verification decision and expiry notifications
- Optional OpenAI-compatible AI provider with timeout handling and deterministic fallback drafts
- Review/edit/accept profile and content suggestions with no automatic writes
- Explainable opportunity matching, profile/team recommendations, and athlete-only descriptive performance insights
- Per-user AI rate limiting and explicit private-evidence exclusion from external prompts
- Responsive layouts, form states, toasts, alerts, loading and empty states
- API and client automated tests

Not included yet:

- Notes or structured outreach pipelines
- Recurring events, ticketing/payments, and calendar feeds
- Private-team join requests, team group chat, and team file sharing
- Browser push notifications, email digests, and production analytics
- Persistent demo database when using `dev:memory`
- Deployment infrastructure, production SMTP verification, backups, or monitoring

## Verification

```powershell
npm run lint
npm run test:server
npm run test:client
npm run build
```
