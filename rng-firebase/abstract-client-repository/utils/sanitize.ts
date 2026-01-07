import { FieldValue } from 'firebase/firestore';

/**
 * Removes undefined values from an object.
 * Firestore does not support undefined values.
 */
export function sanitizeForWrite<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }

  if (data instanceof Date || data instanceof FieldValue) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForWrite(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const result: any = {};
    for (const key in data) {
      const value = (data as any)[key];
      if (value !== undefined) {
        result[key] = sanitizeForWrite(value);
      }
    }
    return result;
  }

  return data;
}
