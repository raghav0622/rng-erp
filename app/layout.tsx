import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

import { RNGQueryProvider } from '@/app-providers/RNGQueryProvider';
import { theme } from '@/theme';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Metadata } from 'next';
import React, { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'RNG Apps',
};

// Lazy-load heavy providers that are only needed for authenticated pages
const AuthNotificationsProvider = React.lazy(() =>
  import('@/app-providers/AuthNotificationsProvider').then((m) => ({
    default: m.AuthNotificationsProvider,
  })),
);
const PageTransitionsProvider = React.lazy(() =>
  import('@/app-providers/PageTransitionsProvider').then((m) => ({
    default: m.PageTransitionsProvider,
  })),
);
const SessionTimeoutProvider = React.lazy(() =>
  import('@/app-providers/SessionTimeoutProvider').then((m) => ({
    default: m.SessionTimeoutProvider,
  })),
);
const OfflineDetectionProvider = React.lazy(() =>
  import('@/app-providers/OfflineDetectionProvider').then((m) => ({
    default: m.OfflineDetectionProvider,
  })),
);
const SingleInstanceGuard = React.lazy(() =>
  import('@/app-providers/SingleInstanceSafeGuard').then((m) => ({
    default: m.SingleInstanceGuard,
  })),
);

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
            {/* Lazy-load heavy providers with suspense boundary */}
            <Suspense fallback={null}>
              <AuthNotificationsProvider />
              <PageTransitionsProvider />
              <SessionTimeoutProvider />
              <OfflineDetectionProvider />
              <SingleInstanceGuard>{children}</SingleInstanceGuard>
            </Suspense>
          </MantineProvider>
        </RNGQueryProvider>
      </body>
    </html>
  );
}
