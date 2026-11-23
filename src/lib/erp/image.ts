/** Validation and downscaling for uploaded brand images (stored as data URLs). */

export const IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "image/x-icon",
  "image/vnd.microsoft.icon",
];

export const LOGO_LIMITS = { maxBytes: 1_000_000, maxDim: 512 };
export const FAVICON_LIMITS = { maxBytes: 256_000, maxDim: 128 };

/** Returns an error message, or null when the file is acceptable. */
export function validateImage(
  file: { type: string; size: number },
  maxBytes: number,
): string | null {
  if (!IMAGE_TYPES.includes(file.type)) return "Use a PNG, JPG, WebP, SVG or ICO image.";
  if (file.size > maxBytes)
    return `The image is too large. Maximum size is ${Math.round(maxBytes / 1000)} KB.`;
  return null;
}

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("The file could not be read."));
    r.readAsDataURL(file);
  });
}

/** Read an image file; raster images larger than `maxDim` are scaled down to keep storage small. */
export async function prepareImage(
  file: File,
  limits: { maxBytes: number; maxDim: number },
): Promise<string> {
  const error = validateImage(file, limits.maxBytes);
  if (error) throw new Error(error);
  const url = await readAsDataUrl(file);
  const vector = file.type === "image/svg+xml" || file.type.includes("icon");
  if (vector || typeof document === "undefined") return url;
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("The image could not be decoded."));
    el.src = url;
  });
  const scale = Math.min(1, limits.maxDim / Math.max(img.width, img.height));
  if (scale === 1) return url;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return url;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(file.type === "image/jpeg" ? "image/jpeg" : "image/png", 0.92);
}
