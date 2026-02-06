# AppAuthService Internal & Maintenance APIs

**Status**: ✅ FIRST-CLASS OPERATIONAL TOOLS (FROZEN v1)  
**Policy**: Client-side recovery via owner maintenance APIs  
**Design**: Orphan prevention + detection + cleanup

## Scope

Internal methods provide operational tools for client-side recovery. These are first-class components of the architecture, not hidden utilities or debugging features.

## Orphan Prevention & Handling

**Prevention**: Rollback logic prevents orphaned disabled users during auth identity linking.

**How**: If hard-delete fails after disabled user is created, rollback automatically deletes the disabled copy. No orphans remain.

**Detection & Cleanup**: Owner APIs identify and remove any orphaned auth users (network failures between Firebase and Firestore).

## Internal APIs

### Primary Maintenance APIs

#### `listOrphanedLinkedUsers(): Promise<AppUser[]>`

Returns all orphaned auth users (auth exists, Firestore AppUser missing).

**Purpose**:

- System health monitoring
- Post-incident diagnostics
- Periodic cleanup jobs

**Scope**: Returns records only; does not auto-delete

#### `cleanupOrphanedLinkedUser(userId: string): Promise<void>`

Hard-deletes an orphaned user record.

**Purpose**: Manual cleanup of identified orphans  
**Protections**:

- Rate-limited (5 second cooldown)
- Only works on non-active users
- Logs owner action for audit trail

### Diagnostic APIs

#### `getLastAuthError(): { error, timestamp } | null`

Returns most recent auth resolution failure.

**Use Cases**:

- User-facing error messages
- Telemetry and logging
- User support investigations

#### `getLastSessionTransitionError(): { error, timestamp, from, to } | null`

Returns most recent state machine transition violation.

**Use Cases**:

- Detecting session state corruption
- Telemetry for rare concurrency issues
- Debugging dev tools

## Known Limitation Scenarios

### Scenario 1: Partial Auth + Firestore Linking

**What can happen**: Firebase user created but not linked to AppUser (network failure)  
**Detection**: `listOrphanedLinkedUsers()` finds orphan  
**Recovery**: `cleanupOrphanedLinkedUser()` removes it  
**Prevention**: Rollback logic in `linkAuthIdentity()` prevents this for most cases

### Scenario 2: Eventual Consistency Mismatch

**What can happen**: Firestore AppUser created but temporarily inaccessible (Firestore latency)  
**Detection**: Auth resolution re-checks on next session update  
**Recovery**: Automatic on next read; no owner action needed  
**Prevention**: Retry logic built into `_resolveAuthenticatedUser()`

### Scenario 3: Orphan Detection & Cleanup

**What can happen**: Orphaned auth user remains after failed linking  
**Detection**: Periodic `listOrphanedLinkedUsers()` check  
**Recovery**: Owner calls `cleanupOrphanedLinkedUser()`  
**Prevention**: Rollback prevents most cases; cleanup APIs handle rest

## Owner Responsibilities

This is an **intentional, observable, and supported recovery model**:

1. **Monitoring**: Check `listOrphanedLinkedUsers()` periodically (suggest: daily)
2. **Investigation**: Review `getLastAuthError()` for failure patterns
3. **Repair**: Use `cleanupOrphanedLinkedUser()` for identified orphans
4. **Prevention**: Ensure user retry logic is in place for failed invites

## Operational Guidelines

**Daily Checks**:

- Monitor auth error logs for patterns
- Track rate limit metrics

**Weekly Checks**:

- Run `listOrphanedLinkedUsers()` (expect empty or very small)
- Review session timeout events

**On Failures**:

- Check `getLastAuthError()` for infrastructure issues
- Check `getLastSessionTransitionError()` for state corruption
- Re-run cleanup if needed

## Design Rationale

Client-side systems cannot provide atomic Auth + Firestore transactions. This design accepts that constraint:

- **Explicit**: Errors are observable and actionable
- **Preventative**: Rollback logic prevents most orphaning
- **Recoverable**: APIs enable transparent repair
- **Operational**: Recovery is first-class, not hidden
