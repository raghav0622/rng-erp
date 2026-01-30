# Diagrams (ASCII Only)

## Auth Resolution Flow

```
[Firebase Auth State]
        |
        v
[handleAuthStateChanged]
        |
        v
[_resolveAuthenticatedUser]
        |
        +--> invariant checks
        |
        +--> emailVerified sync (best-effort)
        |
        v
[setSession]
```

## Invite Signup Flow (with failures)

```
[Invite Exists?] --no--> [InviteInvalidError]
       |
      yes
       v
[Create Firebase Auth User]
       |
       +--fail--> [Map Firebase Error]
       v
[Link authUid to AppUser]
       |
       +--fail--> [Delete Auth User] -> [Error]
       v
[Activate Invite]
       |
       +--fail--> [Orphaned AppUser] -> [Owner Cleanup]
       v
[Resolved Authenticated Session]
```

## Identity Linking Flow

```
[Invited AppUser]
       |
       v
[linkAuthIdentity]
       |
       v
[AppUser id = authUid]
```

## Session Transition Graph

```
unknown -> unauthenticated
unknown -> authenticating
unknown -> authenticated
unauthenticated -> authenticating
unauthenticated -> unauthenticated
authenticating -> authenticated
authenticating -> unauthenticated
authenticated -> unauthenticated
authenticated -> authenticated
```
