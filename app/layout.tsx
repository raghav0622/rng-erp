import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

import RNGAppProvider from '@/rng-ui/rng-app-provider';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import type { Metadata } from 'next';
import React from 'react';

export const metadata: Metadata = {
  title: 'RNG ERP',
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
        <RNGAppProvider>{children}</RNGAppProvider>
      </body>
    </html>
  );
}
