import { globalLogger } from './logger';
import { EncryptionStrategy } from '../types';

export function applyEncryption(data: any, fields: string[], strategy: EncryptionStrategy): any {
  if (!strategy || !fields || fields.length === 0) {
    return data;
  }

  const result = { ...data };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      result[field] = strategy.encrypt(result[field]);
    }
  }

  return result;
}

export function applyDecryption(data: any, fields: string[], strategy: EncryptionStrategy): any {
  if (!strategy || !fields || fields.length === 0) {
    return data;
  }

  const result = { ...data };

  for (const field of fields) {
    if (result[field] && typeof result[field] === 'string') {
      try {
        result[field] = strategy.decrypt(result[field]);
      } catch (e) {
        // Fail open or log error?
        // If decryption fails, we might return the original value or null.
        // For now, let's keep original value to avoid data loss in UI, but it will be encrypted garbage.
        globalLogger.error(`Failed to decrypt field ${field}`, { error: e });
      }
    }
  }

  return result;
}
