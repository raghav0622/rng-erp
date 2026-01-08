import type { Firestore } from 'firebase/firestore';
import { AbstractClientFirestoreRepository } from '../abstract-client-repository/AbstractClientFirestoreRepository';
import type { TeamMember } from '../types/erp-types';
import { clientDb } from '../../../lib/firebase-client';


export class TeamMemberRepository extends AbstractClientFirestoreRepository<TeamMember> {
  constructor() {
    super(clientDb, {
      collectionName: 'teamMembers',
      softDelete: false,
      enableDiagnostics: true,
    });
  }
}
}
export const teamMemberRepository = new TeamMemberRepository();
