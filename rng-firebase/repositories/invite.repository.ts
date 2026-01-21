// invite.repository.ts
// Contract for InviteRepository (internal, not public kernel surface)
import type { IRepository } from '../abstract-client-repository/types';
import type { Invite } from '../domain/auth/auth.types';

export interface InviteRepository extends IRepository<Invite> {
  create(invite: Omit<Invite, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invite>;
  findByEmail(email: string): Promise<Invite | null>;
  markAccepted(inviteId: string): Promise<void>;
  revoke(inviteId: string): Promise<void>;
  expire(inviteId: string): Promise<void>;
}
