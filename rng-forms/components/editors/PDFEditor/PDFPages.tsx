'use client';

import { globalLogger } from '@/lib';
import {
  ActionIcon,
  Center,
  Group,
  Loader,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { IconTrash } from '@tabler/icons-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useEffect, useState } from 'react';
import type { PDFPageState } from '../../../hooks/usePDFPages';

// Set up PDF.js worker (Vite-safe)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
}

interface PDFPagesProps {
  file: File;
  pages: PDFPageState[];
  onRotatePage: (pageIndex: number) => void;
  onDeletePage: (pageIndex: number) => void;
  onReorderPages: (fromIndex: number, toIndex: number) => void;
  enableRotation?: boolean;
  enableDeletion?: boolean;
  enableReordering?: boolean;
  disabled?: boolean;
}

interface RenderedPage {
  index: number;
  dataUrl: string;
  rotation: number;
}

const PDFPages = ({
  file,
  pages,
  onRotatePage,
  onDeletePage,
  onReorderPages,
  enableRotation = true,
  enableDeletion = true,
  enableReordering = true,
  disabled = false,
}: PDFPagesProps) => {
  const [renderedPages, setRenderedPages] = useState<RenderedPage[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [draggedPageId, setDraggedPageId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  // Render PDF pages as canvas/images
  useEffect(() => {
    const renderPages = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
        const rendered: RenderedPage[] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          try {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale: 1.5 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) {
              globalLogger.warn(`Failed to get canvas context for page ${i}`);
              continue;
            }

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas,
            }).promise;

            const dataUrl = canvas.toDataURL('image/png');
            const pageState = pages.find((p) => p.index === i - 1);
            rendered.push({
              index: i - 1,
              dataUrl,
              rotation: pageState?.rotation || 0,
            });
          } catch (pageError) {
            globalLogger.error(`Error rendering page ${i}:`, { error: pageError });
          }
        }

        setRenderedPages(rendered);
        if (rendered.length === 0 && pdf.numPages > 0) {
          setError('No pages could be rendered');
        }
      } catch (error) {
        globalLogger.error('Error rendering PDF pages:', { error });
        setError('Failed to load PDF pages');
      } finally {
        setIsLoading(false);
      }
    };

    renderPages();
  }, [file]);

  const orderMap = pages.reduce<Record<number, number>>((acc, page, order) => {
    acc[page.index] = order;
    return acc;
  }, {});

  const visiblePages = renderedPages
    .filter((p) => !pages.find((page) => page.index === p.index && page.deleted))
    .sort((a, b) => (orderMap[a.index] ?? 0) - (orderMap[b.index] ?? 0));

  if (isLoading) {
    return (
      <Stack gap="md" align="center" py="xl">
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Rendering PDF pages...
        </Text>
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack gap="md" align="center" py="xl">
        <Text size="sm" c="red">
          {error}
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Text size="sm" fw={500} mb="sm">
          Pages ({visiblePages.length})
        </Text>
        <Text size="xs" c="dimmed">
          {enableReordering && 'Drag to reorder • '}
          {enableRotation && 'Rotate 90° • '}
          {enableDeletion && 'Delete page'}
        </Text>
      </div>

      {visiblePages.length > 0 ? (
        <SimpleGrid cols={{ base: 2, sm: 3, md: 4, lg: 5 }} spacing="sm">
          {visiblePages.map((renderedPage, idx) => {
            const rotation = pages.find((p) => p.index === renderedPage.index)?.rotation || 0;
            return (
              <div
                key={`${renderedPage.index}-${pages[renderedPage.index]?.rotation || 0}`}
                draggable={enableReordering && !disabled}
                onDragStart={() => {
                  setDraggedIndex(idx);
                  setDraggedPageId(renderedPage.index);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedIndex !== null && draggedIndex !== idx && draggedPageId !== null) {
                    const fromPage = visiblePages[draggedIndex];
                    const toPage = visiblePages[idx];
                    if (fromPage && toPage) {
                      onReorderPages(fromPage.index, toPage.index);
                    }
                  }
                  setDraggedIndex(null);
                  setDraggedPageId(null);
                }}
                onDragEnd={() => {
                  setDraggedIndex(null);
                  setDraggedPageId(null);
                }}
                onClick={() => setPreviewIndex(renderedPage.index)}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  border: `2px solid ${draggedIndex === idx ? '#1971c2' : '#ddd'}`,
                  backgroundColor: '#f5f5f5',
                  cursor: enableReordering && !disabled ? 'move' : 'pointer',
                  opacity: draggedIndex === idx ? 0.7 : 1,
                  transition: 'all 0.2s ease',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Page thumbnail */}
                <img
                  src={renderedPage.dataUrl}
                  alt={`Page ${renderedPage.index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    backgroundColor: '#f5f5f5',
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.3s ease',
                  }}
                />

                {/* Page number overlay */}
                <div
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: 'rgba(0, 0, 0, 0.6)',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    fontWeight: 500,
                  }}
                >
                  {renderedPage.index + 1}
                </div>

                {/* Page controls */}
                <Group
                  gap={4}
                  style={{
                    position: 'absolute',
                    bottom: '4px',
                    left: '4px',
                    right: '4px',
                  }}
                >
                  {enableRotation && (
                    <Tooltip label="Rotate 90°">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRotatePage(renderedPage.index);
                        }}
                        disabled={disabled}
                      >
                        ↻
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {enableDeletion && (
                    <Tooltip label="Delete page">
                      <ActionIcon
                        size="sm"
                        color="red"
                        variant="light"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeletePage(renderedPage.index);
                        }}
                        disabled={disabled}
                        ml="auto"
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Tooltip>
                  )}
                </Group>
              </div>
            );
          })}
        </SimpleGrid>
      ) : (
        <Center py="xl">
          <Text size="sm" c="dimmed">
            All pages deleted
          </Text>
        </Center>
      )}

      <Modal
        opened={previewIndex !== null}
        onClose={() => setPreviewIndex(null)}
        size="90vw"
        radius="md"
        title={previewIndex !== null ? `Page ${previewIndex + 1}` : 'Page preview'}
        styles={{ body: { paddingTop: 0 } }}
      >
        {previewIndex !== null && (
          <Center>
            <img
              src={renderedPages.find((p) => p.index === previewIndex)?.dataUrl}
              alt={`Page ${previewIndex + 1}`}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          </Center>
        )}
      </Modal>
    </Stack>
  );
};

export default PDFPages;
