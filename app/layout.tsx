import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/nprogress/styles.css';

import { AuthNotificationsProvider } from '@/app-providers/AuthNotificationsProvider';
import { OfflineDetectionProvider } from '@/app-providers/OfflineDetectionProvider';
import { PageTransitionsProvider } from '@/app-providers/PageTransitionsProvider';
import { RNGQueryProvider } from '@/app-providers/RNGQueryProvider';
import { RouteProgressProvider } from '@/app-providers/RouteProgressProvider';
import { SessionTimeoutProvider } from '@/app-providers/SessionTimeoutProvider';
import { SingleInstanceGuard } from '@/app-providers/SingleInstanceSafeGuard';
import { theme } from '@/theme';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { NavigationProgress } from '@mantine/nprogress';
import type { Metadata } from 'next';
import React from 'react';

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
            <Notifications position="bottom-center" zIndex={1000} />
            <NavigationProgress />
            <PageTransitionsProvider />
            <RouteProgressProvider />
            <AuthNotificationsProvider />
            <SessionTimeoutProvider />
            <OfflineDetectionProvider />
            <SingleInstanceGuard>{children}</SingleInstanceGuard>
          </MantineProvider>
        </RNGQueryProvider>
      </body>
    </html>
  );
}
