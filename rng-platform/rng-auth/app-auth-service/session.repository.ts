import { clientDb } from '@/lib';
import { AbstractClientFirestoreRepository } from '@/rng-repository';
import type { UserSession } from './session-tracking.types';

/**
 * Session repository for managing user sessions in Firestore.
 * Tracks active sessions across multiple devices for instant logout functionality.
 */
class SessionRepository extends AbstractClientFirestoreRepository<UserSession> {
  constructor() {
    super(clientDb, {
      collectionName: 'sessions',
      softDelete: false, // Sessions are hard-deleted when they expire
      idStrategy: 'auto', // Auto-generate session IDs
    });
  }

  /**
   * Get all active (non-revoked, non-expired) sessions for a user
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    const now = new Date();
    const result = await this.find({
      where: [
        ['userId', '==', userId],
        ['revoked', '==', false],
        ['expiresAt', '>', now],
      ],
      limit: 100, // Safety limit
    });
    return result.data;
  }

  /**
   * Revoke all active sessions for a user
   */
  async revokeAllSessions(userId: string): Promise<number> {
    const sessions = await this.getActiveSessions(userId);
    const revokedAt = new Date();

    let revokedCount = 0;
    for (const session of sessions) {
      await this.update(session.id, {
        revoked: true,
        revokedAt,
      });
      revokedCount++;
    }

    return revokedCount;
  }

  /**
   * Clean up expired sessions (call periodically)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await this.find({
      where: [['expiresAt', '<', now]],
      limit: 500, // Process in batches
    });

    let deletedCount = 0;
    for (const session of result.data) {
      await this.delete(session.id);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Update session heartbeat to keep it alive
   */
  async updateHeartbeat(sessionId: string): Promise<void> {
    await this.update(sessionId, {
      lastSeenAt: new Date(),
    });
  }
}

// Singleton instance
export const sessionRepository = new SessionRepository();
