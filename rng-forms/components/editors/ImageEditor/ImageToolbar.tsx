'use client';

import { Button, Group, Slider, Stack } from '@mantine/core';
import {
  IconCrop,
  IconFlipHorizontal,
  IconFlipVertical,
  IconRotateClockwise,
} from '@tabler/icons-react';
import { useCallback, useState } from 'react';
import { useDebouncedCallback } from '../../../hooks/useDebounce';

interface ImageToolbarProps {
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
  disabled: boolean;
}

const ImageToolbar = ({
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
  disabled,
}: ImageToolbarProps) => {
  // Local state for immediate UI feedback
  const [localBrightness, setLocalBrightness] = useState(brightness);
  const [localContrast, setLocalContrast] = useState(contrast);
  const [localSaturation, setLocalSaturation] = useState(saturation);

  // Debounced callbacks that actually update the image (with 150ms delay for smooth feel)
  const debouncedBrightnessChange = useDebouncedCallback(onBrightnessChange, 150);
  const debouncedContrastChange = useDebouncedCallback(onContrastChange, 150);
  const debouncedSaturationChange = useDebouncedCallback(onSaturationChange, 150);

  // Handle brightness change: update local state immediately, debounce the callback
  const handleBrightnessChange = useCallback(
    (value: number) => {
      setLocalBrightness(value);
      debouncedBrightnessChange(value);
    },
    [debouncedBrightnessChange],
  );

  // Handle contrast change: update local state immediately, debounce the callback
  const handleContrastChange = useCallback(
    (value: number) => {
      setLocalContrast(value);
      debouncedContrastChange(value);
    },
    [debouncedContrastChange],
  );

  // Handle saturation change: update local state immediately, debounce the callback
  const handleSaturationChange = useCallback(
    (value: number) => {
      setLocalSaturation(value);
      debouncedSaturationChange(value);
    },
    [debouncedSaturationChange],
  );
  return (
    <Stack gap="md">
      {enableBrightness && (
        <div>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Brightness: {localBrightness}
          </label>
          <Slider
            min={-100}
            max={100}
            value={localBrightness}
            onChange={handleBrightnessChange}
            disabled={disabled}
            marks={[
              { value: -100, label: '-100' },
              { value: 0, label: '0' },
              { value: 100, label: '100' },
            ]}
          />
        </div>
      )}

      {enableContrast && (
        <div>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Contrast: {localContrast}
          </label>
          <Slider
            min={-100}
            max={100}
            value={localContrast}
            onChange={handleContrastChange}
            disabled={disabled}
            marks={[
              { value: -100, label: '-100' },
              { value: 0, label: '0' },
              { value: 100, label: '100' },
            ]}
          />
        </div>
      )}

      {enableSaturation && (
        <div>
          <label
            style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '0.875rem' }}
          >
            Saturation: {localSaturation}
          </label>
          <Slider
            min={-100}
            max={100}
            value={localSaturation}
            onChange={handleSaturationChange}
            disabled={disabled}
            marks={[
              { value: -100, label: '-100' },
              { value: 0, label: '0' },
              { value: 100, label: '100' },
            ]}
          />
        </div>
      )}

      {enableRotation && (
        <Group justify="flex-start">
          <label style={{ fontWeight: 500 }}>Rotation:</label>
          <Button
            onClick={() => onRotate(90)}
            disabled={disabled}
            variant="light"
            leftSection={<IconRotateClockwise size={16} />}
          >
            90°
          </Button>
          <Button
            onClick={() => onRotate(180)}
            disabled={disabled}
            variant="light"
            leftSection={<IconRotateClockwise size={16} />}
          >
            180°
          </Button>
          <Button
            onClick={() => onRotate(270)}
            disabled={disabled}
            variant="light"
            leftSection={<IconRotateClockwise size={16} />}
          >
            270°
          </Button>
        </Group>
      )}

      {enableFlip && (
        <Group justify="flex-start">
          <label style={{ fontWeight: 500 }}>Flip:</label>
          <Button
            onClick={() => onFlip('x')}
            disabled={disabled}
            variant={flipX ? 'filled' : 'light'}
            leftSection={<IconFlipHorizontal size={16} />}
          >
            Horizontal
          </Button>
          <Button
            onClick={() => onFlip('y')}
            disabled={disabled}
            variant={flipY ? 'filled' : 'light'}
            leftSection={<IconFlipVertical size={16} />}
          >
            Vertical
          </Button>
        </Group>
      )}

      {enableCrop && (
        <Button
          onClick={onCrop}
          disabled={disabled}
          variant="light"
          leftSection={<IconCrop size={16} />}
        >
          Crop
        </Button>
      )}
    </Stack>
  );
};

export default ImageToolbar;
