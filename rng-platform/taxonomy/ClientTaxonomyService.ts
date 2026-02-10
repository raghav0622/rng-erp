/**
 * Simple, fast taxonomy service using AbstractClientFirestoreRepository.
 * Document ID = slug(name) for O(1) get-by-name. No history, no soft delete.
 */

import { clientDb } from '@/lib';
import type { Firestore } from 'firebase/firestore';
import {
  AbstractClientFirestoreRepository,
  RepositoryError,
  RepositoryErrorCode,
} from 'rng-repository';
import { slug } from './slug';
import type { ITaxonomyService, Taxonomy } from './taxonomy.types';

const LIST_LIMIT = 500;

export interface ClientTaxonomyServiceConfig {
  collectionName?: string;
}

/** Concrete repo for Taxonomy; used internally by ClientTaxonomyService. */
class TaxonomyRepository extends AbstractClientFirestoreRepository<Taxonomy> {
  constructor() {
    super(clientDb, {
      collectionName: 'taxonomies',
      softDelete: false,
      logging: false,
      enableHistory: false,
      idStrategy: 'deterministic',
      idGenerator: (data: Partial<Taxonomy>) => slug(data.name),
    });
  }
}

export class ClientTaxonomyService implements ITaxonomyService {
  private readonly repo: TaxonomyRepository;

  constructor(firestore: Firestore, config: ClientTaxonomyServiceConfig = {}) {
    this.repo = new TaxonomyRepository();
  }

  async internalOnly_initiateTaxonomy(name: string): Promise<Taxonomy> {
    const id = slug(name);
    if (!id) {
      throw new RepositoryError(
        'Taxonomy name must produce a non-empty slug',
        RepositoryErrorCode.INVALID_ARGUMENT,
      );
    }
    const existing = await this.repo.getById(id);
    if (existing) return existing;
    return this.repo.create({ name: name.trim(), values: [] });
  }

  async getTaxonomyByName(name: string): Promise<Taxonomy> {
    const id = slug(name);
    const t = await this.repo.getById(id);
    if (!t) {
      throw new RepositoryError(`Taxonomy not found: ${name}`, RepositoryErrorCode.NOT_FOUND);
    }
    return t;
  }

  async getTaxonomyByNameOptional(name: string): Promise<Taxonomy | null> {
    const id = slug(name);
    return this.repo.getById(id);
  }

  async getTaxonomyById(id: string): Promise<Taxonomy> {
    const t = await this.repo.getById(id);
    if (!t) {
      throw new RepositoryError(`Taxonomy not found: ${id}`, RepositoryErrorCode.NOT_FOUND);
    }
    return t;
  }

  async updateTaxonomyValues(id: string, values?: string[]): Promise<Taxonomy> {
    return this.repo.update(id, { values: values ?? [] });
  }

  async deleteTaxonomy(id: string): Promise<void> {
    await this.repo.delete(id);
  }

  async listTaxonomies(): Promise<Taxonomy[]> {
    const result = await this.repo.find({
      orderBy: [['name', 'asc']],
      limit: LIST_LIMIT,
    });
    return result.data ?? [];
  }

  /** Learning: ensure taxonomy exists, add value if not already present. Value is trimmed. */
  async addValueToTaxonomy(name: string, value: string): Promise<Taxonomy> {
    // #region agent log
    if (typeof fetch !== 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'ClientTaxonomyService.ts:addValueToTaxonomy:entry',
          message: 'addValueToTaxonomy entry',
          data: { name, value },
          timestamp: Date.now(),
          hypothesisId: 'D',
        }),
      }).catch(() => {});
    }
    // #endregion
    const trimmed = value.trim();
    if (!trimmed) {
      throw new RepositoryError(
        'Taxonomy value must be non-empty after trim',
        RepositoryErrorCode.INVALID_ARGUMENT,
      );
    }
    let taxonomy: Taxonomy;
    try {
      taxonomy = await this.internalOnly_initiateTaxonomy(name);
    } catch (err) {
      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'ClientTaxonomyService.ts:addValueToTaxonomy:initiateError',
            message: 'initiateTaxonomy error',
            data: {
              errorMessage: err instanceof Error ? err.message : String(err),
              code: (err as { code?: string })?.code ?? null,
            },
            timestamp: Date.now(),
            hypothesisId: 'F',
          }),
        }).catch(() => {});
      }
      // #endregion
      throw err;
    }
    const values = taxonomy.values ?? [];
    if (values.includes(trimmed)) return taxonomy;
    const next = [...values, trimmed].sort((a, b) => a.localeCompare(b));
    try {
      const updated = await this.updateTaxonomyValues(taxonomy.id, next);
      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'ClientTaxonomyService.ts:addValueToTaxonomy:success',
            message: 'addValueToTaxonomy success',
            data: { id: updated.id, valuesLength: updated.values?.length },
            timestamp: Date.now(),
            hypothesisId: 'E',
          }),
        }).catch(() => {});
      }
      // #endregion
      return updated;
    } catch (err) {
      // #region agent log
      if (typeof fetch !== 'undefined') {
        fetch('http://127.0.0.1:7242/ingest/18656cd5-67ad-4cc7-82a4-b01dcb979455', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            location: 'ClientTaxonomyService.ts:addValueToTaxonomy:updateError',
            message: 'updateTaxonomyValues error',
            data: {
              errorMessage: err instanceof Error ? err.message : String(err),
              code: (err as { code?: string })?.code ?? null,
            },
            timestamp: Date.now(),
            hypothesisId: 'F',
          }),
        }).catch(() => {});
      }
      // #endregion
      throw err;
    }
  }
}
