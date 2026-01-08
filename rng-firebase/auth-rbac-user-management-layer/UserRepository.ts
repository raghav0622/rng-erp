import { clientDb } from '@/lib';
import { AbstractClientFirestoreRepository } from '../abstract-client-repository/AbstractClientFirestoreRepository';
import type { User } from '../types/erp-types';


export class UserRepository extends AbstractClientFirestoreRepository<User> {
  constructor() {
    super(clientDb, {
      collectionName: 'users',
      softDelete: true,
      enableDiagnostics: true,
    });
  }
}

export const userRepository = new UserRepository();
