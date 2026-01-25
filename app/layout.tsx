import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { RNGQueryProvider } from '@/rng-query';
import {
  ColorSchemeScript,
  LoadingOverlay,
  mantineHtmlProps,
  MantineProvider,
} from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Metadata } from 'next';
import React, { Suspense } from 'react';
import { theme } from '../theme';
import { SingleInstanceGuard } from './SingleInstanceSafeGuard';

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
            <SingleInstanceGuard>
              <Suspense fallback={<LoadingOverlay />}>{children}</Suspense>
            </SingleInstanceGuard>
          </MantineProvider>
        </RNGQueryProvider>
      </body>
    </html>
  );
}
