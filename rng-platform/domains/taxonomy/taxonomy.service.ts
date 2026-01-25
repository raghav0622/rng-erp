'use client';
import { clientDb } from '@/lib';
import { AbstractClientFirestoreRepository } from '@/rng-repository';
import { ITaxonomyService, Taxonomy } from './taxonomy.contract';

class TaxonomyRepository extends AbstractClientFirestoreRepository<Taxonomy> {
  constructor() {
    super(clientDb, {
      collectionName: 'taxonomies',
      softDelete: true,
      idStrategy: 'auto',
    });
  }
}
const taxonomyRepo = new TaxonomyRepository();

class TaxonomyService implements ITaxonomyService {
  private taxonomyRepo = taxonomyRepo;
  constructor() {
    this.listAllTaxonomies = this.listAllTaxonomies.bind(this);
    this.createTaxonomy = this.createTaxonomy.bind(this);
    this.getTaxonmy = this.getTaxonmy.bind(this);
    this.updateTaxonomy = this.updateTaxonomy.bind(this);
    this.bulkAddTaxonomyOptions = this.bulkAddTaxonomyOptions.bind(this);
    this.bulkDeleteTaxonomyOptions = this.bulkDeleteTaxonomyOptions.bind(this);
    this.addTaxonomyOption = this.addTaxonomyOption.bind(this);
    this.deleteTaxonomyOption = this.deleteTaxonomyOption.bind(this);
    this.updateTaxonomyOption = this.updateTaxonomyOption.bind(this);
    this.setTaxonomyUsage = this.setTaxonomyUsage.bind(this);
    this.getTaxonomyUsageCount = this.getTaxonomyUsageCount.bind(this);
  }

  async listAllTaxonomies() {
    return this.taxonomyRepo.find();
  }

  async createTaxonomy(name: string, description?: string): Promise<Taxonomy> {
    return this.taxonomyRepo.create({
      name,
      description,
      values: [],
    });
  }

  async getTaxonmy(name: string): Promise<Taxonomy | null> {
    const result = await this.taxonomyRepo.findOne({ where: [['name', '==', name]] });
    return result;
  }

  async updateTaxonomy(id: string, newDescription: string): Promise<Taxonomy> {
    return this.taxonomyRepo.update(id, { description: newDescription });
  }

  async bulkAddTaxonomyOptions(
    parentName: string,
    values: Pick<import('./taxonomy.contract').TaxonomyOption, 'value' | 'description'>[],
  ): Promise<Taxonomy> {
    const taxonomy = await this.getTaxonmy(parentName);
    if (!taxonomy) throw new Error('Taxonomy not found');
    const newOptions = values.map((v) => ({ ...v, usedCount: 0 }));
    return this.taxonomyRepo.update(taxonomy.id, {
      values: [...taxonomy.values, ...newOptions],
    });
  }

  async bulkDeleteTaxonomyOptions(taxonomyIds: string[]): Promise<Taxonomy> {
    // Remove all options whose value is in taxonomyIds from all taxonomies
    // (Assume taxonomyIds is a list of option values to remove)
    // This is a bit ambiguous, but we will remove options by value
    const all = await this.taxonomyRepo.find();
    let updated: Taxonomy | null = null;
    for (const t of all.data) {
      const filtered = t.values.filter((opt) => !taxonomyIds.includes(opt.value));
      if (filtered.length !== t.values.length) {
        updated = await this.taxonomyRepo.update(t.id, { values: filtered });
      }
    }
    if (!updated) throw new Error('No taxonomy options deleted');
    return updated;
  }

  async addTaxonomyOption(
    args: Omit<import('./taxonomy.contract').TaxonomyOption, 'usedByOtherEntites' | 'usedCount'>,
  ): Promise<Taxonomy> {
    // args must include value and optionally description
    // Find taxonomy by name (assume args has a taxonomyName property)
    const { value, description, taxonomyName } = args as any;
    if (!taxonomyName) throw new Error('taxonomyName required');
    const taxonomy = await this.getTaxonmy(taxonomyName);
    if (!taxonomy) throw new Error('Taxonomy not found');
    if (taxonomy.values.some((opt) => opt.value === value))
      throw new Error('Option already exists');
    return this.taxonomyRepo.update(taxonomy.id, {
      values: [...taxonomy.values, { value, description, usedCount: 0 }],
    });
  }

  async deleteTaxonomyOption(taxonomyId: string): Promise<Taxonomy> {
    // Remove option by value from all taxonomies
    const all = await this.taxonomyRepo.find();
    let updated: Taxonomy | null = null;
    for (const t of all.data) {
      const filtered = t.values.filter((opt) => opt.value !== taxonomyId);
      if (filtered.length !== t.values.length) {
        updated = await this.taxonomyRepo.update(t.id, { values: filtered });
      }
    }
    if (!updated) throw new Error('No taxonomy option deleted');
    return updated;
  }

  async updateTaxonomyOption(
    taxonomyId: string,
    newValue: string,
    newDescription: string,
  ): Promise<Taxonomy> {
    // taxonomyId is the option value to update
    const all = await this.taxonomyRepo.find();
    let updated: Taxonomy | null = null;
    for (const t of all.data) {
      const idx = t.values.findIndex((opt) => opt.value === taxonomyId);
      if (idx !== -1) {
        const newOptions = [...t.values];
        const oldOpt = newOptions[idx];
        if (!oldOpt) continue;
        newOptions[idx] = {
          value: newValue,
          description: newDescription,
          usedCount: oldOpt.usedCount,
          usedByOtherEntites: oldOpt.usedByOtherEntites,
        };
        updated = await this.taxonomyRepo.update(t.id, { values: newOptions });
      }
    }
    if (!updated) throw new Error('No taxonomy option updated');
    return updated;
  }

  async setTaxonomyUsage(taxonomyId: string): Promise<void> {
    // Increment usedCount for the option with value === taxonomyId
    const all = await this.taxonomyRepo.find();
    for (const t of all.data) {
      const idx = t.values.findIndex((opt) => opt.value === taxonomyId);
      if (idx !== -1) {
        const newOptions = [...t.values];
        const oldOpt = newOptions[idx];
        if (!oldOpt) continue;
        newOptions[idx] = {
          value: oldOpt.value,
          description: oldOpt.description,
          usedCount: (oldOpt.usedCount ?? 0) + 1,
          usedByOtherEntites: oldOpt.usedByOtherEntites,
        };
        await this.taxonomyRepo.update(t.id, { values: newOptions });
      }
    }
  }

  async getTaxonomyUsageCount(
    taxonomyId: string,
  ): Promise<import('./taxonomy.contract').TaxonomyOption> {
    // Find the option by value and return it
    const all = await this.taxonomyRepo.find();
    for (const t of all.data) {
      const opt = t.values.find((opt) => opt.value === taxonomyId);
      if (opt) return opt;
    }
    throw new Error('Taxonomy option not found');
  }
}

export const taxonomyService = new TaxonomyService();
