// RoleRepository contract for kernel (Phase 2)
import type { IRepository } from '../abstract-client-repository/types';
import type { RolePermissions } from '../domain/rbac/rbac.types';

export interface RoleRepository extends IRepository<RolePermissions> {
  getByRoleAndFeature(role: string, feature: string): Promise<RolePermissions | null>;
}
