'use client';

import { globalLogger } from '@/lib';
import { Button, Group, SimpleGrid, Stack, Text } from '@mantine/core';
import { IconFile } from '@tabler/icons-react';
import * as pdfjsLib from 'pdfjs-dist';
import { useCallback, useRef, useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { PDFInputItem } from '../../../types';
import PDFEditorModal from '../../editors/PDFEditor/PDFEditorModal';

// Set up PDF.js worker (Vite-safe)
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).href;
}

interface PDFFileItem {
  id: string;
  file: File;
  preview: string; // data URL
  pageCount: number;
}

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function PDFInputField<TValues extends FieldValues>(
  props: PDFInputItem<TValues> & BaseFieldProps<TValues>,
) {
  const {
    control,
    name,
    label,
    description,
    required,
    disabled = false,
    readOnly = false,
    error,
    maxSizeMB = 50,
    enablePageDeletion = true,
    enablePageReordering = true,
    enablePageRotation = true,
  } = props;

  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const [pdfs, setPdfs] = useState<PDFFileItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }

      if (!file.type.includes('pdf') && !file.name.endsWith('.pdf')) {
        return false;
      }

      return true;
    },
    [maxSizeMB],
  );

  const getPageCount = useCallback(async (file: File): Promise<number> => {
    try {
      const pdf = await pdfjsLib.getDocument(await file.arrayBuffer()).promise;
      return pdf.numPages;
    } catch {
      return 1;
    }
  }, []);

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !validateFile(file)) return;

      const pageCount = await getPageCount(file);
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = event.target?.result as string;
        const pdfItem: PDFFileItem = {
          id: Date.now().toString(),
          file,
          preview,
          pageCount,
        };
        setPdfs([pdfItem]);
        field.onChange(preview); // Set form value to data URL
      };
      reader.readAsDataURL(file);
    },
    [validateFile, getPageCount, field],
  );

  const editingFile = pdfs.find((pdf) => pdf.id === editingId);

  const handleSaveEdit = useCallback(
    async (editedFile: File) => {
      if (!editingId) return;
      setIsSaving(true);
      setSaveError(null);
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = event.target?.result as string;
          setPdfs((prev) => {
            const next = prev.map((pdf) =>
              pdf.id === editingId ? { ...pdf, file: editedFile, preview } : pdf,
            );
            field.onChange(preview); // Update form value with edited file
            return next;
          });
          setIsEditing(false);
          setEditingId(null);
        };
        reader.readAsDataURL(editedFile);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to save PDF';
        setSaveError(msg);
        globalLogger.error('Save error:', { error: err });
      } finally {
        setIsSaving(false);
      }
    },
    [editingId, field],
  );

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingId(null);
    setSaveError(null);
  }, []);

  const handleRemovePDF = useCallback(() => {
    setPdfs([]);
    field.onChange('');
  }, [field]);

  return (
    <Stack gap="xs">
      <Group justify="space-between">
        <div>
          {label && (
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {label}
              {required && <span style={{ color: 'red' }}>*</span>}
            </div>
          )}
          {description && <div style={{ fontSize: '0.875rem', color: '#666' }}>{description}</div>}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          disabled={disabled || readOnly}
          style={{ display: 'none' }}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || readOnly}
          leftSection={<IconFile size={16} />}
          variant="light"
        >
          Select PDF
        </Button>
      </Group>

      {pdfs.length > 0 && (
        <SimpleGrid cols={{ base: 1 }} spacing="sm">
          <div
            style={{
              borderRadius: '10px',
              border: '1px solid #e0e0e0',
              backgroundColor: '#f8f9fa',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <Text size="sm" fw={600}>
                {pdfs[0]!.file.name}
              </Text>
              <Text size="xs" c="dimmed">
                {pdfs[0]!.pageCount} page{pdfs[0]!.pageCount !== 1 ? 's' : ''}
              </Text>
            </div>

            <Group gap={6} justify="flex-end" wrap="nowrap">
              <Button
                size="xs"
                variant="light"
                onClick={() => {
                  setEditingId(pdfs[0]!.id);
                  setIsEditing(true);
                }}
                disabled={disabled || readOnly}
              >
                ✎ Edit
              </Button>
              <Button
                size="xs"
                color="red"
                variant="light"
                onClick={handleRemovePDF}
                disabled={disabled || readOnly}
              >
                ✕ Remove
              </Button>
            </Group>
          </div>
        </SimpleGrid>
      )}

      {mergedError && (
        <Text size="sm" c="red">
          {mergedError}
        </Text>
      )}
      {saveError && (
        <Text size="sm" c="red">
          {saveError}
        </Text>
      )}

      {isEditing && editingFile && (
        <PDFEditorModal
          file={editingFile.file}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          enablePageDeletion={enablePageDeletion}
          enablePageReordering={enablePageReordering}
          enablePageRotation={enablePageRotation}
        />
      )}
    </Stack>
  );
}
