# Invite Flow (Client-Side)

## Lifecycle

1. Owner creates invite (AppUser with `inviteStatus='invited'`).
2. User signs up with invite credentials.
3. Auth user is created in Firebase.
4. Auth identity is linked to AppUser.
5. Invite is activated and AppUser is registered.

## Non-Atomic Sections (Explicit)

- Linking Auth + Firestore is non-atomic.
- Activation after linking is non-atomic.

## Partial Failure Points

- Auth user created but AppUser not linked.
- AppUser linked but activation fails.
- Invite revoked concurrently with linking.

## Why This Is Acceptable

This system is client-only. Partial failures are expected and are handled via explicit recovery tools.

## Owner Recovery

Owners can identify and clean orphaned users using maintenance APIs. This is a designed operational workflow.
