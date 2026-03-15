/**
 * Client-Side Image Compression Utility
 * Compresses images in the browser before uploading to reduce file size and upload time
 * 
 * OPTIMIZED: Now uses Web Workers for non-blocking compression when available
 */

import { 
  compressImageInWorker, 
  isWorkerCompressionSupported,
  terminateWorker 
} from './imageCompressionWorker';

// Compression settings optimized for speed
const DEFAULT_MAX_WIDTH = 800; // Reduced from 1200 for faster processing
const DEFAULT_MAX_HEIGHT = 800;
const DEFAULT_QUALITY = 0.7;
const COMPRESSION_TIMEOUT = 15000; // 15 second timeout

/**
 * Compress an image file using canvas (main thread fallback)
 * @param file - The image file to compress
<<<<<<< HEAD
 * @param maxWidth - Maximum width in pixels (default: 1200)
 * @param quality - JPEG quality 0-1 (default: 0.6 for speed)
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
=======
 * @param maxWidth - Maximum width in pixels
 * @param quality - JPEG quality 0-1
>>>>>>> 1d6d06858edb1b454edb1607a9d8c119464b3b64
 * @returns Promise with compressed file and metadata
 */
async function compressImageMainThread(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    type?: string;
    timeoutMs?: number;
  } = {}
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}> {
  const {
    maxWidth = 800, // Reduced from 1200 for faster processing
    maxHeight = 800, // Reduced from 1200 for faster processing
    quality = 0.6, // Reduced from 0.7 for faster processing
    type = 'image/jpeg',
    timeoutMs = 5000 // 5 second default timeout
  } = options;

  return new Promise((resolve, reject) => {
    // Set up timeout
    const timeoutId = setTimeout(() => {
      reject(new Error(`Image compression timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    const reader = new FileReader();
    
    reader.onload = (event) => {
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        
        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          clearTimeout(timeoutId);
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        // Use faster quality scaling (medium is faster than high)
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium'; // Changed from 'high' for speed
        
        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to blob with compression
        canvas.toBlob(
          (blob) => {
            clearTimeout(timeoutId); // Clear timeout on success
            
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            
            // Create new file from blob
            const compressedFile = new File([blob], file.name, {
              type: type,
              lastModified: Date.now()
            });
            
            const originalSize = file.size;
            const compressedSize = blob.size;
            const compressionRatio = ((originalSize - compressedSize) / originalSize) * 100;
            
            console.log('[ClientCompression] Image compressed:', {
              originalSize: `${(originalSize / 1024).toFixed(2)}KB`,
              compressedSize: `${(compressedSize / 1024).toFixed(2)}KB`,
              compressionRatio: `${compressionRatio.toFixed(1)}%`,
              dimensions: `${width}x${height}`,
              quality: quality
            });
            
            resolve({
              file: compressedFile,
              originalSize,
              compressedSize,
              compressionRatio,
              width,
              height
            });
          },
          type,
          quality
        );
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to load image for compression'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to read file for compression'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Check if image compression is needed
 * @param file - The image file to check
 * @param maxSizeMB - Maximum size in MB before compression is required
 * @returns boolean indicating if compression is recommended
 */
export function shouldCompressImage(file: File, maxSizeMB: number = 1): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size > maxSizeBytes;
}

/**
 * Get image dimensions without loading full image
 * @param file - The image file
 * @returns Promise with width and height
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

/**
 * Process image for upload with automatic compression if needed
 * @param file - The image file
 * @param options - Compression options
 * @returns Processed file ready for upload
 */
export async function processImageForUpload(
  file: File,
  options: {
    maxWidth?: number;
    quality?: number;
    autoCompress?: boolean;
    maxSizeMB?: number;
  } = {}
): Promise<File> {
  const {
    maxWidth = 1200,
    quality = 0.7,
    autoCompress = true,
    maxSizeMB = 1
  } = options;

  // Check if compression is needed
  if (!autoCompress || !shouldCompressImage(file, maxSizeMB)) {
    console.log('[ClientCompression] Image size OK, no compression needed:', {
      size: `${(file.size / 1024).toFixed(2)}KB`,
      maxSize: `${maxSizeMB}MB`
    });
    return file;
  }

  try {
    const result = await compressImage(file, {
      maxWidth,
      quality,
      type: file.type || 'image/jpeg'
    });

    // Only use compressed if it's actually smaller
    if (result.compressedSize < result.originalSize) {
      console.log('[ClientCompression] Using compressed image');
      return result.file;
    } else {
      console.log('[ClientCompression] Compressed image not smaller, using original');
      return file;
    }
  } catch (error) {
    console.warn('[ClientCompression] Compression failed, using original:', error);
    return file;
  }
}

/**
 * Compress an image file with automatic Web Worker support
 * Uses Web Worker for non-blocking compression when available, falls back to main thread
 * 
 * NOTE: Web Worker is disabled by default to avoid compatibility issues on mobile Safari
 * and other environments where OffscreenCanvas may not be available or reliable.
 * 
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise with compressed file and metadata
 */
export async function compressImage(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    type?: string;
    useWorker?: boolean; // Allow forcing worker on/off
  } = {}
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}> {
  const startTime = performance.now();
  
  const {
    maxWidth = DEFAULT_MAX_WIDTH,
    maxHeight = DEFAULT_MAX_HEIGHT,
    quality = DEFAULT_QUALITY,
    type = 'image/jpeg',
    useWorker = false // DISABLED by default - use main thread for better compatibility
  } = options;

  // Check if we should use Web Worker
  const workerSupported = isWorkerCompressionSupported();
  const shouldUseWorker = useWorker && workerSupported;
  
  console.log('[ClientCompression] Starting compression:', {
    fileName: file.name,
    fileSize: `${(file.size / 1024).toFixed(2)}KB`,
    useWorker: shouldUseWorker,
    workerSupported,
    settings: { maxWidth, maxHeight, quality }
  });

  try {
    let result;
    
    if (shouldUseWorker) {
      // Use Web Worker for non-blocking compression
      console.log('[ClientCompression] Using Web Worker for compression');
      result = await compressImageInWorker(file, {
        maxWidth,
        maxHeight,
        quality,
        timeout: COMPRESSION_TIMEOUT
      });
    } else {
      // Fallback to main thread
      if (!workerSupported) {
        console.log('[ClientCompression] Web Worker not supported, using main thread');
      } else {
        console.log('[ClientCompression] Worker disabled for compatibility, using main thread');
      }
      
      result = await compressImageMainThread(file, {
        maxWidth,
        maxHeight,
        quality,
        type
      });
    }

    const totalTime = performance.now() - startTime;
    
    console.log('[ClientCompression] Compression complete:', {
      method: shouldUseWorker ? 'Web Worker' : 'Main Thread',
      totalTime: `${totalTime.toFixed(0)}ms`,
      originalSize: `${(result.originalSize / 1024).toFixed(2)}KB`,
      compressedSize: `${(result.compressedSize / 1024).toFixed(2)}KB`,
      compressionRatio: `${result.compressionRatio.toFixed(1)}%`,
      dimensions: `${result.width}x${result.height}`
    });

    return result;
    
  } catch (error) {
    const errorTime = performance.now() - startTime;
    console.error(`[ClientCompression] Compression failed after ${errorTime.toFixed(0)}ms:`, error);
    
    // If worker failed, try main thread as fallback
    if (shouldUseWorker && error instanceof Error && 
        (error.message.includes('Worker') || error.message.includes('timeout'))) {
      console.log('[ClientCompression] Worker failed, falling back to main thread');
      try {
        return await compressImageMainThread(file, {
          maxWidth,
          maxHeight,
          quality,
          type
        });
      } catch (fallbackError) {
        console.error('[ClientCompression] Main thread fallback also failed:', fallbackError);
      }
    }
    
    throw error;
  }
}

/**
 * Compress image with progress callback
 * Provides real-time progress updates during compression
 * 
 * @param file - The image file to compress
 * @param options - Compression options
 * @param onProgress - Callback for progress updates (0-100)
 * @returns Promise with compressed file
 */
export async function compressImageWithProgress(
  file: File,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    type?: string;
  } = {},
  onProgress?: (progress: number) => void
): Promise<{
  file: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  width: number;
  height: number;
}> {
  // Simulate progress since actual compression doesn't provide granular progress
  if (onProgress) {
    onProgress(0);
    
    // Quick initial progress
    setTimeout(() => onProgress(25), 50);
    setTimeout(() => onProgress(50), 100);
  }
  
  const result = await compressImage(file, options);
  
  if (onProgress) {
    onProgress(75);
    setTimeout(() => onProgress(100), 50);
  }
  
  return result;
}

/**
 * Quick compress for immediate preview (lower quality, faster)
 * Then full compress in background
 * 
 * @param file - The image file to compress
 * @returns Object with quick result and promise for full result
 */
export function compressImageProgressive(
  file: File
): {
  quick: Promise<{
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
  }>;
  full: Promise<{
    file: File;
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
    width: number;
    height: number;
  }>;
} {
  // Quick compression for immediate use (lower quality, smaller size)
  // useWorker defaults to false in compressImage for compatibility
  const quick = compressImage(file, {
    maxWidth: 400, // Small for fast processing
    maxHeight: 400,
    quality: 0.6
  });
  
  // Full compression for upload (higher quality, larger size)
  // useWorker defaults to false in compressImage for compatibility
  const full = compressImage(file, {
    maxWidth: DEFAULT_MAX_WIDTH,
    maxHeight: DEFAULT_MAX_HEIGHT,
    quality: DEFAULT_QUALITY
  });
  
  return { quick, full };
}

/**
 * Cleanup function - terminate worker when done
 * Call this when component unmounts or when you know no more compressions are needed
 */
export { terminateWorker };

// Re-export worker support check
export { isWorkerCompressionSupported };
