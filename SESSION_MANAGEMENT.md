# Server-Side Session Management

This project uses `next-firebase-auth-edge` to implement server-side session management with cookies. This eliminates the flash of unauthorized pages during navigation.

## How It Works

1. **Client-Side Auth**: Firebase Auth handles user authentication on the client
2. **Token Sync**: After successful sign-in, the ID token is synced to a server-side cookie via `/api/login`
3. **Middleware**: Every request is checked by middleware BEFORE any page renders
4. **Cookie Validation**: Middleware validates the session cookie and redirects if needed
5. **Auto-Refresh**: Middleware automatically refreshes expired tokens

## Architecture

```
┌─────────────────┐
│  User Signs In  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ Firebase Auth (Client)  │
│ signInWithEmail...()    │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Get ID Token           │
│  firebaseUser.getIdToken│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  POST /api/login        │
│  { idToken }            │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Set Session Cookie     │
│  (httpOnly, signed)     │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  User Navigates         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Middleware Checks      │
│  - Validates cookie     │
│  - Verifies with Admin  │
│  - Refreshes if needed  │
│  - Redirects if invalid │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Page Renders           │
│  (no flash!)            │
└─────────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Firebase Admin SDK (for server-side token verification)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@...
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Session Cookie Settings
SESSION_COOKIE_NAME=rng_session
SESSION_COOKIE_MAX_AGE_DAYS=5

# Cookie Signing Secrets (generate with scripts/generate-cookie-secrets.ts)
COOKIE_SECRET_CURRENT=your_secure_random_string
COOKIE_SECRET_PREVIOUS=optional_for_rotation
```

### Generate Cookie Secrets

```bash
npx tsx scripts/generate-cookie-secrets.ts
```

## Files

- [lib/firebase-auth-edge.ts](lib/firebase-auth-edge.ts) - Server and client config for next-firebase-auth-edge
- [middleware.ts](middleware.ts) - Edge middleware that validates all requests
- [app/api/login/route.ts](app/api/login/route.ts) - Sets session cookie from ID token
- [app/api/logout/route.ts](app/api/logout/route.ts) - Clears session cookie
- [app-auth.service.ts](rng-platform/rng-auth/app-auth-service/app-auth.service.ts) - Syncs tokens to cookies on auth state changes

## Security Features

- **httpOnly cookies**: JavaScript cannot access the session cookie
- **Signed cookies**: Tamper-proof using crypto signatures
- **Secure flag**: HTTPS-only in production
- **SameSite=lax**: CSRF protection
- **Auto-refresh**: Expired tokens refreshed automatically
- **Secret rotation**: Support for rotating cookie secrets without breaking sessions

## Path Configuration

### Public Paths (no auth required)

- `/signin`
- `/owner-bootstrap`
- `/signup-with-invite`
- `/forgot-password`
- `/reset-password`

### Authenticated Paths (require valid session)

- `/dashboard`
- `/profile`

If an authenticated user tries to access a public path, they are redirected to `/dashboard`.
If an unauthenticated user tries to access an authenticated path, they are redirected to `/signin`.

## Middleware Matcher

The middleware runs on all routes EXCEPT:

- `/_next/*` - Next.js internals
- `/api/login` - Login endpoint (would cause loop)
- `/api/logout` - Logout endpoint (would cause loop)
- `/favicon.ico` - Static file
- Files with extensions (e.g., `/image.png`, `/script.js`)

## Testing

1. Sign in at `/signin`
2. Verify cookie is set in DevTools → Application → Cookies
3. Navigate to `/dashboard` - should load immediately without flash
4. Try accessing `/signin` while authenticated - should redirect to `/dashboard`
5. Sign out
6. Try accessing `/dashboard` - should redirect to `/signin`
7. Refresh page while signed in - session persists, no flash

## Troubleshooting

### "Still seeing flash of unauthorized page"

- Ensure middleware matcher is correct
- Check that COOKIE_SECRET_CURRENT is set in .env
- Verify cookie is being set (DevTools → Application → Cookies)
- Check middleware logs in terminal for validation errors

### "Authentication loop (redirecting repeatedly)"

- Ensure /api/login and /api/logout are excluded from middleware matcher
- Check that PUBLIC_PATHS don't overlap with AUTHENTICATED_PATHS
- Verify Firebase Admin SDK credentials are correct

### "Cookie not being set"

- Check that /api/login is receiving the ID token
- Verify SESSION_COOKIE_NAME is consistent across all config files
- Ensure response is not blocked by CORS or CSP

### "Token expired" errors

- Middleware should auto-refresh - check Firebase Admin SDK credentials
- Verify SESSION_COOKIE_MAX_AGE_DAYS is reasonable (default: 5 days)
- Check system clock is correct (token timestamps are sensitive)
