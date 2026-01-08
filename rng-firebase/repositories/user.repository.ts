// UserRepository contract for kernel (Phase 1)
import type { IRepository } from '../abstract-client-repository/types';
import type { User } from '../domain/user/contract';

export interface UserRepository extends IRepository<User> {
  getById(id: string): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  count(): Promise<number>;
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
  update(id: string, patch: Partial<User>): Promise<User>;
}
