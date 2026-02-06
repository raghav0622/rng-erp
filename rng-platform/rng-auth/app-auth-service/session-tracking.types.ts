import { BaseEntity } from '@/rng-repository';

/**
 * Session tracking types for live multi-device session management
 */

export interface UserSession extends BaseEntity {
  /**
   * User ID (Firebase Auth UID)
   */
  userId: string;

  /**
   * Last time this session was seen active
   */
  lastSeenAt: Date;

  /**
   * When this session expires (24 hours from creation)
   */
  expiresAt: Date;

  /**
   * Whether this session has been revoked by an admin
   */
  revoked: boolean;

  /**
   * When this session was revoked (if revoked)
   */
  revokedAt?: Date;

  /**
   * Optional metadata about the device/browser
   */
  deviceInfo?: {
    userAgent?: string;
    platform?: string;
  };
}

export interface SessionValidationResult {
  /**
   * Whether the session is valid
   */
  isValid: boolean;

  /**
   * Reason for invalidation (if invalid)
   */
  reason?: 'revoked' | 'expired' | 'not_found' | 'user_disabled';
}
