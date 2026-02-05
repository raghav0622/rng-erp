'use client';

import { RNGUserMenu } from '@/rng-ui/auth';
import { RNGLogo } from '@/rng-ui/brand';
import { RNGDarkModeButton } from '@/rng-ui/ux/_RNGDarkModeButton';
import { Burger, Group } from '@mantine/core';

interface HeaderProps {
  mobileOpened: boolean;
  desktopOpened: boolean;
  toggleMobile: () => void;
  toggleDesktop: () => void;
}

export default function Header({
  mobileOpened,
  desktopOpened,
  toggleMobile,
  toggleDesktop,
}: HeaderProps) {
  return (
    <Group h="100%" px="sm" justify="space-between" wrap="nowrap">
      <Group gap="sm" wrap="nowrap">
        <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
        <Burger opened={desktopOpened} onClick={toggleDesktop} visibleFrom="sm" size="sm" />

        <RNGLogo />
      </Group>

      <Group gap="xs" wrap="nowrap">
        <RNGDarkModeButton />
        <RNGUserMenu />
      </Group>
    </Group>
  );
}
