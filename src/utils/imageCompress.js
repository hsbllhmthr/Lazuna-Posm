export const MAX_FILE_SIZE_BYTES = 180 * 1024; // ~180 KB maximum file size limit
export const MAX_IMAGE_DIMENSION = 1000; // 1000 px max width or height

/**
 * Formats byte size into human-readable string (KB, MB)
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Loads an HTMLImageElement safely from URL or ObjectURL
 */
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Only set crossOrigin for remote http/https requests, avoid taint errors on blob/data URIs
    if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Format gambar tidak didukung atau file korup'));
    img.src = src;
  });
}

/**
 * Compresses an image element to both Blob and DataURL
 * with strict dimension limits and iterative quality tuning to stay under maxBytes
 */
async function compressImageElement(img, options = {}) {
  const {
    maxDimension = MAX_IMAGE_DIMENSION,
    maxBytes = MAX_FILE_SIZE_BYTES,
    initialQuality = 0.80,
    minQuality = 0.45,
    mimeType = 'image/jpeg'
  } = options;

  let currentScale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { alpha: false });

  let quality = initialQuality;
  let finalDataUrl = null;

  for (let pass = 0; pass < 6; pass++) {
    const targetW = Math.max(1, Math.round(img.width * currentScale));
    const targetH = Math.max(1, Math.round(img.height * currentScale));

    canvas.width = targetW;
    canvas.height = targetH;

    // Fill white background for transparent PNG/WebP so it won't render black
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, targetW, targetH);

    finalDataUrl = canvas.toDataURL(mimeType, quality);

    // Approximate size from base64 string
    const approxBytes = Math.round((finalDataUrl.length - 22) * 0.75);

    if (approxBytes <= maxBytes || quality <= minQuality) {
      break;
    }

    quality -= 0.08;

    // If quality reaches minimum threshold and image is still oversized, downscale dimensions
    if (quality < minQuality && currentScale > 0.35) {
      currentScale *= 0.8;
      quality = 0.72;
    }
  }

  // Generate binary Blob for Firebase Storage
  const finalBlob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mimeType, Math.max(minQuality, quality));
  });

  const finalSize = finalBlob ? finalBlob.size : Math.round((finalDataUrl.length - 22) * 0.75);

  return {
    blob: finalBlob,
    dataUrl: finalDataUrl,
    size: finalSize,
    width: canvas.width,
    height: canvas.height
  };
}

/**
 * Primary function to compress a File object from input[type="file"]
 * @param {File} file - Original File object
 * @param {Object} options - Compression options
 * @returns {Promise<Object>} { blob, file, dataUrl, size, originalSize, ratio, formattedSize }
 */
export async function compressImageFile(file, options = {}) {
  if (!file) return null;

  const originalSize = file.size || 0;
  let objectUrl = null;

  try {
    objectUrl = URL.createObjectURL(file);
    const img = await loadImage(objectUrl);
    const result = await compressImageElement(img, options);

    const rawName = file.name || 'posm_eviden.jpg';
    const baseName = rawName.substring(0, rawName.lastIndexOf('.')) || rawName;
    const cleanFileName = `${baseName.replace(/[^a-zA-Z0-9_-]/g, '_')}_compressed.jpg`;

    const compressedFile = new File([result.blob], cleanFileName, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });

    return {
      ...result,
      file: compressedFile,
      fileName: cleanFileName,
      originalSize,
      formattedSize: formatFileSize(result.size),
      formattedOriginalSize: formatFileSize(originalSize),
      savedPercent: originalSize > result.size 
        ? Math.round(((originalSize - result.size) / originalSize) * 100) 
        : 0
    };
  } catch (canvasErr) {
    console.warn('Canvas compression fallback to direct FileReader:', canvasErr);
    // Reliable fallback for uncompressable formats (e.g. SVG, specific HEIC/RAW, or canvas crash)
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = String(reader.result);
        resolve({
          blob: file,
          file: file,
          dataUrl,
          size: file.size,
          fileName: file.name || 'image.jpg',
          originalSize,
          formattedSize: formatFileSize(file.size),
          formattedOriginalSize: formatFileSize(originalSize),
          savedPercent: 0
        });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  } finally {
    if (objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch (e) {}
    }
  }
}

/**
 * Backward-compatible helper to shrink a dataURL or URL
 */
export async function shrinkURL(url, options = {}) {
  if (!url) return null;
  try {
    const img = await loadImage(url);
    const result = await compressImageElement(img, options);
    return result.dataUrl;
  } catch (e) {
    console.warn('shrinkURL fallback failed:', e);
    return url;
  }
}

/**
 * Backward-compatible helper to compress a File directly to DataURL
 */
export async function compFile(file, options = {}) {
  try {
    const res = await compressImageFile(file, options);
    return res ? res.dataUrl : null;
  } catch (e) {
    console.error('compFile error:', e);
    return null;
  }
}
