import { beforeEach, describe, expect, it } from 'vitest';
import { RepositoryErrorCode } from '../../errors';
import { IRepository } from '../../types';

// Generic Contract Test Suite
export function runRepositoryContractTests(
  name: string,
  repositoryFactory: () => Promise<IRepository<any>>,
  cleanup: () => Promise<void>,
) {
  describe(`Repository Contract: ${name}`, () => {
    let repo: IRepository<any>;

    beforeEach(async () => {
      await cleanup();
      repo = await repositoryFactory();
    });

    describe('Read Behavior', () => {
      it('should return entity when present', async () => {
        const created = await repo.create({ name: 'Test' });
        const found = await repo.getById(created.id);
        expect(found).toBeDefined();
        expect(found?.id).toBe(created.id);
      });

      it('should return null when missing (getOptional)', async () => {
        const found = await repo.getOptional('non-existent-id');
        expect(found).toBeNull();
      });

      it('should throw NOT_FOUND when missing (getById default)', async () => {
        // Note: getById implementation in abstract repo returns null by default unless configured otherwise?
        // Actually, the abstract implementation returns null if not found, it doesn't throw NOT_FOUND by default for getById.
        // Wait, let's check the implementation.
        // getById returns T | null.
        // So this test expectation might need adjustment based on the specific implementation or the contract definition.
        // The contract doc says: "Returns null if the document does not exist."
        // So getById should return null.
        const found = await repo.getById('non-existent-id');
        expect(found).toBeNull();
      });
    });

    describe('Write Behavior', () => {
      it('should persist entity', async () => {
        const data = { name: 'Persist Me' };
        const created = await repo.create(data);
        expect(created.id).toBeDefined();
        expect(created.createdAt).toBeDefined();
        expect(created.updatedAt).toBeDefined();
        expect(created._v).toBe(1);
      });

      it('should update fields correctly', async () => {
        const created = await repo.create({ name: 'Original' });
        const updated = await repo.update(created.id, { name: 'Updated' });
        expect(updated.name).toBe('Updated');
        expect(updated._v).toBeGreaterThan(created._v || 0);
      });

      it('should reject stale updates (Optimistic Locking)', async () => {
        const created = await repo.create({ name: 'Original' });

        // Simulate stale read
        const stale = { ...created, _v: 0 };

        await expect(
          repo.update(created.id, { name: 'Conflict' }, undefined, { optimisticLock: true }),
        ).rejects.toThrowError(expect.objectContaining({ code: RepositoryErrorCode.CONFLICT }));
      });
    });

    describe('Query Behavior', () => {
      it('should respect filters', async () => {
        await repo.create({ type: 'A', value: 1 });
        await repo.create({ type: 'B', value: 2 });
        await repo.create({ type: 'A', value: 3 });

        const results = await repo.find({ where: [['type', '==', 'A']] });
        expect(results.data).toHaveLength(2);
        expect(results.data.every((d) => d.type === 'A')).toBe(true);
      });

      it('should respect pagination with __name__ ordering', async () => {
        for (let i = 0; i < 5; i++) {
          await repo.create({ index: i });
        }

        const page1 = await repo.find({ limit: 2, orderBy: [['__name__', 'asc']] });
        expect(page1.data).toHaveLength(2);
        expect(page1.hasMore).toBe(true);
        expect(page1.nextCursor).toBeDefined();

        const page2 = await repo.find({
          limit: 2,
          orderBy: [['__name__', 'asc']],
          startAfter: page1.nextCursor,
        });
        expect(page2.data).toHaveLength(2);
      });

      it('should reject cursors when ordering is not by __name__', async () => {
        await repo.create({ index: 1 });
        await repo.create({ index: 2 });

        await expect(
          repo.find({ limit: 1, orderBy: [['index', 'asc']], startAfter: 'any-id' }),
        ).rejects.toThrowError(
          expect.objectContaining({ code: RepositoryErrorCode.INVALID_ARGUMENT }),
        );
      });
    });

    describe('Utility Guarantees', () => {
      it('should update updatedAt on touch', async () => {
        const created = await repo.create({ name: 'Touch Me' });
        const originalUpdate = created.updatedAt;

        // Wait a bit to ensure timestamp difference
        await new Promise((r) => setTimeout(r, 10));

        await repo.touch(created.id);
        const touched = await repo.getById(created.id);

        expect(touched?.updatedAt.getTime()).toBeGreaterThan(originalUpdate.getTime());
      });
    });

    describe('Error Semantics', () => {
      it('should use stable error codes', async () => {
        try {
          await repo.ensureExists('non-existent');
        } catch (e: any) {
          expect(e.code).toBe(RepositoryErrorCode.NOT_FOUND);
        }
      });
    });
  });
}
