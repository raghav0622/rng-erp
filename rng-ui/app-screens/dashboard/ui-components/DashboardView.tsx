'use client';

import { RNGPageContent } from '@/rng-ui/ux';
import { Text } from '@mantine/core';

export interface DashboardViewProps {
  welcomeMessage: string;
}

export function DashboardView({ welcomeMessage }: DashboardViewProps) {
  return (
    <RNGPageContent title="Dashboard">
      <Text size="sm" c="dimmed">
        {welcomeMessage}
      </Text>
    </RNGPageContent>
  );
}
