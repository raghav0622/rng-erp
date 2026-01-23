// Since I cannot assume lodash is installed, I will implement a simple diff or rely on the caller.
// Actually, for `calculateDiff` used in hooks, we might just want to know what changed.

export function calculateDiff<T>(prev: T, next: T): Partial<T> {
  const diff: any = {};

  // Simple shallow diff for top level keys, or deep diff?
  // For Firestore updates, we usually care about what fields are being sent in the update payload.
  // But if we are comparing two full objects (before and after), we need to find differences.

  // If we don't have lodash, let's do a basic key comparison.
  // This is a simplified version.

  const allKeys = new Set([
    ...Object.keys((prev as any) || {}),
    ...Object.keys((next as any) || {}),
  ]);

  for (const key of allKeys) {
    const p = (prev as any)[key];
    const n = (next as any)[key];

    if (JSON.stringify(p) !== JSON.stringify(n)) {
      diff[key] = n;
    }
  }

  return diff;
}
