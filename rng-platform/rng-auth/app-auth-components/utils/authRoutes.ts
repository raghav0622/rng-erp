/**
 * Utility: Type-safe route builders
 * Single source of truth for auth-related routes
 *
 * @example
 * router.push(authRoutes.userDetail(userId));
 * router.push(authRoutes.userEdit(userId));
 */

export const authRoutes = {
  // Public routes
  signin: '/auth/signin',
  signup: '/auth/signup',
  forgotPassword: '/auth/forgot-password',
  resetPassword: (code: string) => `/auth/reset-password?code=${code}`,
  ownerBootstrap: '/auth/owner-bootstrap',

  // User directory
  userDirectory: '/users',
  userSearch: (query?: string) => (query ? `/users/search?q=${query}` : '/users/search'),

  // User detail & actions
  userDetail: (id: string) => `/users/${id}`,
  userEdit: (id: string) => `/users/${id}/edit`,
  userRole: (id: string) => `/users/${id}/role`,
  userStatus: (id: string) => `/users/${id}/status`,
  userDelete: (id: string) => `/users/${id}/delete`,
  userRestore: (id: string) => `/users/${id}/restore`,
  userResendInvite: (id: string) => `/users/${id}/resend-invite`,
  userRevokeInvite: (id: string) => `/users/${id}/revoke-invite`,
  userReactivate: (id: string) => `/users/${id}/reactivate`,

  // Admin
  inviteUser: '/admin/invite',
  orphanedUsers: '/admin/orphaned-users',

  // Profile
  profile: '/profile',
  changePassword: '/profile/change-password',
  emailVerification: '/profile/email-verification',
};
