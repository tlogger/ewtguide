export const MAX_POI_PHOTO_BYTES = 307_200; // 300 KB
const MAX_DIMENSION = 1200;
const QUALITY_STEPS = [0.75, 0.6, 0.45];

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('이미지를 읽을 수 없습니다.'));
    };
    img.src = objectUrl;
  });
}

/**
 * Resize image to max 1200px and encode as WebP (fallback JPEG) under 300KB.
 */
export async function compressPoiPhotoToWebP(
  file: File,
  maxBytes: number = MAX_POI_PHOTO_BYTES
): Promise<Blob> {
  const img = await loadImageFromFile(file);
  let width = img.width;
  let height = img.height;

  if (width > height) {
    if (width > MAX_DIMENSION) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    }
  } else if (height > MAX_DIMENSION) {
    width = Math.round((width * MAX_DIMENSION) / height);
    height = MAX_DIMENSION;
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('이미지 압축 컨텍스트를 초기화할 수 없습니다.');
  }
  ctx.drawImage(img, 0, 0, width, height);

  for (const mime of ['image/webp', 'image/jpeg']) {
    for (const quality of QUALITY_STEPS) {
      const blob = await canvasToBlob(canvas, mime, quality);
      if (blob && blob.size <= maxBytes && (blob.type === 'image/webp' || blob.type === 'image/jpeg')) {
        return blob;
      }
    }
  }

  throw new Error('이미지 용량이 300KB를 초과합니다. 더 작은 사진을 선택해 주세요.');
}
