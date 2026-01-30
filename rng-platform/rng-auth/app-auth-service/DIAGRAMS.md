# Diagrams (ASCII Only - Frozen v1)

**Status**: ✅ LOCKED (FINAL)  
**Format**: ASCII diagrams only  
**Purpose**: Document actual flow (not historical issues)

## Auth Resolution Flow

```
[Firebase Auth State Changed]
        |
        v
┌─────────────────────────────────┐
│ withAuthOperation() Wrapper      │
│ (Serialize mutations, timeout)   │
└──────────────┬──────────────────┘
               |
               v
┌─────────────────────────────────┐
│ handleAuthStateChanged           │
│ (Queue if mutation in progress)  │
└──────────────┬──────────────────┘
               |
               v
┌─────────────────────────────────┐
│ _resolveAuthenticatedUser        │
│ (Retry failed Firestore reads)   │
└──────────────┬──────────────────┘
               |
      ┌────────┼────────┐
      |        |        |
      v        v        v
  [Check]  [Verify] [Sync]
  Orphan   AuthUid  Email
           Match    Verified

      |
      v
┌─────────────────────────────────┐
│ setSession()                │
│ (Validate transition)       │
│ (Apply session state)       │
└──────────────┬──────────────┘
               |
               v
       [Broadcast to Listeners]
```

## Invite Signup Flow (with Rollback Protection)

```
[User Calls signupWithInvite()]
       |
       v
[withAuthOperation Wrapper]
       |
       v
[Check Invite Exists & Valid]
       |
       +--no--> [InviteInvalidError]
       |
      yes
       v
[Create Firebase Auth User]
       |
       +--fail--> [Map Firebase Error]
       |
      success
       v
┌─────────────────────────────────────────────┐
│ linkAuthIdentity() - Rollback Protected     │
│ Step 1: Create disabled copy with authUid  │
│ Step 2: Soft-delete original invite        │
│ Step 3: If Step 2 fails, ROLLBACK:         │
│         Delete newly created disabled user │
└──────────────┬──────────────────────────────┘
               |
       ┌───────┴────────┐
       |                |
   success      [On Failure]
       |                |
       v                v
[Activate       [Delete
 Invite]        Auth User]
       |                |
       v                v
[Set            [Error]
inviteStatus
='activated']
       |
       v
[Enable User]
       |
       v
[Send Email Verification]
(Non-fatal if fails)
       |
       v
[Return Authenticated Session]
```

## Identity Linking Flow (Rollback Protected)

```
┌──────────────────────────────────────────────┐
│ linkAuthIdentity(userId, authUid)            │
│ (Convert invite to authenticated user)       │
│ (Includes rollback on soft-delete failure)   │
└────────────────┬─────────────────────────────┘
                 |
                 v
        ┌────────────────┐
        │ STEP 1         │
        │ Create         │
        │ Disabled Copy  │
        │ id=authUid     │
        └────────┬───────┘
                 |
                 ├──fail──> [Error]
                 |
                 v
        ┌────────────────┐
        │ STEP 2         │
        │ Soft-Delete    │
        │ Original (id)  │
        └────────┬───────┘
                 |
                 ├──fail──> [ROLLBACK]
                 |          Delete new
                 |          disabled user
                 |          then Error
                 |
                 v
        ┌────────────────┐
        │ STEP 3         │
        │ Verify Both    │
        │ Records        │
        └────────┬───────┘
                 |
                 v
    [Linking Complete]
    [AppUser linked to authUid]
```

## Session Expiry Check (Dual Layer)

```
┌─────────────────────────────────────────────┐
│ Background Timer (Every 5 seconds)          │
│ (Stops when logged out)                     │
└────────────────┬────────────────────────────┘
                 |
        ┌────────┴─────────┐
        |                  |
   [state !=          [state ==
   authenticated]     authenticated]
        |                  |
        v                  v
  [Stop Timer]      [Check if expired]
  [Return]               |
                    ┌─────┴─────┐
                    |           |
              [Expired]    [Not Expired]
                    |           |
                    v           v
              [Logout]     [Continue]


AND

┌─────────────────────────────────────────────┐
│ getSessionSnapshot() (On UI Render)         │
│ (Deep clone returned)                       │
└────────────────┬────────────────────────────┘
                 |
          [Check if expired]
                 |
            ┌────┴────┐
            |         |
        [Expired] [Not Expired]
            |         |
            v         v
    [Return      [Return
     unauthenticated  authenticated
     snapshot]        snapshot]
```

## Session State Machine (Valid Transitions Only)

```
                     ┌─────────────────────┐
                     │     unknown         │
                     │  (Initial State)    │
                     └────┬────────────────┘
                          |
             ┌────────────┼────────────┐
             │            │            │
             v            v            v
        ┌─────────┐  ┌──────────┐  ┌─────────────┐
        │ auth-   │  │unauth-   │  │authen-      │
        │ticating │  │enticated │  │ticating     │
        └────┬────┘  └──────────┘  └─────────────┘
             │           ^  │           ^  │
             └───────────┘  │           │  │
             (on success)   └───────────┘  │
                            (on failure)   │
                                           └──────┐
                                                  |
                                         [On logout/reload]
```
