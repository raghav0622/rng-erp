/**
 * Singleton access to ClientTaxonomyService for use in hooks.
 * Uses client Firestore from lib so the app has a single shared instance.
 */

import { clientDb } from '@/lib';
import { ClientTaxonomyService } from './ClientTaxonomyService';

let instance: ClientTaxonomyService | null = null;

export function getTaxonomyService(): ClientTaxonomyService {
  if (!instance) {
    instance = new ClientTaxonomyService(clientDb);
  }
  return instance;
}
