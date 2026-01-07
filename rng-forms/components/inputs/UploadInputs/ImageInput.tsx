'use client';

import { globalLogger } from '@/lib';
import { ActionIcon, Button, Group, Modal, SimpleGrid, Stack, Text, Tooltip } from '@mantine/core';
import { IconPhoto, IconX } from '@tabler/icons-react';
import { nanoid } from 'nanoid';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import { useImageManipulation } from '../../../hooks/useImageManipulation';
import type { ImageInputItem } from '../../../types';
import CropperDialog from '../../editors/ImageEditor/CropperDialog';
import ImageCanvas from '../../editors/ImageEditor/ImageCanvas';
import ImageToolbar from '../../editors/ImageEditor/ImageToolbar';

interface ImageFileItem {
  id: string;
  file: File;
  preview: string;
}

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function ImageInputField<TValues extends FieldValues>(
  props: ImageInputItem<TValues> & BaseFieldProps<TValues>,
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
    maxSizeMB = 10,
    acceptedFormats = ['jpg', 'jpeg', 'png', 'webp'],
    enableCrop = true,
    enableBrightness = true,
    enableContrast = true,
    enableSaturation = true,
    enableRotation = true,
    enableFlip = true,
    allowMultiple = false,
    compressQuality = 0.8,
    outputFormat = 'webp',
  } = props;

  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const [images, setImages] = useState<ImageFileItem[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editingFile = images.find((img) => img.id === editingId);

  const {
    brightness,
    adjustBrightness,
    contrast,
    adjustContrast,
    saturation,
    adjustSaturation,
    rotation,
    rotate,
    flipX,
    flipY,
    flip,
    undo,
    redo,
    canUndo,
    canRedo,
    resetAll,
    exportImage,
  } = useImageManipulation(editingFile?.file || null);

  const normalizedFormats = useMemo(
    () =>
      acceptedFormats.map((fmt) => {
        const f = fmt.trim().toLowerCase();
        if (!f) return '';
        if (f.includes('/')) return f; // mime type
        if (f.startsWith('.')) return f;
        return `.${f}`;
      }),
    [acceptedFormats],
  );

  const setFieldFromImages = useCallback(
    (nextImages: ImageFileItem[]) => {
      const value = allowMultiple
        ? nextImages.map((img) => img.preview)
        : nextImages[0]?.preview || '';
      field.onChange(value);
    },
    [allowMultiple, field],
  );

  const validateFile = useCallback(
    (file: File): boolean => {
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }

      const ext = file.name.split('.').pop()?.toLowerCase();
      const extWithDot = ext ? `.${ext}` : '';
      const mime = file.type?.toLowerCase();

      const matchesMime = mime ? normalizedFormats.includes(mime) : false;
      const matchesExt = extWithDot ? normalizedFormats.includes(extWithDot) : false;

      if (normalizedFormats.length > 0 && !matchesMime && !matchesExt) {
        return false;
      }

      return true;
    },
    [maxSizeMB, normalizedFormats],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length === 0) return;

      const validFiles = files.filter(validateFile);
      if (!allowMultiple) {
        validFiles.length = 1;
      }

      validFiles.forEach((file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = event.target?.result as string;
          const imageItem: ImageFileItem = {
            id: nanoid(),
            file,
            preview,
          };
          setImages((prev) => {
            const next = [...prev, imageItem];
            setFieldFromImages(next);
            return next;
          });
        };
        reader.readAsDataURL(file);
      });
    },
    [validateFile, setFieldFromImages],
  );

  const handleEditImage = useCallback((id: string) => {
    setEditingId(id);
    setIsEditing(true);
  }, []);

  const applyFileToState = useCallback(
    (fileToApply: File) =>
      new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const preview = event.target?.result as string;
          setImages((prev) => {
            const next = prev.map((img) =>
              img.id === editingId ? { ...img, file: fileToApply, preview } : img,
            );
            setFieldFromImages(next);
            return next;
          });
          resolve();
        };
        reader.readAsDataURL(fileToApply);
      }),
    [editingId, setFieldFromImages],
  );

  const handleSaveImage = useCallback(async () => {
    if (!editingId) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      globalLogger.debug('Starting save with filters:', {
        brightness,
        contrast,
        saturation,
        rotation,
        flipX,
        flipY,
      });
      const editedFile = await exportImage(outputFormat, compressQuality);
      globalLogger.debug('Exported file:', {
        name: editedFile.name,
        size: editedFile.size,
        type: editedFile.type,
      });
      await applyFileToState(editedFile);
      globalLogger.debug('Applied to state, closing modal');
      setIsEditing(false);
      setEditingId(null);
      setSaveError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save image';
      setSaveError(msg);
      globalLogger.error('Save error:', { error: err });
    } finally {
      setIsSaving(false);
    }
  }, [
    applyFileToState,
    compressQuality,
    editingId,
    exportImage,
    outputFormat,
    brightness,
    contrast,
    saturation,
    rotation,
    flipX,
    flipY,
  ]);

  const handleApplyCrop = useCallback(
    async (croppedFile: File) => {
      if (!editingId) return;
      await applyFileToState(croppedFile);
      setIsCropping(false);
    },
    [applyFileToState, editingId],
  );

  const handleRemoveImage = useCallback(
    (id: string) => {
      setImages((prev) => {
        const next = prev.filter((img) => img.id !== id);
        setFieldFromImages(next);
        return next;
      });
    },
    [setFieldFromImages],
  );

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditingId(null);
  }, []);

  const handleMoveImage = useCallback(
    (fromIndex: number, toIndex: number) => {
      setImages((prev) => {
        const newImages = [...prev];
        const [removed] = newImages.splice(fromIndex, 1);
        if (removed) {
          newImages.splice(toIndex, 0, removed);
          setFieldFromImages(newImages);
          return newImages;
        }
        return prev;
      });
    },
    [setFieldFromImages],
  );

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

        {/* Hidden input always mounted so both initial and “add more” buttons can reuse it */}
        <input
          ref={fileInputRef}
          type="file"
          accept={normalizedFormats.join(',')}
          onChange={handleFileSelect}
          disabled={disabled || readOnly}
          multiple={allowMultiple}
          style={{ display: 'none' }}
        />

        {(!allowMultiple || images.length === 0) && (
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || readOnly || (!allowMultiple && images.length > 0)}
            leftSection={<IconPhoto size={16} />}
            variant="light"
          >
            {images.length === 0 ? 'Select Image' : 'Add Image'}
          </Button>
        )}
      </Group>

      {images.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            Images ({images.length})
          </Text>
          <SimpleGrid cols={allowMultiple ? { base: 2, sm: 3, md: 4 } : { base: 2 }} spacing="sm">
            {images.map((image, index) => (
              <div
                key={image.id}
                style={{
                  position: 'relative',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  border: '2px solid #ddd',
                  backgroundColor: '#f5f5f5',
                  width: allowMultiple ? '100%' : '160px',
                  maxWidth: allowMultiple ? '100%' : '160px',
                  aspectRatio: '1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={image.preview}
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    background: '#f5f5f5',
                    cursor: 'pointer',
                  }}
                  onClick={() => handleEditImage(image.id)}
                />

                {allowMultiple && (
                  <Group
                    gap={4}
                    style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      right: 8,
                    }}
                  >
                    {index > 0 && (
                      <Tooltip label="Move up">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          onClick={() => handleMoveImage(index, index - 1)}
                        >
                          ↑
                        </ActionIcon>
                      </Tooltip>
                    )}
                    {index < images.length - 1 && (
                      <Tooltip label="Move down">
                        <ActionIcon
                          size="sm"
                          variant="light"
                          onClick={() => handleMoveImage(index, index + 1)}
                        >
                          ↓
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </Group>
                )}

                <Tooltip label="Delete">
                  <ActionIcon
                    size="sm"
                    color="red"
                    variant="filled"
                    style={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                    }}
                    onClick={() => handleRemoveImage(image.id)}
                    disabled={disabled || readOnly}
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Tooltip>

                <Tooltip label="Edit">
                  <Button
                    size="xs"
                    variant="light"
                    style={{
                      position: 'absolute',
                      top: 4,
                      left: 4,
                    }}
                    onClick={() => handleEditImage(image.id)}
                  >
                    ✎
                  </Button>
                </Tooltip>
              </div>
            ))}
          </SimpleGrid>

          {allowMultiple && images.length > 0 && (
            <Button
              onClick={() => fileInputRef?.current?.click()}
              disabled={disabled || readOnly}
              variant="light"
              size="sm"
            >
              + Add More Images
            </Button>
          )}
        </Stack>
      )}

      {mergedError && <div style={{ color: 'red', fontSize: '0.875rem' }}>{mergedError}</div>}

      {isEditing && editingFile && (
        <Modal opened={true} onClose={() => setIsEditing(false)} title="Edit Image" size="xl">
          <Group align="flex-start" gap="lg">
            <Stack flex={2} gap="md" w="100%">
              <ImageCanvas
                file={editingFile.file}
                brightness={brightness}
                contrast={contrast}
                saturation={saturation}
                rotation={rotation}
                flipX={flipX}
                flipY={flipY}
              />
            </Stack>
            <Stack flex={1} gap="md" w="100%">
              <ImageToolbar
                brightness={brightness}
                onBrightnessChange={adjustBrightness}
                enableBrightness={enableBrightness}
                contrast={contrast}
                onContrastChange={adjustContrast}
                enableContrast={enableContrast}
                saturation={saturation}
                onSaturationChange={adjustSaturation}
                enableSaturation={enableSaturation}
                rotation={rotation}
                onRotate={rotate}
                enableRotation={enableRotation}
                flipX={flipX}
                flipY={flipY}
                onFlip={flip}
                enableFlip={enableFlip}
                onCrop={() => setIsCropping(true)}
                enableCrop={enableCrop}
                disabled={disabled || readOnly}
              />
              <Group justify="flex-end">
                <Button variant="default" onClick={() => setIsEditing(false)} disabled={isSaving}>
                  Cancel
                </Button>
                <Button onClick={handleSaveImage} loading={isSaving}>
                  Save
                </Button>
              </Group>
              {saveError && (
                <div style={{ color: 'red', fontSize: '0.875rem', marginTop: 8 }}>{saveError}</div>
              )}
            </Stack>
          </Group>
        </Modal>
      )}

      {isCropping && editingFile && (
        <CropperDialog
          file={editingFile.file}
          onClose={() => setIsCropping(false)}
          onCrop={handleApplyCrop}
        />
      )}
    </Stack>
  );
}

