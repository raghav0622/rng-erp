'use client';

import { Group, Text } from '@mantine/core';
import { IconBrandReact } from '@tabler/icons-react';

export const RNGLogo = () => {
  return (
    <Group gap="xs" wrap="nowrap">
      <IconBrandReact size={28} stroke={2} style={{ color: 'var(--mantine-color-blue-6)' }} />
      <Text size="lg" fw={700} style={{ letterSpacing: '-0.5px' }}>
        RNG ERP
      </Text>
    </Group>
  );
};
