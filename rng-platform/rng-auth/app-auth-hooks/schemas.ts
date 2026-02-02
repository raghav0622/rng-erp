import { z } from 'zod';
import type {
  AppUser,
  CreateInvitedUser,
  UpdateAppUserProfile,
  UpdateAppUserRole,
  UpdateAppUserStatus,
} from '../app-auth-service/internal-app-user-service/app-user.contracts';

/**
 * Zod schemas for all auth hooks with user input.
 * Schemas EXACTLY match service method input shapes.
 * No UI-only fields, no defaults, no transformations.
 * Used by forms and hooks for validation.
 */

// Authentication flows
export const ownerSignUpSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  photoUrl: z.string().optional(),
});
export type OwnerSignUpInput = z.infer<typeof ownerSignUpSchema>;

export const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});
export type SignInInput = z.infer<typeof signInSchema>;

export const confirmPasswordResetSchema = z.object({
  code: z.string().min(1, 'Reset code is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
export type ConfirmPasswordResetInput = z.infer<typeof confirmPasswordResetSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const confirmPasswordSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});
export type ConfirmPasswordInput = z.infer<typeof confirmPasswordSchema>;

export const signUpWithInviteSchema = z
  .object({
    email: z.string().email('Invalid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
        'Password must contain uppercase, lowercase, number, and special character',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });
export type SignUpWithInviteInput = z.infer<typeof signUpWithInviteSchema>;

// Email
export const sendPasswordResetEmailSchema = z.object({
  email: z.string().email('Invalid email address'),
});
export type SendPasswordResetEmailInput = z.infer<typeof sendPasswordResetEmailSchema>;

// User management
export const inviteUserSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  role: z.enum(['manager', 'employee', 'client'] as const),
  roleCategory: z.string().optional(),
  photoUrl: z.string().optional(),
}) satisfies z.ZodType<CreateInvitedUser>;
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const resendInviteSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  options: z.object({ force: z.boolean().optional() }).optional(),
}) satisfies z.ZodType<{ userId: string; options?: { force?: boolean } }>;
export type ResendInviteInput = z.infer<typeof resendInviteSchema>;

export const revokeInviteSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
export type RevokeInviteInput = z.infer<typeof revokeInviteSchema>;

// Profile updates
export const updateOwnerProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  photoUrl: z.string().optional(),
}) satisfies z.ZodType<{ name?: string; photoUrl?: string }>;
export type UpdateOwnerProfileInput = z.infer<typeof updateOwnerProfileSchema>;

export const updateUserProfileSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  data: z.object({
    name: z.string().min(1).optional(),
    photoUrl: z.string().optional(),
  }) satisfies z.ZodType<UpdateAppUserProfile>,
});
export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export const updateUserPhotoSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  photo: z
    .union([
      z.instanceof(File),
      z.string(), // base64 or URL
      z.undefined(),
    ])
    .optional(),
}) satisfies z.ZodType<{ userId: string; photo?: File | string | undefined }>;
export type UpdateUserPhotoInput = z.infer<typeof updateUserPhotoSchema>;

// Role & status
export const updateUserRoleSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  data: z.object({
    role: z.enum(['owner', 'manager', 'employee', 'client'] as const),
    roleCategory: z.string().optional(),
  }) satisfies z.ZodType<UpdateAppUserRole>,
});
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;

export const updateUserStatusSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  data: z.object({
    isDisabled: z.boolean(),
  }) satisfies z.ZodType<UpdateAppUserStatus>,
});
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;

// User lifecycle
export const deleteUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
export type DeleteUserInput = z.infer<typeof deleteUserSchema>;

export const restoreUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
export type RestoreUserInput = z.infer<typeof restoreUserSchema>;

export const reactivateUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
export type ReactivateUserInput = z.infer<typeof reactivateUserSchema>;

// Orphan cleanup
export const cleanupOrphanedUserSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});
export type CleanupOrphanedUserInput = z.infer<typeof cleanupOrphanedUserSchema>;

// Search - query is Partial<AppUser>, accepts any subset of user fields
export const searchUsersSchema = z.object({
  id: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
  role: z.enum(['owner', 'manager', 'employee', 'client']).optional(),
  roleCategory: z.string().optional(),
  photoUrl: z.string().optional(),
  emailVerified: z.boolean().optional(),
  isDisabled: z.boolean().optional(),
  inviteStatus: z.enum(['invited', 'activated', 'revoked']).optional(),
  isRegisteredOnERP: z.boolean().optional(),
}) satisfies z.ZodType<Partial<AppUser>>;
export type SearchUsersInput = z.infer<typeof searchUsersSchema>;
