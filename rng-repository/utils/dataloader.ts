/**
 * A simple DataLoader-like implementation for batching requests.
 */
export class SimpleDataLoader<K, V> {
  private queue: {
    key: K;
    resolve: (value: V | PromiseLike<V>) => void;
    reject: (reason?: any) => void;
  }[] = [];
  private timeout: NodeJS.Timeout | null = null;
  private batchLoadFn: (keys: K[]) => Promise<(V | Error)[]>;
  private options: { maxBatchSize: number; delay: number };
  private cache = new Map<K, Promise<V>>();

  constructor(
    batchLoadFn: (keys: K[]) => Promise<(V | Error)[]>,
    options: { maxBatchSize?: number; delay?: number } = {},
  ) {
    this.batchLoadFn = batchLoadFn;
    this.options = {
      maxBatchSize: options.maxBatchSize || 100, // Firestore limit is usually 10 for 'in' queries, but we can split batches
      delay: options.delay || 10,
    };
  }

  load(key: K): Promise<V> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const promise = new Promise<V>((resolve, reject) => {
      this.queue.push({ key, resolve, reject });

      if (this.queue.length >= this.options.maxBatchSize) {
        this.dispatch();
      } else if (!this.timeout) {
        this.timeout = setTimeout(() => this.dispatch(), this.options.delay);
      }
    });

    this.cache.set(key, promise);
    return promise;
  }

  loadMany(keys: K[]): Promise<V[]> {
    return Promise.all(keys.map((k) => this.load(k)));
  }

  clear(key: K): void {
    this.cache.delete(key);
  }

  clearAll(): void {
    this.cache.clear();
  }

  private async dispatch() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    const batch = this.queue.splice(0, this.options.maxBatchSize);
    if (batch.length === 0) return;

    const keys = batch.map((item) => item.key);

    try {
      const results = await this.batchLoadFn(keys);

      if (results.length !== keys.length) {
        // Kernel-level invariant violation
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { KernelInvariantViolationError } = require('../../kernel-errors');
        throw new KernelInvariantViolationError(
          'Batch loader must return same number of results as keys',
        );
      }

      batch.forEach((item, index) => {
        const result = results[index];
        if (result instanceof Error) {
          item.reject(result);
        } else {
          // We know result is defined because we checked length above
          item.resolve(result!);
        }
      });
    } catch (error) {
      batch.forEach((item) => item.reject(error));
    }

    // If there are more items in the queue (because we took maxBatchSize), schedule another dispatch
    if (this.queue.length > 0) {
      this.timeout = setTimeout(() => this.dispatch(), this.options.delay);
    }
  }
}
