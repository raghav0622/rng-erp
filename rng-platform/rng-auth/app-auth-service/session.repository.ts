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
    if (sessions.length === 0) return 0;

    const revokedAt = new Date();
    const sessionIds = sessions.map((s) => s.id);

    // Use batch update for better performance
    const result = await this.updateMany(
      sessionIds,
      {
        revoked: true,
        revokedAt,
      } as Partial<UserSession>,
    );

    return result.successCount;
  }

  /**
   * Clean up expired sessions (call periodically)
   * Uses batch delete for better performance (v2.0.0 migration)
   */
  async cleanupExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await this.find({
      where: [['expiresAt', '<', now]],
      limit: 500, // Process in batches
    });

    if (result.data.length === 0) return 0;

    const sessionIds = result.data.map((s) => s.id);
    const deleteResult = await this.deleteMany(sessionIds);

    return deleteResult.successCount;
  }

  /**
   * Update session heartbeat to keep it alive
   * Uses lightweight touch for high-frequency updates (v2.0.0 optimization)
   */
  async updateHeartbeat(sessionId: string): Promise<void> {
    // Note: touchWithoutHooks only updates updatedAt, not lastSeenAt
    // If lastSeenAt tracking is required, use update() instead
    await this.update(sessionId, {
      lastSeenAt: new Date(),
    });
    // TODO: Consider using touchWithoutHooks() if lastSeenAt can be removed
    // or if updatedAt is sufficient for heartbeat tracking
  }
}

// Singleton instance
export const sessionRepository = new SessionRepository();
