import { Timestamp } from 'firebase/firestore';

/**
 * Recursively converts Firestore Timestamps to Dates.
 */
export function convertTimestamps(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }

  if (data instanceof Timestamp) {
    return data.toDate();
  }

  if (Array.isArray(data)) {
    return data.map((item) => convertTimestamps(item));
  }

  if (typeof data === 'object') {
    // Handle special case where data might be a custom object with a toDate method that isn't a Timestamp
    // but we strictly check for Timestamp instance above.

    const result: any = {};
    for (const key in data) {
      result[key] = convertTimestamps(data[key]);
    }
    return result;
  }

  return data;
}
