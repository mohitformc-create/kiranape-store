/**
 * Image compression and processing utilities for Chaurasia Kirana Store
 */

/**
 * Reads a File object and compresses/resizes it using HTML5 Canvas.
 * Returns a Base64 data URL (image/jpeg) suitable for direct storage in Firestore/localStorage.
 *
 * @param file The image file from an <input type="file">
 * @param maxWidth Maximum width in pixels (defaults to 800)
 * @param maxHeight Maximum height in pixels (defaults to 800)
 * @param quality JPEG compression quality (0.0 to 1.0, defaults to 0.82)
 */
export function compressImageDataUrl(
  dataUrl: string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!dataUrl || typeof dataUrl !== 'string') {
      reject(new Error('No image data URL provided'));
      return;
    }

    const img = new Image();
    img.onerror = () => reject(new Error('Could not decode image'));

    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        resolve(dataUrl);
        return;
      }

      // Fill background with crisp studio white in case of transparent PNG converted to JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedDataUrl);
    };

    img.src = dataUrl;
  });
}

export function compressImageFile(
  file: File | Blob,
  maxWidth = 1200,
  maxHeight = 1200,
  quality = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    if (file.type && !file.type.startsWith('image/') && file.type !== 'application/octet-stream') {
      reject(new Error('Selected file must be an image (JPEG, PNG, WEBP, etc.)'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file from device'));

    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('Failed to process file as data URL'));
        return;
      }

      compressImageDataUrl(result, maxWidth, maxHeight, quality)
        .then(resolve)
        .catch(reject);
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Converts a Base64 data URL into a binary Blob
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(';base64,');
  const contentType = parts[0]?.split(':')[1] || 'image/jpeg';
  const base64Data = parts[1] || '';
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: contentType });
}

/**
 * Converts a Base64 data URL into a standard File object
 */
export function dataUrlToFile(dataUrl: string, filename: string): File {
  const blob = dataUrlToBlob(dataUrl);
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

/**
 * Format phone number for WhatsApp international URL (strictly single country code 91)
 */
export function formatWhatsAppPhone(phone?: string): string {
  if (!phone) return '919424316081';
  let digits = phone.replace(/\D/g, '');
  // Strip leading zeros
  digits = digits.replace(/^0+/, '');
  // Strip any accidental duplicate 91 prefixes (e.g. 91919424316081)
  while (digits.startsWith('9191')) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) {
    return `91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits;
  }
  // Fallback to store owner official WhatsApp number
  return digits.length >= 10 ? `91${digits.slice(-10)}` : '919424316081';
}
