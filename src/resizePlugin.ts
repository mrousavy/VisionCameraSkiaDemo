import {Frame} from 'react-native-vision-camera';

// Cache array to prevent it from being constantly allocated
const CACHE_ID = '__cachedArrayForResizer';
function getArrayFromCache(size: number): Uint8Array {
  'worklet';
  if (global[CACHE_ID] == null || global[CACHE_ID].length != size) {
    global[CACHE_ID] = new Uint8Array(size);
  }
  return global[CACHE_ID];
}

/**
 * Resizes the given Frame to the given target width and height.
 * For 4k -> 192x192 Frames, this takes roughly 5ms on an iPhone 11 Pro.
 */
export function resize(
  frame: Frame,
  width: number,
  height: number,
): Uint8Array {
  'worklet';

  const inputWidth = frame.width;
  const inputHeight = frame.height;
  const targetWidth = width;
  const targetHeight = height;

  const arrayData = frame.toArrayBuffer();

  const cropX = Math.floor((inputWidth - targetWidth) / 2);
  const cropY = Math.floor((inputHeight - targetHeight) / 2);

  const outputFrame = getArrayFromCache(targetWidth * targetHeight * 3);

  for (let y = 0; y < targetHeight; y++) {
    for (let x = 0; x < targetWidth; x++) {
      const inputX = cropX + x;
      const inputY = cropY + y;

      const inputIndex = (inputY * inputWidth + inputX) * 3;
      const outputIndex = (y * targetWidth + x) * 3;

      outputFrame[outputIndex] = arrayData[inputIndex];
      outputFrame[outputIndex + 1] = arrayData[inputIndex + 1];
      outputFrame[outputIndex + 2] = arrayData[inputIndex + 2];
    }
  }

  return outputFrame;
}
