import {Frame} from 'react-native-vision-camera';

// Cache array to prevent it from being constantly allocated
const CACHE_ID = '__cachedArrayForResizer';
function getArrayFromCache(size: number): Int8Array {
  'worklet';
  if (global[CACHE_ID] == null || global[CACHE_ID].length != size) {
    global[CACHE_ID] = new Int8Array(size);
  }
  return global[CACHE_ID];
}

/**
 * Resizes the given Frame to the given target width and height.
 * For 1920x1080 -> 192x192 Frames, this takes roughly 5ms on an iPhone 11 Pro.
 */
export function resize(frame: Frame, width: number, height: number): Int8Array {
  'worklet';

  const inputWidth = frame.width;
  const inputHeight = frame.height;
  const targetWidth = width;
  const targetHeight = height;

  const arrayData = frame.toArrayBuffer();

  let yOffset = Math.max((inputHeight - inputWidth) / 2, 0);
  let xOffset = Math.max((inputWidth - inputHeight) / 2, 0);

  const outputFrame = getArrayFromCache(targetWidth * targetHeight * 3);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      // Map destination pixel position to source pixel
      const srcX = Math.floor((x / targetWidth) * (inputWidth + xOffset));
      const srcY = Math.floor((y / targetHeight) * (inputHeight + yOffset));

      // Compute the source and destination index
      const srcIndex = (srcY * (inputWidth + xOffset) + srcX) * 4; // 4 for BGRA
      const destIndex = (y * targetWidth + x) * 3; // 3 for RGB

      // Convert from BGRA to RGB
      outputFrame[destIndex] = arrayData[srcIndex + 2]; // R
      outputFrame[destIndex + 1] = arrayData[srcIndex + 1]; // G
      outputFrame[destIndex + 2] = arrayData[srcIndex]; // B
    }
  }

  return outputFrame;
}
