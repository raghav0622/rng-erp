import { DocumentSnapshot } from 'firebase/firestore';

export function encodeCursor(snapshot: DocumentSnapshot): string {
  return snapshot.id;
}

// In a real implementation, we might need to serialize the actual values used in orderBy
// For simple pagination by ID or when we have the document snapshot, we pass the snapshot directly to startAfter
// However, to pass a cursor to the client, we usually serialize the last document's ID or sort values.
// Since Firestore SDK requires the actual DocumentSnapshot or the field values for startAfter,
// and we want to keep the repository abstraction clean, we might return an opaque string.
//
// For this implementation, we will assume the client passes back the ID or a base64 encoded string of values.
// But strictly speaking, to use `startAfter` with a string, it implies ordering by ID or that the string is the value of the ordered field.
//
// To make it robust for the client:
// We will return the ID as the cursor. When the client provides it back, we might need to fetch the document
// or use the ID if the query is ordered by ID.
//
// A common pattern is to return the ID.
// If complex ordering is used, we might need to return a base64 encoded JSON of the order fields.

export function serializeCursor(data: any[]): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function deserializeCursor(cursor: string): any[] {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
  } catch (e) {
    return [];
  }
}
