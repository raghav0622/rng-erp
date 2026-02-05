'use client';

import { Avatar, Group, Text, Tooltip } from '@mantine/core';
import Image from 'next/image';

export interface UserAvatarProps {
  /**
   * User photo URL
   */
  photoUrl?: string | null;
  /**
   * User name (for fallback initials)
   */
  name: string;
  /**
   * Avatar size
   * @default 'md'
   */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Avatar radius
   * @default 'xl'
   */
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Show name next to avatar
   * @default false
   */
  showName?: boolean;
  /**
   * Show tooltip with name on hover
   * @default false
   */
  showTooltip?: boolean;
}

/**
 * User avatar component with photo, initials fallback, and optional name display
 *
 * Features:
 * - Photo display
 * - Automatic initials fallback
 * - Optional name label
 * - Optional tooltip
 * - Consistent sizing
 *
 * @example
 * <UserAvatar photoUrl={user.photoUrl} name={user.name} />
 * <UserAvatar name={user.name} showName />
 */
export function UserAvatar({
  photoUrl,
  name,
  size = 'md',
  radius = 'xl',
  showName = false,
  showTooltip = false,
}: UserAvatarProps) {
  const getInitials = (fullName: string): string => {
    const parts = fullName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0]![0]}${parts[parts.length - 1]![0]}`.toUpperCase();
    }
    return fullName.substring(0, 2).toUpperCase();
  };

  const getSizeInPx = () => {
    switch (size) {
      case 'xs':
        return 24;
      case 'sm':
        return 32;
      case 'md':
        return 40;
      case 'lg':
        return 56;
      case 'xl':
        return 72;
      default:
        return 40;
    }
  };

  const sizeInPx = getSizeInPx();

  const avatar = photoUrl ? (
    <Avatar size={size} radius={radius} alt={name}>
      <Image
        src={photoUrl}
        alt={name}
        width={1024}
        height={1024}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        priority={false}
      />
    </Avatar>
  ) : (
    <Avatar size={size} radius={radius} alt={name}>
      {getInitials(name)}
    </Avatar>
  );

  const content = showName ? (
    <Group gap="xs" wrap="nowrap">
      {avatar}
      <Text size={size === 'xs' || size === 'sm' ? 'sm' : 'md'} fw={500}>
        {name}
      </Text>
    </Group>
  ) : (
    avatar
  );

  if (showTooltip && !showName) {
    return (
      <Tooltip label={name} withArrow>
        {content}
      </Tooltip>
    );
  }

  return content;
}
