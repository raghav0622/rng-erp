export interface ListUsersPaginatedResult {
  data: AppUser[];
  nextPageToken?: string;
  hasMore: boolean; // From abstract repo PaginatedResult
}

import { BaseEntity } from '@/rng-repository';

export type AppUserRole = 'owner' | 'manager' | 'employee' | 'client';

export type AppUserInviteStatus = 'invited' | 'activated' | 'revoked';
export interface ResendInvite {
  userId: string;
}

export interface RevokeInvite {
  userId: string;
}
export interface AppUser extends BaseEntity {
  name: string;
  email: string;
  role: AppUserRole;
  roleCategory?: string;
  roleUpdatedAt: Date;
  roleCategoryUpdatedAt?: Date;
  photoUrl?: string;
  emailVerified: boolean;
  isDisabled: boolean;
  inviteStatus: AppUserInviteStatus;
  inviteSentAt?: Date;
  inviteRespondedAt?: Date;
  isRegisteredOnERP: boolean;
  lastLoginAt?: Date;
}
export interface CreateInvitedUser {
  name: string;
  email: string;
  role: Exclude<AppUserRole, 'owner'>;
  roleCategory?: string;
  photoUrl?: string;
}
export interface CreateOwnerUser {
  authUid: string;
  name: string;
  email: string;
  role: 'owner';
  roleCategory?: string;
  photoUrl?: string;
}

export interface DeleteAppUser {
  userId: string;
}
export interface UpdateAppUserProfile {
  name?: string;
  photoUrl?: string;
}
export interface UpdateAppUserRole {
  role: AppUserRole;
  roleCategory?: string;
}
export interface UpdateAppUserStatus {
  isDisabled: boolean;
}
export interface IAppUserService {
  restoreUser(userId: string): Promise<AppUser>;
  searchUsers(query: Partial<AppUser>): Promise<AppUser[]>;
  reactivateUser(userId: string): Promise<AppUser>;
  resendInvite(data: ResendInvite): Promise<AppUser>;
  revokeInvite(data: RevokeInvite): Promise<AppUser>;
  createUser(data: CreateOwnerUser | CreateInvitedUser): Promise<AppUser>;
  updateUserProfile(userId: string, data: UpdateAppUserProfile): Promise<AppUser>;
  updateUserRole(userId: string, data: UpdateAppUserRole): Promise<AppUser>;
  updateUserStatus(userId: string, data: UpdateAppUserStatus): Promise<AppUser>;
  deleteUser(data: DeleteAppUser): Promise<void>;
  getUserById(userId: string): Promise<AppUser | null>;
  listUsers(): Promise<AppUser[]>;
  getUserByEmail(email: string): Promise<AppUser | null>;
  isOwnerBootstrapped(): Promise<boolean>;
  isSignupAllowed(): Promise<boolean>;
  listUsersPaginated(pageSize: number, pageToken?: string): Promise<ListUsersPaginatedResult>;
  deleteUserPermanently(userId: string): Promise<void>;
  updateEmailVerified(userId: string, emailVerified: boolean): Promise<AppUser>;
  updateLastLoginAt(userId: string): Promise<AppUser>;
}
