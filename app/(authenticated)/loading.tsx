'use client';

import { Center, Loader } from '@mantine/core';

export default function DashboardLoadingFallback() {
  return (
    <Center h="100vh">
      <Loader size="lg" />
    </Center>
  );
}
