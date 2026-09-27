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
export function compressImageFile(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'));
      return;
    }

    if (!file.type.startsWith('image/')) {
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

      const img = new Image();
      img.onerror = () => reject(new Error('Could not decode image'));
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio bounded by maxWidth & maxHeight
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
          // If canvas context fails, return original data URL
          resolve(result);
          return;
        }

        // Fill background with white in case of transparent PNG converted to JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw image smoothly with high quality
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to compact JPEG data URL
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.src = result;
    };

    reader.readAsDataURL(file);
  });
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
