'use client';

import { Button, Group, Modal, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { usePDFPages } from '../../../hooks/usePDFPages';
import PDFPages from './PDFPages';

interface PDFEditorModalProps {
  file: File;
  onSave: (editedFile: File) => void;
  onCancel: () => void;
  enablePageDeletion?: boolean;
  enablePageReordering?: boolean;
  enablePageRotation?: boolean;
}

const PDFEditorModal = ({
  file,
  onSave,
  onCancel,
  enablePageDeletion = true,
  enablePageReordering = true,
  enablePageRotation = true,
}: PDFEditorModalProps) => {
  const [isSaving, setIsSaving] = useState(false);
  const { pages, rotatePage, deletePage, reorderPages, undo, redo, canUndo, canRedo, exportPDF } =
    usePDFPages(file);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const editedFile = await exportPDF();
      onSave(editedFile);
    } finally {
      setIsSaving(false);
    }
  };

  const visiblePageCount = pages.filter((p) => !p.deleted).length;

  return (
    <Modal
      opened={true}
      onClose={onCancel}
      title="Edit PDF"
      size="90vw"
      fullScreen={false}
      centered
      styles={{
        content: {
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          width: '90vw',
        },
        body: {
          maxHeight: '85vh',
          overflow: 'auto',
        },
      }}
    >
      <Stack gap="md" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header minimal */}
        <Group justify="space-between" mb="xs">
          <Text fw={600}>
            Pages: {visiblePageCount} / {pages.length}
          </Text>
          <Group gap="xs">
            <Button size="xs" variant="light" onClick={undo} disabled={!canUndo || isSaving}>
              ↶ Undo
            </Button>
            <Button size="xs" variant="light" onClick={redo} disabled={!canRedo || isSaving}>
              ↷ Redo
            </Button>
          </Group>
        </Group>

        {/* Pages display - scrollable */}
        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {pages.length > 0 ? (
            <PDFPages
              file={file}
              pages={pages}
              onRotatePage={(idx) => rotatePage(idx, 90)}
              onDeletePage={deletePage}
              onReorderPages={reorderPages}
              enableRotation={enablePageRotation}
              enableDeletion={enablePageDeletion}
              enableReordering={enablePageReordering}
              disabled={isSaving}
            />
          ) : (
            <Stack align="center" justify="center" py="xl">
              <Text c="dimmed">Loading PDF pages...</Text>
            </Stack>
          )}
        </div>

        {/* Action buttons */}
        <Group justify="flex-end" gap="sm">
          <Button onClick={onCancel} disabled={isSaving} variant="light">
            Cancel
          </Button>
          <Button onClick={handleSave} loading={isSaving}>
            Save & Export
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default PDFEditorModal;
