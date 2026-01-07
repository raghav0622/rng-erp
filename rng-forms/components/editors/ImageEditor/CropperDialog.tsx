'use client';

import { Button, Group, Modal, Stack } from '@mantine/core';
import { useEffect, useRef, useState } from 'react';
import { Cropper } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';

interface CropperDialogProps {
  file: File;
  onClose: () => void;
  onCrop: (croppedFile: File) => void;
}

const CropperDialog = ({ file, onClose, onCrop }: CropperDialogProps) => {
  const [src, setSrc] = useState<string>('');
  const cropperRef = useRef<any>(null);

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setSrc(e.target?.result as string);
    reader.readAsDataURL(file);
  }, [file]);

  const handleCrop = () => {
    if (!cropperRef.current) return;

    const canvas = cropperRef.current.getCanvas();
    if (canvas) {
      canvas.toBlob((blob: Blob) => {
        if (blob) {
          const croppedFile = new File([blob], file.name, { type: file.type });
          onCrop(croppedFile);
        }
      });
    }
  };

  return (
    <Modal opened={true} onClose={onClose} title="Crop Image" size="xl" centered>
      <Stack gap="md">
        <div style={{ height: '400px', overflow: 'hidden' }}>
          {src && <Cropper ref={cropperRef} src={src} />}
        </div>
        <Group justify="flex-end">
          <Button onClick={onClose} variant="light">
            Cancel
          </Button>
          <Button onClick={handleCrop}>Confirm Crop</Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default CropperDialog;
