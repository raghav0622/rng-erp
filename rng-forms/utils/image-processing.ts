export interface EditorFilters {
  brightness: number;
  contrast: number;
  saturation: number;
}

function isCtxFilterSupported() {
  if (typeof document === 'undefined') return false;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  return !!ctx && 'filter' in ctx;
}

export async function resizeImageForEditor(
  src: string,
  maxDimension: number = 2000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      } else {
        resolve(src);
        return;
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(URL.createObjectURL(blob));
          else reject(new Error('Resize failed'));
        },
        'image/jpeg',
        0.95,
      );
    };
    img.onerror = () => reject(new Error('Failed to load image for resizing'));
    img.src = src;
  });
}

function applyPixelFilters(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  filters: EditorFilters,
) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const brightness = filters.brightness / 100;
  const contrast = filters.contrast / 100;
  const saturation = filters.saturation / 100;
  const intercept = 128 * (1 - contrast);

  for (let i = 0; i < data.length; i += 4) {
    let r: number = data[i]!;
    let g: number = data[i + 1]!;
    let b: number = data[i + 2]!;

    r *= brightness;
    g *= brightness;
    b *= brightness;

    r = r * contrast + intercept;
    g = g * contrast + intercept;
    b = b * contrast + intercept;

    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * saturation;
    g = lum + (g - lum) * saturation;
    b = lum + (b - lum) * saturation;

    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
  }

  ctx.putImageData(imageData, 0, 0);
}

export async function applyFiltersAndSave(
  sourceCanvas: HTMLCanvasElement,
  filters: EditorFilters,
  fileName: string = 'image.jpg',
  quality: number = 0.9,
): Promise<File | null> {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  if (isCtxFilterSupported()) {
    ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%)`;
    ctx.drawImage(sourceCanvas, 0, 0);
  } else {
    ctx.drawImage(sourceCanvas, 0, 0);
    applyPixelFilters(ctx, canvas.width, canvas.height, filters);
  }

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const file = new File([blob], fileName, { type: 'image/jpeg' });
          resolve(file);
        } else {
          resolve(null);
        }
      },
      'image/jpeg',
      quality,
    );
  });
}
