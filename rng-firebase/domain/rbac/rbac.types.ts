// RBAC domain types for Phase 2
import type { Role } from './role';

export type RBACInput = {
  userId: string;
  role: Role;
  feature: string;
  action: string;
};

export type RBACDecision = {
  allowed: boolean;
  reason: string;
};

export interface RolePermissions {
  role: Role;
  feature: string;
  actions: string[];
}

export interface Assignment {
  id: string;
  userId: string;
  feature: string;
  action: string;
  createdAt: number;
}
