'use client';

import { Progress, Text } from '@mantine/core';
import { useMemo } from 'react';

export interface PasswordStrengthMeterProps {
  /**
   * Password to evaluate
   */
  password: string;
  /**
   * Show strength label
   * @default true
   */
  showLabel?: boolean;
  /**
   * Show strength percentage
   * @default false
   */
  showPercentage?: boolean;
}

/**
 * Password strength meter with visual feedback
 *
 * Strength criteria:
 * - Length (min 8 chars)
 * - Uppercase letters
 * - Lowercase letters
 * - Numbers
 * - Special characters
 *
 * @example
 * <PasswordStrengthMeter password={password} />
 */
export function PasswordStrengthMeter({
  password,
  showLabel = true,
  showPercentage = false,
}: PasswordStrengthMeterProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: 'No password', color: 'gray' };

    let score = 0;
    const checks = [
      password.length >= 8,
      password.length >= 12,
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /\d/.test(password),
      /[@$!%*?&#]/.test(password),
    ];

    score = checks.filter(Boolean).length;

    if (score <= 2) return { score, label: 'Weak', color: 'red' };
    if (score <= 4) return { score, label: 'Fair', color: 'orange' };
    if (score <= 5) return { score, label: 'Good', color: 'yellow' };
    return { score, label: 'Strong', color: 'green' };
  }, [password]);

  const percentage = Math.round((strength.score / 6) * 100);

  return (
    <div>
      <Progress value={percentage} color={strength.color} size="sm" radius="xl" />
      {(showLabel || showPercentage) && (
        <Text size="xs" c="dimmed" mt={4}>
          {showLabel && strength.label}
          {showLabel && showPercentage && ' • '}
          {showPercentage && `${percentage}%`}
        </Text>
      )}
    </div>
  );
}

export default PasswordStrengthMeter;
