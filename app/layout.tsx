import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import {
  ColorSchemeScript,
  LoadingOverlay,
  mantineHtmlProps,
  MantineProvider,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { RNGQueryProvider } from '../app-providers/RNGQueryProvider';
import { SingleInstanceGuard } from '../app-providers/SingleInstanceSafeGuard';
import { AuthNotificationsProvider } from '../app-providers/AuthNotificationsProvider';
import { SessionTimeoutProvider } from '../app-providers/SessionTimeoutProvider';
import { OfflineDetectionProvider } from '../app-providers/OfflineDetectionProvider';
import { PageTransitionsProvider } from '../app-providers/PageTransitionsProvider';
import { theme } from '../theme';

export const metadata: Metadata = {
  title: 'RNG Apps',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
        <meta
          name="viewport"
          content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
        />
      </head>
      <body>
        <RNGQueryProvider>
          <MantineProvider theme={theme}>
            <Notifications position="top-right" zIndex={1000} />
            <PageTransitionsProvider />
            <AuthNotificationsProvider />
            <SessionTimeoutProvider />
            <OfflineDetectionProvider />
            <SingleInstanceGuard>
              <Suspense fallback={<LoadingOverlay visible />}>{children}</Suspense>
            </SingleInstanceGuard>
          </MantineProvider>
        </RNGQueryProvider>
      </body>
    </html>
  );
}

