'use client';

import { theme } from '@/theme';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import React from 'react';
import { AuthNotificationsProvider } from './_AuthNotificationsProvider';
import { OfflineDetectionProvider } from './_OfflineDetectionProvider';
import { RNGQueryProvider } from './_RNGQueryProvider';
import { SessionTimeoutProvider } from './_SessionTimeoutProvider';
import { SingleInstanceGuard } from './_SingleInstanceSafeGuard';

export default function RNGAppProvider({ children }: { children: React.ReactNode }) {
  return (
    <SingleInstanceGuard>
      <RNGQueryProvider>
        <MantineProvider theme={theme}>
          <Notifications position="bottom-center" zIndex={1000} />
          <AuthNotificationsProvider />
          <SessionTimeoutProvider />
          <OfflineDetectionProvider />
          {children}
        </MantineProvider>
      </RNGQueryProvider>
    </SingleInstanceGuard>
  );
}
