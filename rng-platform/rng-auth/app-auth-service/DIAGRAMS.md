# Diagrams (ASCII Only)

**Status**: ✅ VERIFIED FLOWS  
**Last Audited**: January 30, 2026

## Auth Resolution Flow (Every Auth State Change)

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
│ setSession()                    │
│ (Validate transition, apply)    │
│ (BUG #12 FIX: Deep clone)       │
└──────────────┬──────────────────┘
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
│ linkAuthIdentity() (BUG #23 ROLLBACK FIX)  │
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

## Identity Linking Flow (with Rollback)

```
┌──────────────────────────────────────────────┐
│ linkAuthIdentity(userId, authUid)            │
│ (Converts invite → authenticated user)       │
│ (BUG #23: Rollback on soft-delete failure)   │
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
    [AppUser now has]
    [id=authUid]
```

## Session Expiry Check (Dual Layer - BUG #27 FIX)

```
┌─────────────────────────────────────────────┐
│ Background Timer (Every 5 seconds)          │
│ (BUG #27: Stops when logged out)            │
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
│ (BUG #12: Deep clone returned)              │
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

## Session Transition Graph (All Valid Transitions)

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
        │   auth  │  │   unauth │  │  authen     │
        │ enticati│  │enticated │  │ticating    │
        │ ng      │  │          │  │             │
        └────┬────┘  └──────────┘  └─────────────┘
             │           ^  │           ^  │
             └───────────┘  │           │  │
             (on success)   └───────────┘  │
                            (on failure)   │
                                           └──────┐
                                                  |
                                         [On page reload
                                          or logout]

Invalid: Cannot go directly unauthenticated → authenticated
Invalid: Cannot go directly authenticating → unknown
```
