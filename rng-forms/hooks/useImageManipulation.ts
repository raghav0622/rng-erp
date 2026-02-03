'use client';

import { useCallback, useEffect, useState } from 'react';

export interface ImageManipulationState {
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flippedX: boolean;
  flippedY: boolean;
}

interface HistoryEntry {
  state: ImageManipulationState;
  image?: Blob;
}

export function useImageManipulation(file: File | null) {
  const [state, setState] = useState<ImageManipulationState>({
    brightness: 0,
    contrast: 0,
    saturation: 0,
    rotation: 0,
    flippedX: false,
    flippedY: false,
  });

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Reset state/history when file changes to avoid applying old transforms to a new image
  useEffect(() => {
    setState({
      brightness: 0,
      contrast: 0,
      saturation: 0,
      rotation: 0,
      flippedX: false,
      flippedY: false,
    });
    setHistory([]);
    setHistoryIndex(-1);
  }, [file]);

  const pushToHistory = useCallback(
    (newState: ImageManipulationState) => {
      setState(newState);
      setHistory((prev) => [...prev.slice(0, historyIndex + 1), { state: newState }]);
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex],
  );

  const adjustBrightness = useCallback(
    (value: number) => {
      const newState = { ...state, brightness: value };
      pushToHistory(newState);
    },
    [state, pushToHistory],
  );

  const adjustContrast = useCallback(
    (value: number) => {
      const newState = { ...state, contrast: value };
      pushToHistory(newState);
    },
    [state, pushToHistory],
  );

  const adjustSaturation = useCallback(
    (value: number) => {
      const newState = { ...state, saturation: value };
      pushToHistory(newState);
    },
    [state, pushToHistory],
  );

  const rotate = useCallback(
    (degrees: 90 | 180 | 270) => {
      const newRotation = (state.rotation + degrees) % 360;
      const newState = { ...state, rotation: newRotation };
      pushToHistory(newState);
    },
    [state, pushToHistory],
  );

  const flipX = useCallback(() => {
    const newState = { ...state, flippedX: !state.flippedX };
    pushToHistory(newState);
  }, [state, pushToHistory]);

  const flipY = useCallback(() => {
    const newState = { ...state, flippedY: !state.flippedY };
    pushToHistory(newState);
  }, [state, pushToHistory]);

  const flip = useCallback(
    (direction: 'x' | 'y') => {
      if (direction === 'x') flipX();
      else flipY();
    },
    [flipX, flipY],
  );

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setState(history[newIndex]!.state);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setState(history[newIndex]!.state);
    }
  }, [history, historyIndex]);

  const resetAll = useCallback(() => {
    const newState: ImageManipulationState = {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      rotation: 0,
      flippedX: false,
      flippedY: false,
    };
    pushToHistory(newState);
  }, [pushToHistory]);

  const exportImage = useCallback(
    async (format: string = file?.type || 'image/webp', quality: number = 0.9): Promise<File> => {
      if (!file) throw new Error('No file to export');

      // Normalize format to MIME type if it's just an extension
      let mimeType = format;
      if (!format.includes('/')) {
        const f = format.toLowerCase().replace(/^\./, '');
        mimeType = `image/${f === 'jpg' ? 'jpeg' : f}`;
      }

      // Draw to canvas with filters and transforms so edited image matches preview
      const objectUrl = URL.createObjectURL(file);
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = objectUrl;
      });
      URL.revokeObjectURL(objectUrl);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context unavailable');

      // Calculate canvas dimensions accounting for rotation
      // 90 and 270 degree rotations swap width and height
      const isRotated90Or270 = state.rotation === 90 || state.rotation === 270;
      const canvasWidth = isRotated90Or270 ? img.height : img.width;
      const canvasHeight = isRotated90Or270 ? img.width : img.height;

      canvas.width = canvasWidth;
      canvas.height = canvasHeight;

      // Apply filters
      const bright = 1 + state.brightness / 100;
      const cont = 1 + state.contrast / 100;
      const sat = 1 + state.saturation / 100;
      ctx.filter = `brightness(${bright}) contrast(${cont}) saturate(${sat})`;

      // Apply transforms (rotation around center, then flips)
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((state.rotation * Math.PI) / 180);
      ctx.scale(state.flippedX ? -1 : 1, state.flippedY ? -1 : 1);
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else reject(new Error('Failed to export image'));
          },
          mimeType,
          quality,
        );
      });
      const ext = mimeType.includes('/') ? mimeType.split('/')[1] || 'webp' : 'webp';

      return new File([blob], file.name.replace(/\.[^.]+$/, `.${ext}`), { type: mimeType });
    },
    [
      file,
      state.brightness,
      state.contrast,
      state.saturation,
      state.rotation,
      state.flippedX,
      state.flippedY,
    ],
  );

  return {
    brightness: state.brightness,
    adjustBrightness,
    contrast: state.contrast,
    adjustContrast,
    saturation: state.saturation,
    adjustSaturation,
    rotation: state.rotation,
    rotate,
    flipX: state.flippedX,
    flipY: state.flippedY,
    flip,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    resetAll,
    exportImage,
  };
}
