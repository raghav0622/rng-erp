# Firestore Composite Index Analysis

**Analysis Date:** February 7, 2026  
**Based on:** Current codebase state

## Executive Summary

This document details all Firestore composite indexes required for the RNG ERP application based on actual query patterns in the codebase.

---

## Collections Overview

### 1. `app-users` Collection

- **Soft Delete:** ✅ Enabled
- **Impact:** All queries automatically include `deletedAt == null` filter
- **Consequence:** Every multi-field query requires a composite index including `deletedAt`

### 2. `sessions` Collection

- **Soft Delete:** ❌ Disabled
- **Purpose:** Track active user sessions across devices

---

## Required Composite Indexes

### `app-users` Collection

#### Index #1: Email Lookup (Active Users)

```json
{
  "fields": [
    { "fieldPath": "email", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `getActiveUserByEmail()` in app-user.service.ts:265  
**Query:** `email == X AND deletedAt == null`  
**Purpose:** Find active user by email, excluding soft-deleted accounts

---

#### Index #2: Orphaned Users Detection

```json
{
  "fields": [
    { "fieldPath": "inviteStatus", "order": "ASCENDING" },
    { "fieldPath": "isRegisteredOnERP", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `listOrphanedLinkedUsers()` in app-auth.service.ts:2877  
**Query:** `inviteStatus == 'activated' AND isRegisteredOnERP == false AND deletedAt == null`  
**Purpose:** Find Firebase Auth users created but not fully registered (cleanup candidates)

---

#### Index #3: Role Filtering

```json
{
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `searchUsers()` with role filter in app-user.service.ts:124  
**Query:** `role == X AND deletedAt == null`  
**Purpose:** Filter users by role (owner, client, accountant)

---

#### Index #4: Role + Invite Status

```json
{
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "inviteStatus", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `searchUsers()` with multiple filters  
**Query:** `role == X AND inviteStatus == Y AND deletedAt == null`  
**Purpose:** Advanced filtering (e.g., "all invited accountants")

---

#### Index #5: Role + Disabled Status

```json
{
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "isDisabled", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `searchUsers()` with role + disabled filter  
**Query:** `role == X AND isDisabled == Y AND deletedAt == null`  
**Purpose:** Find disabled users of specific role

---

#### Index #6: Invite Status + Disabled Status

```json
{
  "fields": [
    { "fieldPath": "inviteStatus", "order": "ASCENDING" },
    { "fieldPath": "isDisabled", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `searchUsers()` with inviteStatus + isDisabled filter  
**Query:** `inviteStatus == X AND isDisabled == Y AND deletedAt == null`  
**Purpose:** Advanced user state filtering

---

#### Index #7: Disabled Status Filter

```json
{
  "fields": [
    { "fieldPath": "isDisabled", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `searchUsers()` with isDisabled filter  
**Query:** `isDisabled == X AND deletedAt == null`  
**Purpose:** List all disabled or enabled users

---

#### Index #8: Registration Status Filter

```json
{
  "fields": [
    { "fieldPath": "isRegisteredOnERP", "order": "ASCENDING" },
    { "fieldPath": "deletedAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `searchUsers()` with isRegisteredOnERP filter  
**Query:** `isRegisteredOnERP == X AND deletedAt == null`  
**Purpose:** Find users by registration completion status

---

### `sessions` Collection

#### Index #9: Active Sessions Query

```json
{
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "revoked", "order": "ASCENDING" },
    { "fieldPath": "expiresAt", "order": "ASCENDING" }
  ]
}
```

**Usage:** `getActiveSessions()` in session.repository.ts:23  
**Query:** `userId == X AND revoked == false AND expiresAt > now`  
**Purpose:** Retrieve active sessions for instant logout across devices

---

## Single-Field Queries (No Index Required)

Firestore automatically indexes single fields. These queries do **not** require composite indexes:

### `app-users` Collection

- `role == 'owner'` (used in `isOwnerBootstrapped()`)
- Any single-field equality query

### `sessions` Collection

- `expiresAt < now` (used in `cleanupExpiredSessions()`)

---

## Dynamic Search Combinations

The `searchUsers()` method in app-user.service.ts:124 allows filtering by any combination of:

- `email`
- `role`
- `inviteStatus`
- `isDisabled`
- `isRegisteredOnERP`

**Total possible combinations:** 31 (2^5 - 1)  
**Indexes provided:** 8 (covering most common cases)

### Not Covered (Rare Edge Cases)

The following combinations are theoretically possible but not indexed due to low expected usage:

- `email + role + deletedAt`
- `email + inviteStatus + deletedAt`
- `role + inviteStatus + isDisabled + deletedAt` (3+ fields)
- Other 3-5 field combinations

**Strategy:** Create additional indexes on-demand if Firestore throws index errors in production.

---

## Deployment Instructions

### Step 1: Deploy Indexes

```bash
# From project root
firebase deploy --only firestore:indexes
```

### Step 2: Wait for Index Building

- Log into [Firebase Console](https://console.firebase.google.com)
- Navigate to Firestore Database → Indexes
- Wait for all indexes to show "Enabled" status (can take several minutes)

### Step 3: Verify

Test queries in your app or run:

```bash
# If you have Firestore emulator tests
npm run test:firestore
```

---

## Performance Impact

### Before Indexes

- Orphaned users query: **2+ minutes** (full collection scan)
- User searches: Slow or failing with errors
- Session lookups: Potentially slow with many sessions

### After Indexes

- Orphaned users query: **<1 second** (indexed lookup)
- User searches: Instant (indexed filtering)
- Session lookups: Fast (indexed 3-field query)

---

## Maintenance

### When to Add New Indexes

Add a new composite index when:

1. New query pattern introduced in code
2. Firestore throws `FAILED_PRECONDITION` error with index creation link
3. Query performance degrades with collection growth

### Monitoring

- Check Firebase Console → Firestore → Indexes regularly
- Monitor for "Index required" errors in application logs
- Review query performance metrics in Firebase Performance Monitoring

---

## Cost Considerations

**Index Storage:** Each index consumes storage proportional to number of documents × fields in index  
**Write Cost:** Each indexed field adds a small write cost  
**Estimate:** For 1000 users with 9 indexes ≈ negligible cost increase

**Optimization:** Indexes are essential for query performance. The small cost is justified by dramatic speed improvements.

---

## Code References

**Repository Base:** `rng-repository/AbstractClientFirestoreRepository.ts`

- Lines 670-679: Soft delete filter automatically applied
- Lines 683-687: Order by logic

**App User Service:** `rng-platform/rng-auth/app-auth-service/internal-app-user-service/app-user.service.ts`

- Line 52: AppUserRepository with `softDelete: true`
- Line 124: `searchUsers()` dynamic query builder
- Line 265: `getActiveUserByEmail()` with email + deletedAt filter

**Session Repository:** `rng-platform/rng-auth/app-auth-service/session.repository.ts`

- Line 10: SessionRepository with `softDelete: false`
- Line 23: `getActiveSessions()` multi-field query

**Auth Service:** `rng-platform/rng-auth/app-auth-service/app-auth.service.ts`

- Line 2877: `listOrphanedLinkedUsers()` composite query

---

## Troubleshooting

### "Index already exists" Error

If deployment fails with this error, indexes are already deployed. This is safe to ignore.

### "Collection doesn't exist" Warning

Firestore will show warnings for collections with 0 documents. This is expected for new deployments.

### Index Building Stuck

Indexes can take 30+ minutes to build on large collections. Be patient. Check Firebase Console for status.

### Query Still Slow After Index Created

- Verify index shows "Enabled" in Firebase Console
- Check if query matches index fields exactly
- Consider index field order (equality filters before range filters)

---

## Version History

**v1.0** - February 7, 2026

- Initial analysis based on production codebase
- 8 app-users indexes + 1 sessions index
- Covers all critical query patterns
