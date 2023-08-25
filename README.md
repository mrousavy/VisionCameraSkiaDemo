# VisionCameraSkiaDemo

Demo of VisionCamera + TFLite + Skia to detect your body and draw a stickman figure ontop of it in realtime - **without any native code** 🤯🕺🏼

See this blogpost: https://mrousavy.com/blog/VisionCamera-Pose-Detection-TFLite

1. [react-native-vision-camera](https://github.com/mrousavy/react-native-vision-camera) is used to stream frames from a Camera.
   1. [react-native-worklets-core](https://github.com/margelo/react-native-worklets-core) is required by VisionCamera to use Frame Processors
2. [react-native-fast-tflite](https://github.com/mrousavy/react-native-fast-tflite) is used to detect the human pose
3. [react-native-skia](https://github.com/Shopify/react-native-skia) is used to make the screen black and draw the white skeleton into the Camera preview

https://github.com/mrousavy/react-native-vision-camera/assets/15199031/00ea9c4d-2b7c-4201-bb39-56c2652084a2


