# BuildGym Backend — API Reference

**Framework:** Fastify 4.27 (Node.js)
**ORM:** Drizzle ORM 0.30
**Database:** PostgreSQL
**Authentication:** OTP via Firebase FCM + JWT (access token 20 min / refresh token 7 d)
**Base URL:** `http://localhost:3000`

---

## Table of Contents

1. [Health Check](#1-health-check)
2. [OTP Authentication](#2-otp-authentication)
3. [JWT Token Management](#3-jwt-token-management)
4. [FCM Token Management](#4-fcm-token-management)
5. [Members (Customer APIs)](#5-members-customer-apis)
   - 5.1 [List Members](#51-get-apimembers)
   - 5.2 [Get Member](#52-get-apimembersid)
   - 5.3 [Update Member](#53-patch-apimembersid)
   - 5.4 [Delete Member](#54-delete-apimembersid)
   - 5.5 [Submit Onboarding](#55-post-apimembersuserid-onboarding)
   - 5.6 [Update Onboarding Progress](#56-patch-apimembersuserid-onboarding)
   - 5.7 [Get Onboarding Data](#57-get-apimembersuserid-onboarding)
6. [User Management (Admin)](#6-user-management-admin)
7. [Onboarding — Trainer](#7-onboarding--trainer)
8. [Onboarding — Café Manager](#8-onboarding--café-manager)
9. [Onboarding — Admin](#9-onboarding--admin)
10. [Onboarding — Super Admin](#10-onboarding--super-admin)
11. [Notifications](#11-notifications)
12. [Authentication & Authorization](#12-authentication--authorization)
13. [Data Models](#13-data-models)
14. [Error Responses](#14-error-responses)
15. [Business Logic Notes](#15-business-logic-notes)

---

## 1. Health Check

### `GET /health`

Returns server status. No authentication required.

**Response `200`**
```json
{
  "status": "ok",
  "timestamp": "2026-03-17T10:00:00.000Z",
  "service": "BuildGym Backend"
}
```

---

## 2. OTP Authentication

Base path: `/api/otp`

All OTP endpoints are **public** (no JWT required — this is the login flow).

---

### `POST /api/otp/send`

Send a 6-digit OTP to a pre-registered phone number via FCM.

**Request Body**
```json
{ "phone": "+919999900000" }
```

**Logic**
1. Verifies phone is pre-registered in `user_profiles`.
2. Invalidates all existing unused OTPs for this phone.
3. Generates a random 6-digit OTP with `expiresAt = NOW() + 5 minutes`.
4. Finds active FCM tokens (by `userId` or `phone`).
5. Sends via FCM. If no tokens exist, returns the OTP in the response (testing fallback).

**Response `200`**
```json
{
  "success": true,
  "message": "OTP sent via FCM",
  "data": {
    "phone": "+919999900000",
    "expiresAt": "2026-03-17T10:05:00.000Z",
    "sentTo": 1,
    "otp": "123456"
  }
}
```

> `otp` only appears when no FCM tokens are found (testing fallback).

**Error Codes**
| Status | Reason |
|--------|--------|
| `400` | Missing `phone` |
| `404` | Phone not pre-registered |
| `500` | Internal server error |

---

### `POST /api/otp/verify`

Verify the OTP. On success, returns **both JWT tokens** and the user object.

**Request Body**
```json
{
  "phone": "+919999900000",
  "code": "123456"
}
```

**Logic**
1. Finds a valid OTP (`isUsed = false`, `expiresAt > NOW()`).
2. Marks OTP as used, increments `attemptCount`.
3. Fetches user from `user_profiles`.
4. Associates phone-keyed FCM tokens to `userId`.
5. Signs and returns `accessToken` (20 min) and `refreshToken` (7 d).
   JWT payload: `{ id, role, phone }`.

**Response `200`**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "role": "member",
      "fullName": "John Doe",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+919999900000",
      "email": "john@example.com",
      "onboardingCompleted": false
    }
  }
}
```

**Error Codes**
| Status | Reason |
|--------|--------|
| `400` | Missing `phone`/`code`, or OTP is invalid/expired |
| `404` | User not found |
| `500` | Internal server error |

---

### `POST /api/otp/resend`

Invalidate the current OTP and send a new one.

**Request Body**
```json
{ "phone": "+919999900000" }
```

Same logic as `/api/otp/send`. Does **not** return tokens — user must call `/otp/verify` after.

**Response `200`**
```json
{
  "success": true,
  "message": "OTP resent via FCM",
  "data": {
    "phone": "+919999900000",
    "expiresAt": "2026-03-17T10:05:00.000Z",
    "sentTo": 1
  }
}
```

---

## 3. JWT Token Management

Base path: `/api/auth`

---

### `POST /api/auth/refresh`

Exchange a valid refresh token for a new access token + new refresh token (rolling refresh).

The user's role is **re-read from the database** on every refresh, so role changes and soft-deletes take effect immediately without waiting for token expiry.

**Request Body**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

**Logic**
1. Verifies `refreshToken` with `JWT_REFRESH_SECRET`.
2. Re-fetches the user from DB to check for soft-delete and role changes.
3. Issues a new `accessToken` (20 min) and a new `refreshToken` (7 d).

**Response `200`**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "uuid",
      "role": "member",
      "phone": "+919999900000"
    }
  }
}
```

**Error Codes**
| Status | Reason |
|--------|--------|
| `400` | Missing `refreshToken` |
| `401` | Refresh token expired or invalid |
| `401` | User soft-deleted or no longer exists |
| `500` | Internal server error |

---

## 4. FCM Token Management

Base path: `/api/fcm-tokens`

**Public** — called before and after login to keep device tokens in sync.

---

### `POST /api/fcm-tokens`

Register or update an FCM device token. Call on every app launch.

**Request Body — Pre-auth**
```json
{
  "phone": "+919999900000",
  "token": "fcm-registration-token",
  "deviceId": "unique-device-id",
  "platform": "ios"
}
```

**Request Body — Post-auth**
```json
{
  "userId": "uuid",
  "token": "fcm-registration-token",
  "deviceId": "unique-device-id",
  "platform": "android"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `token` | string | Yes | FCM registration token |
| `deviceId` | string | Yes | Unique device identifier |
| `platform` | string | Yes | `ios`, `android`, or `web` |
| `userId` | UUID | Conditional | Used post-auth |
| `phone` | string | Conditional | Used pre-auth |

**Logic**
- If `deviceId` exists: update `token`, `isActive = true`, `lastSeenAt`.
- If not: insert new row.

**Response `200` / `201`**
```json
{
  "success": true,
  "message": "FCM token updated",
  "data": { /* fcm_tokens object */ }
}
```

---

### `GET /api/fcm-tokens/user/:userId`

Get all active FCM tokens for a user.

**Response `200`**
```json
{ "success": true, "count": 2, "data": [ /* fcm_tokens objects */ ] }
```

---

### `DELETE /api/fcm-tokens/:deviceId`

Deactivate an FCM token (sets `isActive = false`).

**Response `200`**
```json
{ "success": true, "message": "FCM token deactivated" }
```

---

### `PATCH /api/fcm-tokens/associate`

Manually associate phone-keyed tokens to a `userId`. Auto-invoked inside `/otp/verify`, exposed here for manual use.

**Request Body**
```json
{ "phone": "+919999900000", "userId": "uuid" }
```

**Response `200`**
```json
{ "success": true, "message": "Associated 1 token(s) to user", "data": [ /* tokens */ ] }
```

---

## 5. Members (Customer APIs)

Base path: `/api/members`

All routes **require a valid JWT** (`Authorization: Bearer <accessToken>`).
Role-based access is enforced per endpoint as documented below.

---

### `5.1` `GET /api/members`

List all members.

**Auth:** `admin`, `super_admin`

**Query Parameters**
| Param | Type | Notes |
|-------|------|-------|
| `onboarded` | boolean | `true` or `false` |

**Response `200`**
```json
{
  "success": true,
  "count": 42,
  "data": [ /* user_profiles objects with role = member */ ]
}
```

**Error Codes**
| Status | Reason |
|--------|--------|
| `401` | Missing or invalid access token |
| `403` | Caller is not admin/super_admin |

---

### `5.2` `GET /api/members/:id`

Get a member's base profile + extended member profile.

**Auth:** `admin`, `super_admin` — or the **member themselves** (`id` must match JWT `id`)

**Path Params**
| Param | Type | Notes |
|-------|------|-------|
| `id` | UUID | Member's user ID |

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": "member",
    "phone": "+919999900000",
    "firstName": "John",
    "lastName": "Doe",
    "fullName": "John Doe",
    "email": "john@example.com",
    "profilePhotoUrl": "https://...",
    "onboardingCompleted": true,
    "createdAt": "2026-03-17T...",
    "profile": { /* member_profiles object or null */ }
  }
}
```

**Error Codes**
| Status | Reason |
|--------|--------|
| `401` | Invalid/expired token |
| `403` | Not admin/super_admin and not the member |
| `404` | Member not found |

---

### `5.3` `PATCH /api/members/:id`

Partial update of a member's base profile fields.

**Auth:** `admin`, `super_admin` — or the **member themselves**

Immutable fields (`id`, `role`, `phone`, `createdAt`, `deletedAt`) are stripped automatically.

**Request Body** — any subset of:
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "fullName": "Jane Smith",
  "email": "jane@example.com",
  "authUid": "firebase-uid",
  "profilePhotoUrl": "https://..."
}
```

**Response `200`**
```json
{ "success": true, "data": { /* updated user_profiles object */ } }
```

---

### `5.4` `DELETE /api/members/:id`

Soft-delete a member (sets `deletedAt` on `user_profiles` and `member_profiles`).

**Auth:** `admin`, `super_admin` only

**Response `200`**
```json
{ "success": true, "message": "Member soft-deleted successfully" }
```

---

### `5.5` `POST /api/members/:userId/onboarding`

Submit full 6-step member onboarding. Sets `onboardingCompleted = true` only when all 3 mandatory consents (`consentTerms`, `consentPrivacy`, `consentMedicalFitness`) are `true`.

**Auth:** `admin`, `super_admin` — or the **member themselves**

**Path Params**
| Param | Type | Notes |
|-------|------|-------|
| `userId` | UUID | Must have `role = member` |

**Request Body**
```json
{
  "firstName": "John",
  "lastName": "Doe",
  "fullName": "John Doe",
  "email": "john@example.com",
  "profilePhotoUrl": "https://cdn.example.com/photo.jpg",

  "dob": "1995-03-17",

  "fitnessLevel": "intermediate",
  "healthConditions": ["Hypertension", "Lower Back Pain"],
  "hasMedications": true,
  "medicationsText": "Aspirin daily",
  "dietaryPreference": "Vegetarian",
  "sleepPattern": "7–8 hrs",

  "pastInjuries": ["Knee Injury"],
  "injuryStatusMap": { "Knee Injury": "Recovering" },
  "hasPhysiotherapy": false,
  "doctorClearance": "Not Applicable",

  "fitnessGoals": ["weight_loss", "stamina"],
  "workoutFrequency": "3-4",
  "preferredWorkoutTimes": ["early_morning", "evening"],
  "activityInterests": ["weights", "cardio"],

  "ecName": "Jane Doe",
  "ecRelationship": "Spouse",
  "ecPhone": "+919999900001",

  "consentTerms": true,
  "consentPrivacy": true,
  "consentMedicalFitness": true,
  "optLeaderboard": false,
  "optCommunity": true,
  "optPromotions": false
}
```

**Field Reference by Step**

| Field | Step | Type | Notes |
|-------|------|------|-------|
| `firstName`, `lastName`, `fullName`, `email`, `profilePhotoUrl` | 1 | string | Stored in `user_profiles` |
| `dob` | 1 | date | `YYYY-MM-DD` |
| `fitnessLevel` | 2 | string | `beginner`, `intermediate`, `advanced`, `athlete` |
| `healthConditions` | 2 | string[] | JSONB array |
| `hasMedications` | 2 | boolean | |
| `medicationsText` | 2 | string | Used when `hasMedications = true` |
| `dietaryPreference` | 2 | string | `No Preference`, `Vegetarian`, `Vegan`, `Keto`, `Gluten-Free` |
| `sleepPattern` | 2 | string | `Less than 5 hrs`, `6–7 hrs`, `7–8 hrs`, `8+ hrs` |
| `pastInjuries` | 3 | string[] | JSONB array |
| `injuryStatusMap` | 3 | object | `{ injury: status }` JSONB |
| `hasPhysiotherapy` | 3 | boolean | |
| `doctorClearance` | 3 | string | `Yes`, `No`, `Not Applicable` |
| `fitnessGoals` | 4 | string[] | JSONB array |
| `workoutFrequency` | 4 | string | `1-2`, `3-4`, `5-6`, `daily` |
| `preferredWorkoutTimes` | 4 | string[] | e.g. `early_morning`, `evening` |
| `activityInterests` | 4 | string[] | e.g. `weights`, `cardio`, `hiit` |
| `ecName`, `ecRelationship`, `ecPhone` | 5 | string | Emergency contact |
| `consentTerms` | 6 | boolean | **Mandatory** — required for onboarding completion |
| `consentPrivacy` | 6 | boolean | **Mandatory** |
| `consentMedicalFitness` | 6 | boolean | **Mandatory** |
| `optLeaderboard`, `optCommunity`, `optPromotions` | 6 | boolean | Optional |

**Logic**
1. Verifies user exists and has `role = member`.
2. Updates `user_profiles` with personal fields.
3. Upserts `member_profiles` with all remaining fields.
4. If all 3 mandatory consents are `true`, sets `onboardingCompleted = true`.

**Response `200`**
```json
{ "success": true, "message": "Member onboarding saved", "data": { /* member_profiles object */ } }
```

---

### `5.6` `PATCH /api/members/:userId/onboarding`

Partial update — save progress step-by-step or resume onboarding.

**Auth:** `admin`, `super_admin` — or the **member themselves**

**Request Body** — any subset of the `POST` body fields.

**Logic**
- Splits fields between `user_profiles` and `member_profiles`.
- Updates only the provided fields.
- Does **not** set `onboardingCompleted = true` — use `POST` for full submission.

**Response `200`**
```json
{ "success": true, "message": "Member onboarding updated" }
```

---

### `5.7` `GET /api/members/:userId/onboarding`

Fetch saved onboarding data for pre-population when resuming the flow.

**Auth:** `admin`, `super_admin` — or the **member themselves**

**Response `200`**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "firstName": "John",
      "lastName": "Doe",
      "fullName": "John Doe",
      "email": "john@example.com",
      "phone": "+919999900000",
      "profilePhotoUrl": "https://...",
      "onboardingCompleted": false
    },
    "profile": { /* member_profiles object or null */ }
  }
}
```

---

## 6. User Management (Admin)

Base path: `/api/users`

General user management for all roles. Used by admin/super admin to manage the full user base.

> **Note:** These routes currently have no JWT middleware. Add `authenticate` + `requireRoles(['admin', 'super_admin'])` before production deployment.

---

### `POST /api/users/pre-register`

Pre-register a user. The **only** way to create accounts.

**Request Body**
```json
{
  "phone": "+919999900000",
  "role": "member",
  "fullName": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "createdBy": "uuid-of-registering-admin"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `phone` | string | Yes | Unique across active users |
| `role` | string | Yes | `member`, `trainer`, `cafe_manager`, `admin`, `super_admin` |
| `fullName` | string | No | |
| `firstName` | string | No | |
| `lastName` | string | No | |
| `createdBy` | UUID | No | UUID of the registering admin |

**Logic**
1. Validates `phone` and `role`.
2. Checks for duplicate phone.
3. Creates `user_profiles` row with `onboardingCompleted = false`.
4. Creates corresponding extended profile row for the role.

**Response `201`**
```json
{ "success": true, "message": "User pre-registered successfully", "data": { /* user_profiles object */ } }
```

**Error Codes:** `400` (missing/invalid), `409` (phone exists), `500`

---

### `GET /api/users`

List all non-deleted users. Supports `?role=member&onboarded=true`.

**Response `200`**
```json
{ "success": true, "count": 42, "data": [ /* user_profiles objects */ ] }
```

---

### `GET /api/users/phone/:phone`

Look up a user by phone number.

**Response `200`**
```json
{ "success": true, "data": { /* user_profiles object */ } }
```

---

### `GET /api/users/:id`

Get a user's base profile + extended role-specific profile.

**Response `200`**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "role": "trainer",
    "phone": "+919999900000",
    "profile": { /* extended profile or null */ }
  }
}
```

---

### `PATCH /api/users/:id`

Partial update of `user_profiles` fields. Strips `id`, `createdAt`, `deletedAt`.

**Response `200`**
```json
{ "success": true, "data": { /* updated user_profiles object */ } }
```

---

### `DELETE /api/users/:id`

Soft-delete user and their extended profile.

**Response `200`**
```json
{ "success": true, "message": "User soft-deleted successfully" }
```

---

## 7. Onboarding — Trainer

Base path: `/api/onboarding/trainer`

5-step flow. Completing onboarding sets `approvalStatus = pending` and `onboardingCompleted = true`. Requires admin approval before the trainer is active.

---

### `POST /api/onboarding/trainer/:userId`

Submit full trainer onboarding.

**Request Body**
```json
{
  "fullName": "John Smith",
  "email": "john@trainer.com",
  "profilePhotoUrl": "https://...",
  "location": "Koramangala, Bangalore",
  "hourlyRate": "1500.00",
  "specialisations": ["HIIT", "Yoga", "Strength Training"],
  "yearsOfExperience": 8,
  "certificationsText": "NASM, ACE Certified",
  "bio": "Passionate fitness coach...",
  "trainingPhilosophy": "Holistic approach to fitness...",
  "languages": ["English", "Hindi", "Kannada"]
}
```

| Field | Step | Type | Notes |
|-------|------|------|-------|
| `fullName`, `email`, `profilePhotoUrl` | 1 | string | Stored in `user_profiles` |
| `location` | 1 | string | |
| `hourlyRate` | 1 | numeric | |
| `specialisations` | 2 | string[] | JSONB |
| `yearsOfExperience` | 3 | integer | |
| `certificationsText` | 3 | string | |
| `bio` | 4 | string | Max 500 chars |
| `trainingPhilosophy` | 4 | string | Max 300 chars |
| `languages` | 4 | string[] | JSONB |

**Response `200`**
```json
{ "success": true, "message": "Trainer onboarding saved (pending approval)", "data": { /* trainer_profiles object */ } }
```

---

### `PATCH /api/onboarding/trainer/:userId`

Partial update of trainer onboarding. Does not change `approvalStatus`.

**Response `200`**
```json
{ "success": true, "message": "Trainer onboarding updated" }
```

---

### `GET /api/onboarding/trainer/:userId`

Fetch trainer onboarding data.

**Response `200`**
```json
{ "success": true, "data": { "user": { /* ... */ }, "profile": { /* trainer_profiles or null */ } } }
```

---

### `PATCH /api/onboarding/trainer/:userId/approve`

Admin action — approve or reject a trainer application.

**Auth:** Recommend `admin`, `super_admin` (not yet enforced via middleware)

**Request Body**
```json
{ "status": "approved" }
```

| Field | Values |
|-------|--------|
| `status` | `approved` or `rejected` |

**Response `200`**
```json
{ "success": true, "message": "Trainer approved", "data": { /* trainer_profiles object */ } }
```

**Error Codes:** `400` (invalid status), `404` (trainer not found)

---

## 8. Onboarding — Café Manager

### `POST /api/onboarding/cafe-manager/:userId`

Single-step onboarding. Sets `onboardingCompleted = true`.

**Request Body**
```json
{
  "firstName": "Jane",
  "lastName": "Doe",
  "fullName": "Jane Doe",
  "email": "jane@cafe.com",
  "profilePhotoUrl": "https://..."
}
```

**Response `200`**
```json
{ "success": true, "message": "Café manager onboarding complete" }
```

---

## 9. Onboarding — Admin

### `POST /api/onboarding/admin/:userId`

Single-step onboarding. Sets `onboardingCompleted = true`.

**Request Body**
```json
{
  "fullName": "Admin Name",
  "email": "admin@gym.com",
  "profilePhotoUrl": "https://..."
}
```

**Response `200`**
```json
{ "success": true, "message": "Admin onboarding complete" }
```

---

## 10. Onboarding — Super Admin

### `POST /api/onboarding/super-admin/:userId`

Single-step onboarding. Sets `onboardingCompleted = true`.

**Request Body**
```json
{
  "fullName": "Super Admin Name",
  "email": "superadmin@gym.com",
  "profilePhotoUrl": "https://..."
}
```

**Response `200`**
```json
{ "success": true, "message": "Super admin onboarding complete" }
```

---

## 11. Notifications

Base path: `/api/notifications`

---

### `POST /api/notifications/send`

Send a push notification to a target group.

**Request Body**
```json
{
  "targetType": "all_members",
  "targetUserId": "uuid",
  "title": "New Class Available",
  "body": "HIIT class at 7am tomorrow — book your spot!",
  "data": { "screen": "classes" },
  "sentBy": "uuid-of-admin"
}
```

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `targetType` | string | Yes | See target types below |
| `targetUserId` | UUID | Conditional | Required when `targetType = single_user` |
| `title` | string | Yes | |
| `body` | string | Yes | |
| `data` | object | No | Custom payload forwarded to app |
| `sentBy` | UUID | No | UUID of triggering admin |

**Target Types**
| Value | Scope |
|-------|-------|
| `single_user` | One specific user |
| `all_members` | All users with `role = member` |
| `all_staff` | Trainers + Café Managers + Admins |
| `everyone` | All non-deleted users |

**Logic**
1. Resolves active FCM tokens per target type.
2. Deduplicates tokens.
3. Sends via FCM in batches of 500.
4. Logs result in `notification_logs`.

**Response `200`**
```json
{
  "success": true,
  "message": "Notification processed",
  "data": {
    "logId": "uuid",
    "tokensFound": 42,
    "successCount": 40,
    "failureCount": 2
  }
}
```

---

### `GET /api/notifications`

Fetch notification history. Supports `?targetType=all_members&sentBy=UUID`.

**Response `200`**
```json
{ "success": true, "count": 12, "data": [ /* notification_logs objects */ ] }
```

---

### `GET /api/notifications/:id`

Fetch a single notification log entry.

**Response `200`**
```json
{ "success": true, "data": { /* notification_logs object */ } }
```

---

## 12. Authentication & Authorization

### Authentication Flow

```
App Launch
    │
    ▼
POST /api/fcm-tokens          ← Register device token (phone-keyed, pre-auth)
    │
    ▼
POST /api/otp/send            ← Request OTP for pre-registered phone
    │                           OTP delivered to device via FCM notification
    ▼
POST /api/otp/verify          ← Submit OTP
    │                           → accessToken (20 min) + refreshToken (7 d) returned
    │                           → Phone-keyed FCM tokens associated to userId
    ▼
Use accessToken in all subsequent requests
    │
    ├─ onboardingCompleted = false → POST /api/members/:userId/onboarding
    │
    └─ onboardingCompleted = true  → Main app flow

When accessToken expires:
    POST /api/auth/refresh    ← Send refreshToken, receive new token pair
```

---

### JWT Details

| Token | Secret env var | Expiry | Usage |
|-------|---------------|--------|-------|
| `accessToken` | `JWT_ACCESS_SECRET` | 20 minutes | Bearer token on all protected routes |
| `refreshToken` | `JWT_REFRESH_SECRET` | 7 days | Rotate tokens at `/api/auth/refresh` |

**JWT Payload (both tokens):**
```json
{ "id": "uuid", "role": "member", "phone": "+919999900000", "iat": 0, "exp": 0, "sub": "uuid" }
```

**Authorization header format:**
```
Authorization: Bearer <accessToken>
```

---

### Role Hierarchy

Roles are ranked by privilege level. Higher-ranked roles can access everything lower-ranked roles can access on routes that use `requireMinRole`.

| Role | Rank | Description |
|------|------|-------------|
| `super_admin` | 5 | Full system access |
| `admin` | 4 | Manage members, trainers, staff |
| `trainer` | 3 | Manage own profile |
| `cafe_manager` | 2 | Café operations |
| `member` | 1 | Own data only |

---

### Middleware

Two preHandler functions are available in [src/middleware/auth.js](src/middleware/auth.js):

#### `authenticate`
Verifies the Bearer access token and sets `request.user = { id, role, phone, iat, exp }`.
Returns `401` if missing, invalid, or expired.

#### `requireRoles(roles[])`
Factory — returns a preHandler that allows only users whose `role` is in the provided array.
Must be chained after `authenticate`.
Returns `403` if the caller's role is not in the list.

#### `requireMinRole(minRole)`
Factory — returns a preHandler that allows users whose role rank ≥ the minimum.
Returns `403` if the caller's rank is below the threshold.

**Usage example:**
```js
// Admin/Super Admin only
server.get('/route', {
  preHandler: [authenticate, requireRoles(['admin', 'super_admin'])]
}, handler);

// Admin and above (rank ≥ 4)
server.delete('/route', {
  preHandler: [authenticate, requireMinRole('admin')]
}, handler);

// Any authenticated user
server.get('/route', { preHandler: [authenticate] }, handler);
```

---

### Route Protection Summary

| Route | Auth | Roles |
|-------|------|-------|
| `GET /api/members` | JWT | `admin`, `super_admin` |
| `GET /api/members/:id` | JWT | `admin`, `super_admin`, or self |
| `PATCH /api/members/:id` | JWT | `admin`, `super_admin`, or self |
| `DELETE /api/members/:id` | JWT | `admin`, `super_admin` |
| `POST /api/members/:userId/onboarding` | JWT | `admin`, `super_admin`, or self |
| `PATCH /api/members/:userId/onboarding` | JWT | `admin`, `super_admin`, or self |
| `GET /api/members/:userId/onboarding` | JWT | `admin`, `super_admin`, or self |
| `POST /api/auth/refresh` | None (uses refreshToken) | Any |
| `POST /api/otp/*` | None | Any (pre-login) |
| `POST /api/fcm-tokens` | None | Any (pre-login) |
| `/api/users/*` | None (add before prod) | Recommend admin+ |
| `/api/onboarding/*` | None (add before prod) | Recommend admin+ |
| `/api/notifications/*` | None (add before prod) | Recommend admin+ |

---

## 13. Data Models

### `user_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | Primary key |
| `authUid` | text | Firebase auth UID |
| `role` | enum | `super_admin`, `admin`, `trainer`, `cafe_manager`, `member` |
| `fullName`, `firstName`, `lastName` | text | |
| `phone` | text | Unique — login key |
| `email` | text | |
| `profilePhotoUrl` | text | CDN URL |
| `onboardingCompleted` | boolean | Default `false` |
| `createdBy` | UUID | FK → self (who registered them) |
| `deletedAt` | timestamp | `null` = active |
| `createdAt`, `updatedAt` | timestamp | |

---

### `member_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `userProfileId` | UUID | FK → `user_profiles.id` |
| `dob` | date | |
| `fitnessLevel` | text | `beginner`, `intermediate`, `advanced`, `athlete` |
| `healthConditions` | JSONB | string[] |
| `hasMedications` | boolean | |
| `medicationsText` | text | |
| `dietaryPreference` | text | |
| `sleepPattern` | text | |
| `pastInjuries` | JSONB | string[] |
| `injuryStatusMap` | JSONB | `{ injury: status }` |
| `hasPhysiotherapy` | boolean | |
| `doctorClearance` | text | |
| `fitnessGoals` | JSONB | string[] |
| `workoutFrequency` | text | |
| `preferredWorkoutTimes` | JSONB | string[] |
| `activityInterests` | JSONB | string[] |
| `ecName`, `ecRelationship`, `ecPhone` | text | Emergency contact |
| `consentTerms`, `consentPrivacy`, `consentMedicalFitness` | boolean | **Mandatory** |
| `optLeaderboard`, `optCommunity`, `optPromotions` | boolean | Optional |

---

### `trainer_profiles`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `userProfileId` | UUID | FK → `user_profiles.id` |
| `location` | text | |
| `hourlyRate` | numeric | |
| `specialisations` | JSONB | string[] |
| `yearsOfExperience` | integer | |
| `certificationsText` | text | |
| `bio` | text | Max 500 chars |
| `trainingPhilosophy` | text | Max 300 chars |
| `languages` | JSONB | string[] |
| `approvalStatus` | text | `pending`, `approved`, `rejected` |

---

### `otp_codes`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `phone` | text | Not FK — exists before user login |
| `code` | text | 6-digit OTP |
| `expiresAt` | timestamp | `NOW() + 5 minutes` |
| `isUsed` | boolean | Default `false` |
| `attemptCount` | integer | |
| `createdAt` | timestamp | |

---

### `fcm_tokens`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `userId` | UUID | FK → `user_profiles.id`, nullable pre-auth |
| `phone` | text | Temporary key pre-auth, cleared after association |
| `token` | text | FCM registration token |
| `deviceId` | text | Unique per device |
| `platform` | enum | `ios`, `android`, `web` |
| `isActive` | boolean | Default `true` |
| `lastSeenAt` | timestamp | Updated on every app launch |

---

### `notification_logs`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `targetType` | enum | `single_user`, `all_members`, `all_staff`, `everyone` |
| `targetUserId` | UUID | FK → `user_profiles.id`, `single_user` only |
| `title`, `body` | text | |
| `data` | JSONB | Optional custom payload |
| `sentBy` | UUID | FK → `user_profiles.id` |
| `successCount`, `failureCount` | integer | |
| `sentAt`, `createdAt` | timestamp | |

---

## 14. Error Responses

All errors follow this shape:

```json
{
  "success": false,
  "message": "Human-readable description",
  "error": "error.message (server errors only)"
}
```

| Status | Meaning |
|--------|---------|
| `200` | Success |
| `201` | Created |
| `400` | Bad request / validation |
| `401` | Unauthenticated (missing/invalid/expired token) |
| `403` | Forbidden (authenticated but insufficient role) |
| `404` | Resource not found |
| `409` | Conflict (e.g. duplicate phone) |
| `500` | Internal server error |

---

## 15. Business Logic Notes

### Token strategy
- `accessToken` (20 min): short-lived, passed on every request.
- `refreshToken` (7 d): stored securely on device, used only to rotate tokens.
- On every refresh, the user's role and existence are re-validated from the DB — role changes apply instantly.

### Pre-registration is the only account creation path
Admins create users via `POST /api/users/pre-register`. Users then authenticate via OTP on first launch.

### Member onboarding completion
`onboardingCompleted = true` is set only during the full `POST /api/members/:userId/onboarding` call **and** only when `consentTerms`, `consentPrivacy`, and `consentMedicalFitness` are all `true`. The `PATCH` variant never triggers completion.

### Trainer approval workflow
After trainer onboarding completes → `approvalStatus = pending`. Admin must call `PATCH /api/onboarding/trainer/:userId/approve` with `{ "status": "approved" }`.

### Soft delete everywhere
All deletions set `deletedAt`. All queries filter `WHERE deletedAt IS NULL`.

### FCM token lifecycle
1. Pre-login: register token with `phone` key.
2. Post OTP verify: tokens automatically migrated from `phone` to `userId`.
3. Logout: `DELETE /api/fcm-tokens/:deviceId`.
4. App reinstall: same `deviceId` updates the FCM token.

### Environment variables required
```
JWT_ACCESS_SECRET   # strong random secret for access tokens
JWT_REFRESH_SECRET  # strong random secret for refresh tokens (different from access)
DATABASE_URL        # PostgreSQL connection string
FIREBASE_SERVICE_ACCOUNT  # Stringified Firebase service account JSON
PORT                # default 3000
```
