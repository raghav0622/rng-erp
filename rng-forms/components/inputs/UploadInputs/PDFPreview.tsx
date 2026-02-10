'use client';

import { Center, Loader, Text } from '@mantine/core';
import { useEffect, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { globalLogger } from '@/lib';

// react-pdf / pdf.js worker setup (Vite-safe)
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
}

interface PDFPreviewProps {
  file: File;
  onClick?: () => void;
  maxHeight?: string | number;
}

const PDFPreview = ({ file, onClick, maxHeight = '300px' }: PDFPreviewProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We just toggle loading/error; react-pdf handles actual render
    setIsLoading(false);
    setError(null);
  }, [file]);

  if (isLoading) {
    return (
      <Center style={{ height: maxHeight }}>
        <Loader size="sm" />
      </Center>
    );
  }

  if (error) {
    return (
      <Center style={{ height: maxHeight }}>
        <Text size="sm" c="red">
          {error}
        </Text>
      </Center>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        maxHeight,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
        cursor: onClick ? 'pointer' : 'default',
        borderRadius: 8,
      }}
      onClick={onClick}
    >
      <Document
        file={file}
        loading={
          <Center style={{ height: maxHeight }}>
            <Loader size="sm" />
          </Center>
        }
        onLoadError={(err: unknown) => {
          globalLogger.error('Error rendering PDF preview:', { error: err });
          setError('Failed to load PDF');
        }}
      >
        <Page pageNumber={1} width={700} renderTextLayer={false} renderAnnotationLayer={false} />
      </Document>
    </div>
  );
};

export default PDFPreview;
