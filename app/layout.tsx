import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { AuthServiceProvider } from '@/rng-firebase';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import type { Metadata } from 'next';
import React from 'react';
import { theme } from '../theme';
import { SingleInstanceGuard } from '../ui/auth/SingleInstanceSafeGuard';
import { ReactQueryProvider } from './provider-react-query';

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
        <AuthServiceProvider>
          <ReactQueryProvider>
            <MantineProvider theme={theme}>
              <Notifications position="top-right" zIndex={1000} />
              <SingleInstanceGuard>{children}</SingleInstanceGuard>
            </MantineProvider>
          </ReactQueryProvider>
        </AuthServiceProvider>
      </body>
    </html>
  );
}
