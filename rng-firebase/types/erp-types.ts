// ERP Core Types for Auth + RBAC v2 + Profile + Teams

export type Role = 'owner' | 'manager' | 'employee' | 'client';

export type AuthStatus =
  | 'unauthenticated'
  | 'signup_allowed_owner'
  | 'invited'
  | 'authenticated'
  | 'verified'
  | 'disabled';

import type { BaseEntity } from '../abstract-client-repository/types';

export type User = BaseEntity & {
  email: string;
  displayName: string;
  photoURL?: string;
  role: Role;
  lifecycle: 'invited' | 'active' | 'disabled';
  isEmailVerified: boolean;
  isActive: boolean;
};

export type Team = BaseEntity & {
  name: string;
};

export type TeamMember = BaseEntity & {
  userId: string;
  teamId: string;
  role: 'manager' | 'employee';
};

export type AuditEvent = {
  actorUid: string;
  actorRole: Role;
  action: string;
  targetUid?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
};

export type RBACInput = {
  role: Role;
  resource: string;
  action: string;
  context?: {
    teamId?: string;
    isAssigned?: boolean;
  };
};
