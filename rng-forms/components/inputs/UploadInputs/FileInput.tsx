'use client';

import { ActionIcon, Button, Group, Progress, Stack, Text, Tooltip } from '@mantine/core';
import { IconFile, IconTrash, IconUpload } from '@tabler/icons-react';
import { nanoid } from 'nanoid';
import { useCallback, useRef, useState } from 'react';
import { useController, type Control, type FieldValues } from 'react-hook-form';
import type { FileInputItem } from '../../../types';

interface FileUploadItem {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

interface BaseFieldProps<TValues extends FieldValues> {
  control: Control<TValues>;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
}

export function FileInputField<TValues extends FieldValues>(
  props: FileInputItem<TValues> & BaseFieldProps<TValues>,
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
    allowedExtensions = [],
    allowMultiple = true,
    allowDragDrop = true,
  } = props;

  const { field, fieldState } = useController({ name, control });
  const mergedError = error ?? fieldState.error?.message;

  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      const maxSize = maxSizeMB * 1024 * 1024;
      if (file.size > maxSize) {
        return false;
      }

      if (allowedExtensions.length > 0) {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (!ext || !allowedExtensions.includes(ext)) {
          return false;
        }
      }

      return true;
    },
    [maxSizeMB, allowedExtensions],
  );

  const handleFiles = useCallback(
    (newFiles: File[]) => {
      const validated = newFiles.filter(validateFile);
      if (!allowMultiple) {
        setFiles(
          validated.slice(0, 1).map((file) => ({
            id: nanoid(),
            file,
            progress: 0,
            status: 'pending' as const,
          })),
        );
      } else {
        setFiles((prev) => [
          ...prev,
          ...validated.map((file) => ({
            id: nanoid(),
            file,
            progress: 0,
            status: 'pending' as const,
          })),
        ]);
      }

      const fileNames = validated.map((f) => f.name);
      field.onChange(allowMultiple ? fileNames : fileNames[0]);
    },
    [validateFile, allowMultiple, field],
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(Array.from(e.target.files));
      }
    },
    [handleFiles],
  );

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (allowDragDrop && e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleMoveFile = useCallback(
    (fromIndex: number, toIndex: number) => {
      const newFiles = [...files];
      const [removed] = newFiles.splice(fromIndex, 1);
      if (removed) {
        newFiles.splice(toIndex, 0, removed);
        setFiles(newFiles);
        field.onChange(newFiles.map((f) => f.file.name));
      }
    },
    [files, field],
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const newFiles = files.filter((f) => f.id !== fileId);
      setFiles(newFiles);
      field.onChange(newFiles.map((f) => f.file.name));
    },
    [files, field],
  );

  return (
    <Stack gap="xs">
      <div>
        {label && (
          <div style={{ fontWeight: 500, marginBottom: 4 }}>
            {label}
            {required && <span style={{ color: 'red' }}>*</span>}
          </div>
        )}
        {description && <div style={{ fontSize: '0.875rem', color: '#666' }}>{description}</div>}
      </div>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${dragActive ? '#339af0' : '#ddd'}`,
          borderRadius: '8px',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: dragActive ? '#f0f8ff' : '#fafafa',
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          onChange={handleFileChange}
          disabled={disabled || readOnly}
          style={{ display: 'none' }}
          accept={
            allowedExtensions.length > 0
              ? allowedExtensions.map((ext) => `.${ext}`).join(',')
              : undefined
          }
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || readOnly}
          leftSection={<IconUpload size={16} />}
          variant="light"
        >
          Click to browse or drag files
        </Button>
        {allowDragDrop && (
          <Text size="sm" c="dimmed" mt="xs">
            or drag and drop files here
          </Text>
        )}
      </div>

      {files.length > 0 && (
        <Stack gap="sm">
          <Text size="sm" fw={500}>
            Files ({files.length})
          </Text>
          {files.map((file, index) => (
            <div
              key={file.id}
              style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '12px',
                backgroundColor: '#fafafa',
              }}
            >
              <Group justify="space-between" mb="xs">
                <Group gap="xs">
                  <IconFile size={16} />
                  <div>
                    <Text size="sm" fw={500}>
                      {file.file.name}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {(file.file.size / 1024).toFixed(2)} KB
                    </Text>
                  </div>
                </Group>
                <Group gap={4}>
                  {allowMultiple && index > 0 && (
                    <Tooltip label="Move up">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => handleMoveFile(index, index - 1)}
                      >
                        ↑
                      </ActionIcon>
                    </Tooltip>
                  )}
                  {allowMultiple && index < files.length - 1 && (
                    <Tooltip label="Move down">
                      <ActionIcon
                        size="sm"
                        variant="light"
                        onClick={() => handleMoveFile(index, index + 1)}
                      >
                        ↓
                      </ActionIcon>
                    </Tooltip>
                  )}
                  <Button
                    onClick={() => removeFile(file.id)}
                    disabled={disabled || readOnly}
                    variant="subtle"
                    color="red"
                    size="xs"
                    leftSection={<IconTrash size={14} />}
                  >
                    Remove
                  </Button>
                </Group>
              </Group>
              {file.progress > 0 && file.progress < 100 && (
                <Progress value={file.progress} size="sm" />
              )}
            </div>
          ))}
        </Stack>
      )}

      {mergedError && (
        <Text size="sm" c="red">
          {mergedError}
        </Text>
      )}
    </Stack>
  );
}
