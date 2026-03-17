# BuildGym — Announcements Module API Reference

**Base path:** `/api/announcements`
**Auth:** All endpoints require `Authorization: Bearer <accessToken>` (JWT)
**Background queue:** BullMQ + Redis — broadcasts are async, HTTP returns `202` immediately.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Database Schema](#2-database-schema)
3. [Role-Based Visibility](#3-role-based-visibility)
4. [Endpoints](#4-endpoints)
   - 4.1 [Create Announcement](#41-post-apiannouncements)
   - 4.2 [List Announcements](#42-get-apiannouncements)
   - 4.3 [Get Single Announcement](#43-get-apiannouncementsid)
   - 4.4 [Update Announcement](#44-patch-apiannouncementsid)
   - 4.5 [Delete Announcement](#45-delete-apiannouncementsid)
   - 4.6 [Mark as Read](#46-post-apiannouncementsidread)
   - 4.7 [Unread Badge Count](#47-get-apiannouncementsunread-count)
5. [Broadcast Flow (FCM + BullMQ)](#5-broadcast-flow-fcm--bullmq)
6. [Deep Link Convention](#6-deep-link-convention)
7. [Cursor Pagination](#7-cursor-pagination)
8. [Permissions Matrix](#8-permissions-matrix)
9. [Field Reference](#9-field-reference)
10. [Error Responses](#10-error-responses)
11. [Environment Variables](#11-environment-variables)

---

## 1. Overview

The Announcements module lets Admins and Super Admins push structured messages to one or more audience segments (members, trainers, café staff, or everyone). Each announcement:

- Is stored in the `announcements` table with an audience, type, urgency, and optional expiry.
- Triggers an async FCM broadcast via a **BullMQ job** — the POST endpoint returns `202 Accepted` immediately.
- Supports **read receipts** (`announcement_reads`) for per-user unread badge counts.
- Uses **cursor-based pagination** (`publishedAt DESC, id DESC`) for stable, infinite-scroll lists.
- Is soft-deleted (`is_deleted = true`) — non-admin roles never see deleted or expired announcements.

---

## 2. Database Schema

### `announcements`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, auto-generated |
| `title` | varchar(80) | Required |
| `message` | varchar(500) | Required |
| `type` | enum | `general`, `event`, `maintenance`, `promotion`, `health` |
| `audience` | enum | `all`, `members`, `trainers`, `cafe` |
| `urgent` | boolean | Default `false`. High-priority FCM + jumps queue |
| `pinned` | boolean | Default `false`. Sorted to top of list |
| `deep_link` | text | Auto-set to `buildfitness://announcements/<id>` if omitted |
| `created_by` | UUID | FK → `user_profiles.id` (the admin who created it) |
| `is_deleted` | boolean | Default `false`. Soft-delete flag |
| `published_at` | timestamptz | Default `NOW()` |
| `expires_at` | timestamptz | `null` = never expires. Hides from non-admin roles after this time |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

**Indexes:** `(audience, is_deleted)`, `(pinned, published_at)`, `(created_by)`, `(published_at)`

---

### `announcement_reads`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `announcement_id` | UUID | FK → `announcements.id` (cascade delete) |
| `user_id` | UUID | FK → `user_profiles.id` (cascade delete) |
| `read_at` | timestamptz | Default `NOW()` |

**Unique constraint:** `(announcement_id, user_id)` — one read per user per announcement.
**Indexes:** `(announcement_id, user_id)` unique, `(user_id)`

---

## 3. Role-Based Visibility

| Role | Audiences visible | Sees expired? | Sees deleted? | History window |
|------|-------------------|:-------------:|:-------------:|:--------------:|
| `member` | `all`, `members` | No | No | 30 days (client-side) |
| `trainer` | `all`, `trainers` | No | No | 30 days (client-side) |
| `cafe_manager` | `all`, `cafe` | No | No | 30 days (client-side) |
| `admin` | All audiences | Yes | Optional (`?include_deleted=true`) | Full |
| `super_admin` | All audiences | Yes | Optional (`?include_deleted=true`) | Full |

**List ordering:** `pinned DESC → urgent DESC → published_at DESC → id DESC`

Expired announcements are **always kept in DB** — only hidden from non-admin roles by the `expires_at > NOW()` filter.

---

## 4. Endpoints

---

### `4.1` `POST /api/announcements`

Create an announcement and enqueue an async FCM broadcast.

**Auth:** `admin`, `super_admin`

**Request Body**
```json
{
  "title": "Gym closes early on Sunday",
  "message": "The gym will close at 4 PM this Sunday due to a maintenance event.",
  "type": "maintenance",
  "audience": "all",
  "urgent": false,
  "pinned": true,
  "deep_link": "buildfitness://announcements/custom",
  "expires_at": "2026-03-20T16:00:00.000Z"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `title` | string | Yes | Max 80 characters |
| `message` | string | Yes | Max 500 characters |
| `type` | string | Yes | `general`, `event`, `maintenance`, `promotion`, `health` |
| `audience` | string | Yes | `all`, `members`, `trainers`, `cafe` |
| `urgent` | boolean | No | Default `false`. Urgent jobs jump queue + use high FCM priority |
| `pinned` | boolean | No | Default `false`. Sorted to top of list |
| `deep_link` | string | No | Defaults to `buildfitness://announcements/<id>` |
| `expires_at` | ISO 8601 datetime | No | After this time, hidden from non-admin roles |

**Logic**
1. Validates all fields.
2. Pre-generates UUID so `deep_link` can reference the announcement ID before insert.
3. Inserts into `announcements`.
4. Enqueues BullMQ job — urgent announcements use `priority: 1` (higher), others `priority: 5`.
5. Returns `202 Accepted` — FCM broadcast is handled in background.

**Response `202`**
```json
{
  "success": true,
  "message": "Announcement created. FCM broadcast enqueued.",
  "data": {
    "id": "uuid",
    "title": "Gym closes early on Sunday",
    "message": "The gym will close at 4 PM this Sunday...",
    "type": "maintenance",
    "audience": "all",
    "urgent": false,
    "pinned": true,
    "deepLink": "buildfitness://announcements/uuid",
    "createdBy": "admin-uuid",
    "isDeleted": false,
    "publishedAt": "2026-03-17T10:00:00.000Z",
    "expiresAt": "2026-03-20T16:00:00.000Z",
    "createdAt": "2026-03-17T10:00:00.000Z",
    "updatedAt": "2026-03-17T10:00:00.000Z"
  }
}
```

**Error Codes**
| Status | Reason |
|--------|--------|
| `400` | Missing required field / exceeds length / invalid enum |
| `401` | Invalid/expired token |
| `403` | Caller is not admin/super_admin |
| `500` | Internal server error |

---

### `4.2` `GET /api/announcements`

Paginated, role-filtered announcement list. Each item includes `is_read` for UI indicators.

**Auth:** Any authenticated user

**Query Parameters**

| Param | Type | Notes |
|-------|------|-------|
| `cursor` | string | Base64url-encoded cursor from previous response's `nextCursor` |
| `limit` | integer | Default `20`, max `100` |
| `type` | string | Filter by type |
| `urgent` | boolean | `true` to show only urgent |
| `audience` | string | Filter by audience (admin only) |
| `include_past` | boolean | `true` to include expired (admin only) |
| `include_deleted` | boolean | `true` to include soft-deleted (admin only) |

**Logic**
1. Builds role-based visibility conditions:
   - Non-admin: filters by allowed audiences, excludes deleted and expired.
   - Admin: no audience filter by default; respects `include_deleted` flag.
2. Applies optional type/urgent/audience filters.
3. Applies cursor if provided.
4. Fetches `limit + 1` rows to detect next page.
5. Annotates each row with `is_read` via a single batch read-receipt lookup.
6. Returns encoded `nextCursor` if more pages exist.

**Response `200`**
```json
{
  "success": true,
  "count": 20,
  "nextCursor": "eyJwdWJsaXNoZWRBdCI6IjIwMjYtMDMtMTdUMTA6MDA6MDAuMDAwWiIsImlkIjoiYWJjZCJ9",
  "data": [
    {
      "id": "uuid",
      "title": "Gym closes early on Sunday",
      "message": "...",
      "type": "maintenance",
      "audience": "all",
      "urgent": false,
      "pinned": true,
      "deepLink": "buildfitness://announcements/uuid",
      "isDeleted": false,
      "publishedAt": "2026-03-17T10:00:00.000Z",
      "expiresAt": "2026-03-20T16:00:00.000Z",
      "is_read": false
    }
  ]
}
```

> `nextCursor` is `null` when there are no more pages.

---

### `4.3` `GET /api/announcements/:id`

Fetch a single announcement. Enforces role-based visibility.

**Auth:** Any authenticated user

**Path Params**
| Param | Type | Notes |
|-------|------|-------|
| `id` | UUID | Announcement ID |

**Logic**
- Non-admin: announcement must be in allowed audience, not deleted, not expired.
- Admin: no restrictions.
- Annotates with `is_read`.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "...",
    "message": "...",
    "type": "event",
    "audience": "members",
    "urgent": false,
    "pinned": false,
    "deepLink": "buildfitness://announcements/uuid",
    "isDeleted": false,
    "publishedAt": "2026-03-17T10:00:00.000Z",
    "expiresAt": null,
    "is_read": true
  }
}
```

**Error Codes**
| Status | Reason |
|--------|--------|
| `401` | Invalid/expired token |
| `404` | Announcement not found or not visible to this role |

---

### `4.4` `PATCH /api/announcements/:id`

Update an announcement's editable fields. Only works on non-deleted announcements.

Does **not** re-broadcast — create a new announcement if a resend is needed.

**Auth:** `admin`, `super_admin`

**Request Body** — any subset of:
```json
{
  "title": "Updated title",
  "message": "Updated message",
  "type": "event",
  "audience": "members",
  "urgent": true,
  "pinned": false,
  "deep_link": "buildfitness://activity/456",
  "expires_at": "2026-03-25T00:00:00.000Z"
}
```

> Set `expires_at` to `null` to remove expiry.

**Logic**
- Validates each provided field.
- Strips immutable fields (`id`, `createdBy`, `createdAt`, `publishedAt`, `isDeleted`).
- Returns `404` if announcement is already soft-deleted.

**Response `200`**
```json
{ "success": true, "data": { /* updated announcements object */ } }
```

**Error Codes:** `400` (validation), `401`, `403`, `404` (not found/deleted), `500`

---

### `4.5` `DELETE /api/announcements/:id`

Soft-delete an announcement (`is_deleted = true`). Deleted announcements are hidden from all non-admin roles.

**Auth:** `admin`, `super_admin`

**Response `200`**
```json
{ "success": true, "message": "Announcement deleted" }
```

**Error Codes:** `401`, `403`, `404` (already deleted or not found), `500`

---

### `4.6` `POST /api/announcements/:id/read`

Mark an announcement as read for the authenticated user. Idempotent — calling multiple times is safe (upsert with `ON CONFLICT DO NOTHING`).

**Auth:** Any authenticated user

**No request body required.**

**Response `200`**
```json
{ "success": true, "message": "Marked as read" }
```

**Error Codes:** `401`, `404` (announcement not found), `500`

---

### `4.7` `GET /api/announcements/unread-count`

Returns the count of unread announcements visible to the authenticated user. Poll this every 60 seconds or on app foreground to drive the nav bar badge.

> **Important:** This route is registered before `/:id` in Fastify to prevent routing conflicts.

**Auth:** Any authenticated user

**Response `200`**
```json
{
  "success": true,
  "data": { "count": 3 }
}
```

**Logic**
1. Builds role-based visibility conditions (same as list endpoint).
2. Counts visible announcements WHERE the user has **no** row in `announcement_reads`.

---

## 5. Broadcast Flow (FCM + BullMQ)

```
POST /api/announcements (HTTP request)
         │
         ▼
    DB insert → announcements row
         │
         ▼
    announcementQueue.add(job)     ← Returns 202 immediately
         │
         ▼
    [Background] announcement.worker.js
         │
         ▼
    resolveTokens(audience)
    ┌─ audience=all      → roles: member, trainer, cafe_manager, admin, super_admin
    ├─ audience=members  → role: member
    ├─ audience=trainers → role: trainer
    └─ audience=cafe     → role: cafe_manager
         │
         ▼
    Deduplicate tokens
         │
         ▼
    sendMulticastNotification() in batches of 500
    (Firebase Admin SDK → messaging().sendEachForMulticast())
         │
         ├─ On FCM error for a token:
         │    code = messaging/registration-token-not-registered
         │         → SET is_active = false (deactivate stale token)
         │
         └─ Log: total success / failure
```

### FCM Payload Structure

```json
{
  "notification": {
    "title": "Gym closes early on Sunday",
    "body": "The gym will close at 4 PM this Sunday..."
  },
  "data": {
    "announcement_id": "uuid",
    "type": "maintenance",
    "urgent": "true",
    "deep_link": "buildfitness://announcements/uuid"
  },
  "android": { "priority": "high" },
  "apns": { "headers": { "apns-priority": "10" } }
}
```

> Message body is truncated to 100 characters in the FCM payload (push notification preview). Full message is available by fetching `GET /api/announcements/:id`.

### Job Retry Policy

| Attribute | Value |
|-----------|-------|
| Max attempts | 3 |
| Backoff | Exponential, starting at 5 seconds |
| Urgent job priority | 1 (highest) |
| Normal job priority | 5 |
| Completed jobs kept | Last 100 |
| Failed jobs kept | Last 50 |

---

## 6. Deep Link Convention

The `deep_link` field stores a Universal Link / App Scheme URI. If not provided at creation, it defaults to `buildfitness://announcements/<id>`.

| URI | Opens |
|-----|-------|
| `buildfitness://announcements/<id>` | Announcement detail screen |
| `buildfitness://activity/<activity_id>` | Activity / booking screen |
| `buildfitness://cafe/menu` | Café menu screen |
| `buildfitness://profile` | Profile screen |

**React Native integration:**
```js
// Inside messaging().onNotificationOpenedApp()
const deepLink = remoteMessage.data?.deep_link;
if (deepLink) {
  Linking.openURL(deepLink);
}

// Inside list item tap handler
if (announcement.deep_link) {
  Linking.openURL(announcement.deep_link);
} else {
  navigation.navigate('AnnouncementDetail', { id: announcement.id });
}
```

---

## 7. Cursor Pagination

The list endpoint uses **cursor-based pagination** on `(published_at DESC, id DESC)` for stable pages (no duplicates when new announcements are published between requests).

### How it works

1. First request — no cursor:
   ```
   GET /api/announcements?limit=20
   ```

2. Response includes `nextCursor` (base64url-encoded `{ publishedAt, id }` of the last item):
   ```json
   { "nextCursor": "eyJwdWJsaXNoZWRBdCI6IjIwMjYtMDMtMTdUMTA6MDA6MDAuMDAwWiIsImlkIjoiYWJjZCJ9" }
   ```

3. Next page — pass cursor:
   ```
   GET /api/announcements?limit=20&cursor=eyJwdWJsaXNoZWRBdCI6Ii...
   ```

4. `nextCursor` is `null` when all items have been fetched.

### Cursor WHERE clause

```sql
WHERE (published_at < cursor_published_at)
   OR (published_at = cursor_published_at AND id < cursor_id)
```

---

## 8. Permissions Matrix

| Action | Member | Trainer | Café Mgr | Admin | Super Admin |
|--------|:------:|:-------:|:--------:|:-----:|:-----------:|
| View list (own audience) | ✓ | ✓ | ✓ | ✓ | ✓ |
| View past/expired | ✗ | ✗ | ✗ | ✓ | ✓ |
| View deleted (`include_deleted=true`) | ✗ | ✗ | ✗ | ✓ | ✓ |
| Filter by any audience | ✗ | ✗ | ✗ | ✓ | ✓ |
| Create | ✗ | ✗ | ✗ | ✓ | ✓ |
| Update | ✗ | ✗ | ✗ | ✓ | ✓ |
| Soft delete | ✗ | ✗ | ✗ | ✓ | ✓ |
| Mark as read | ✓ | ✓ | ✓ | ✓ | ✓ |
| Unread badge count | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 9. Field Reference

### `type` values

| Value | Use case |
|-------|---------|
| `general` | General gym updates |
| `event` | Upcoming classes, workshops, competitions |
| `maintenance` | Facility closures, equipment downtime |
| `promotion` | Offers, discounts, referrals |
| `health` | Health tips, wellness reminders |

### `audience` values

| Value | Who receives it |
|-------|----------------|
| `all` | Every active user (members + all staff) |
| `members` | Users with `role = member` |
| `trainers` | Users with `role = trainer` |
| `cafe` | Users with `role = cafe_manager` |

---

## 10. Error Responses

All errors follow the standard shape:

```json
{
  "success": false,
  "message": "Human-readable description",
  "error": "error.message (server errors only)"
}
```

| Status | Meaning |
|--------|---------|
| `202` | Accepted — announcement created, broadcast enqueued |
| `400` | Validation error (missing field, exceeds length, invalid enum) |
| `401` | Missing, invalid, or expired access token |
| `403` | Authenticated but insufficient role |
| `404` | Announcement not found, soft-deleted, or not visible to this role |
| `500` | Internal server error |

---

## 11. Environment Variables

| Variable | Required | Notes |
|----------|----------|-------|
| `REDIS_URL` | Yes | BullMQ connection. Default: `redis://localhost:6379` |
| `JWT_ACCESS_SECRET` | Yes | Access token signing key |
| `JWT_REFRESH_SECRET` | Yes | Refresh token signing key |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `FIREBASE_SERVICE_ACCOUNT` | Yes | Stringified Firebase service account JSON |

```
REDIS_URL=redis://localhost:6379
```

> For Redis with auth: `redis://:password@host:6379/0`

---

## Appendix — New Files Created

| File | Purpose |
|------|---------|
| [src/db/schema.js](src/db/schema.js) | Added `announcements` + `announcement_reads` tables and enums |
| [src/config/queue.js](src/config/queue.js) | BullMQ `announcementQueue` + Redis connection builder |
| [src/workers/announcement.worker.js](src/workers/announcement.worker.js) | BullMQ worker — resolves tokens, sends FCM batches, deactivates stale tokens |
| [src/routes/announcements.js](src/routes/announcements.js) | All 7 announcement endpoints |
| [src/config/env.js](src/config/env.js) | Added `REDIS_URL` to required vars + `config.redis.url` |
