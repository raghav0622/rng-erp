import { clientDb } from '../../../lib/firebase-client';
import { AbstractClientFirestoreRepository } from '../abstract-client-repository/AbstractClientFirestoreRepository';
import type { Team } from '../types/erp-types';


export class TeamRepository extends AbstractClientFirestoreRepository<Team> {
  constructor() {
    super(clientDb, {
      collectionName: 'teams',
      softDelete: false,
      enableDiagnostics: true,
    });
  }
}

export const teamRepository = new TeamRepository();
