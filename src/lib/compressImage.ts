/**
 * Compress and resize images for fast upload and display
 * - Max width: 1280px (or 1600px if needed)
 * - Convert to WebP format
 * - Quality: 0.75
 * - Target size: 250KB-800KB
 */

export interface CompressedImageResult {
  file: File;
  dataUrl: string;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    quality?: number;
    targetMinSizeKB?: number;
    targetMaxSizeKB?: number;
  } = {}
): Promise<CompressedImageResult> {
  const {
    maxWidth = 1280,
    quality = 0.75,
    targetMinSizeKB = 250,
    targetMaxSizeKB = 800,
  } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = async () => {
      try {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        // Set canvas size
        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP
        const webpBlob = await new Promise<Blob>((resolveBlob) => {
          canvas.toBlob(resolveBlob, 'image/webp', quality);
        });

        if (!webpBlob) {
          reject(new Error('Failed to compress image'));
          return;
        }

        // Check if size is within target range
        let finalBlob = webpBlob;
        let finalQuality = quality;

        // If too small, try higher quality
        if (webpBlob.size < targetMinSizeKB * 1024 && quality < 0.95) {
          finalQuality = Math.min(0.95, quality + 0.1);
          finalBlob = await new Promise<Blob>((resolveBlob) => {
            canvas.toBlob(resolveBlob, 'image/webp', finalQuality);
          }) || webpBlob;
        }

        // If still too large, reduce quality iteratively
        while (finalBlob.size > targetMaxSizeKB * 1024 && finalQuality > 0.3) {
          finalQuality -= 0.1;
          finalBlob = await new Promise<Blob>((resolveBlob) => {
            canvas.toBlob(resolveBlob, 'image/webp', finalQuality);
          }) || finalBlob;
        }

        // Create data URL for preview
        const dataUrl = await blobToDataUrl(finalBlob);

        // Create new File object
        const compressedFile = new File([finalBlob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, {
          type: 'image/webp',
          lastModified: Date.now(),
        });

        resolve({
          file: compressedFile,
          dataUrl,
          originalSize: file.size,
          compressedSize: finalBlob.size,
          width: Math.round(width),
          height: Math.round(height),
        });
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  if (typeof FileReader !== "undefined") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Fallback for environments without FileReader
  return blob.arrayBuffer().then((arrayBuffer) => {
    const base64 = arrayBufferToBase64(arrayBuffer);
    return `data:${blob.type};base64,${base64}`;
  });
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  if (typeof btoa !== "function") {
    throw new Error("This browser cannot convert files to base64. Please paste an image URL instead.");
  }

  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 8192;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize);
    for (let i = 0; i < chunk.length; i++) {
      binary += String.fromCharCode(chunk[i]);
    }
  }

  return btoa(binary);
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
