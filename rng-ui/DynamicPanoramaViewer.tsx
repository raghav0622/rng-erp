'use client';

import { Box, Skeleton } from '@mantine/core';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Dynamically import ParanomaViewer to avoid loading it on initial page load
const ParanomaViewer = dynamic(() => import('./ParanomaViewer'), {
  loading: () => (
    <Box style={{ width: '100%', height: '100%', minHeight: '400px' }}>
      <Skeleton height="100%" />
    </Box>
  ),
  ssr: false, // Don't render on server side - this is a client-only 3D viewer
});

interface DynamicPanoramaViewerProps {
  imageSrc: string;
}

export function DynamicPanoramaViewer({ imageSrc }: DynamicPanoramaViewerProps) {
  return (
    <Suspense
      fallback={
        <Box style={{ width: '100%', height: '100%', minHeight: '400px' }}>
          <Skeleton height="100%" />
        </Box>
      }
    >
      <ParanomaViewer imageSrc={imageSrc} />
    </Suspense>
  );
}

export default DynamicPanoramaViewer;