interface ImageEditorModalProps {
  file: File;
  onSave: (editedFile: File) => Promise<void>;
  onCancel: () => void;
  brightness: number;
  onBrightnessChange: (value: number) => void;
  enableBrightness: boolean;
  contrast: number;
  onContrastChange: (value: number) => void;
  enableContrast: boolean;
  saturation: number;
  onSaturationChange: (value: number) => void;
  enableSaturation: boolean;
  rotation: number;
  onRotate: (degrees: 90 | 180 | 270) => void;
  enableRotation: boolean;
  flipX: boolean;
  flipY: boolean;
  onFlip: (axis: 'x' | 'y') => void;
  enableFlip: boolean;
  onCrop: () => void;
  enableCrop: boolean;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetAll: () => void;
  exportImage: (format: any, quality: number) => Promise<File>;
  compressQuality: number;
  outputFormat: string;
}

function ImageEditorModal({
  file,
  onSave,
  onCancel,
  brightness,
  onBrightnessChange,
  enableBrightness,
  contrast,
  onContrastChange,
  enableContrast,
  saturation,
  onSaturationChange,
  enableSaturation,
  rotation,
  onRotate,
  enableRotation,
  flipX,
  flipY,
  onFlip,
  enableFlip,
  onCrop,
  enableCrop,
  undo,
  redo,
  canUndo,
  canRedo,
  resetAll,
  exportImage,
  compressQuality,
  outputFormat,
}: ImageEditorModalProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const editedFile = await exportImage(outputFormat, compressQuality);
      await onSave(editedFile);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Modal opened={true} onClose={onCancel} title="Edit Image" size="xl" centered>
        <Group align="flex-start" gap="lg">
          <Stack flex={2} gap="md" w="100%">
            <ImageCanvas
              file={file}
              brightness={brightness}
              contrast={contrast}
              saturation={saturation}
              rotation={rotation}
              flipX={flipX}
              flipY={flipY}
            />
          </Stack>

          <Stack flex={1} gap="md" w="100%">
            <ImageToolbar
              brightness={brightness}
              onBrightnessChange={onBrightnessChange}
              enableBrightness={enableBrightness}
              contrast={contrast}
              onContrastChange={onContrastChange}
              enableContrast={enableContrast}
              saturation={saturation}
              onSaturationChange={onSaturationChange}
              enableSaturation={enableSaturation}
              rotation={rotation}
              onRotate={onRotate}
              enableRotation={enableRotation}
              flipX={flipX}
              flipY={flipY}
              onFlip={onFlip}
              enableFlip={enableFlip}
              onCrop={() => setIsCropping(true)}
              enableCrop={enableCrop}
              disabled={isSaving}
            />

            <Group justify="space-between">
              <Group>
                <Button onClick={undo} disabled={!canUndo || isSaving} variant="light">
                  ↶ Undo
                </Button>
                <Button onClick={redo} disabled={!canRedo || isSaving} variant="light">
                  Redo ↷
                </Button>
                <Button onClick={resetAll} disabled={isSaving} variant="light">
                  Reset
                </Button>
              </Group>
              <Group>
                <Button onClick={onCancel} disabled={isSaving} variant="light">
                  Cancel
                </Button>
                <Button onClick={handleSave} loading={isSaving}>
                  Save & Export
                </Button>
              </Group>
            </Group>
          </Stack>
        </Group>
      </Modal>

      {isCropping && (
        <CropperDialog
          file={file}
          onClose={() => setIsCropping(false)}
          onCrop={() => setIsCropping(false)}
        />
      )}
    </>
  );
}
