import { FieldValue } from 'firebase/firestore';

/**
 * Flattens an object into dot notation for Firestore updates.
 * e.g. { a: { b: 1 } } -> { 'a.b': 1 }
 * Arrays and FieldValues are not flattened.
 */
export function flattenForUpdate(obj: any, prefix = ''): Record<string, any> {
  const result: Record<string, any> = {};

  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;

      if (
        value &&
        typeof value === 'object' &&
        !Array.isArray(value) &&
        !(value instanceof Date) &&
        !(value instanceof FieldValue) &&
        Object.keys(value).length > 0
      ) {
        const flattened = flattenForUpdate(value, newKey);
        Object.assign(result, flattened);
      } else {
        result[newKey] = value;
      }
    }
  }

  return result;
}
