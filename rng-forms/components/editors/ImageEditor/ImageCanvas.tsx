'use client';

import { useEffect, useRef } from 'react';

interface ImageCanvasProps {
  file: File;
  brightness: number;
  contrast: number;
  saturation: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
}

// Canvas-based preview so filters apply only to the image, not the surrounding UI
const ImageCanvas = ({
  file,
  brightness,
  contrast,
  saturation,
  rotation,
  flipX,
  flipY,
}: ImageCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let revokedUrl: string | null = null;
    const img = new Image();
    const url = URL.createObjectURL(file);
    revokedUrl = url;
    img.src = url;

    img.onload = () => {
      const cw = canvas.clientWidth || 600;
      const ch = canvas.clientHeight || 420;
      // Fit image into canvas while preserving aspect ratio
      const scale = Math.min(cw / img.width, ch / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;

      canvas.width = cw;
      canvas.height = ch;

      ctx.save();
      ctx.clearRect(0, 0, cw, ch);

      // Position at center
      ctx.translate(cw / 2, ch / 2);
      // Rotation and flips
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(flipX ? -1 : 1, flipY ? -1 : 1);

      // Filters
      const bright = 1 + brightness / 100;
      const cont = 1 + contrast / 100;
      const sat = 1 + saturation / 100;
      ctx.filter = `brightness(${bright}) contrast(${cont}) saturate(${sat})`;

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
    };

    return () => {
      if (revokedUrl) URL.revokeObjectURL(revokedUrl);
    };
  }, [file, brightness, contrast, saturation, rotation, flipX, flipY]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '420px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        backgroundColor: '#f5f5f5',
      }}
    />
  );
};

export default ImageCanvas;
