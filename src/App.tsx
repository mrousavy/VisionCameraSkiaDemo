import React, {useEffect, useMemo, useState} from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import {TensorflowModel, useTensorflowModel} from 'react-native-fast-tflite';
import {
  Camera,
  useCameraDevices,
  useSkiaFrameProcessor,
} from 'react-native-vision-camera';
import {resize} from './resizePlugin';
import {getBestFormat} from './formatFilter';
import {PaintStyle, Skia, useFont} from '@shopify/react-native-skia';

function tensorToString(tensor: TensorflowModel['inputs'][number]): string {
  return `${tensor.dataType} [${tensor.shape}]`;
}

function App(): JSX.Element {
  const [hasPermission, setHasPermission] = useState(false);
  const [position, setPosition] = useState<'back' | 'front'>('front');
  const devices = useCameraDevices('wide-angle-camera');
  const device = devices[position];
  const format = useMemo(
    () => (device != null ? getBestFormat(device, 300, 300) : undefined),
    [device],
  );
  console.log(format?.videoWidth, format?.videoHeight);

  const plugin = useTensorflowModel(
    require('./assets/lite-model_movenet_singlepose_lightning_tflite_int8_4.tflite'),
  );

  useEffect(() => {
    Camera.requestCameraPermission().then(p =>
      setHasPermission(p === 'granted'),
    );
  }, []);

  useEffect(() => {
    const model = plugin.model;
    if (model == null) {
      return;
    }
    console.log(
      `Model: ${model.inputs.map(tensorToString)} -> ${model.outputs.map(
        tensorToString,
      )}`,
    );
  }, [plugin]);

  const inputTensor = plugin.model?.inputs[0];
  const inputWidth = inputTensor?.shape[1] ?? 0;
  const inputHeight = inputTensor?.shape[2] ?? 0;
  if (inputTensor != null) {
    console.log(
      `Input: ${inputTensor.dataType} ${inputWidth} x ${inputHeight}`,
    );
  }

  const paint = Skia.Paint();
  paint.setStyle(PaintStyle.Fill);
  paint.setStrokeWidth(5);
  paint.setColor(Skia.Color('white'));

  const dotSize = 5;

  const lines = [
    // left shoulder -> elbow
    5, 7,
    // right shoulder -> elbow
    6, 8,
    // left elbow -> wrist
    7, 9,
    // right elbow -> wrist
    8, 10,
    // left hip -> knee
    11, 13,
    // right hip -> knee
    12, 14,
    // left knee -> ankle
    13, 15,
    // right knee -> ankle
    14, 16,

    // left hip -> right hip
    11, 12,
    // left shoulder -> right shoulder
    5, 6,
    // left shoulder -> left hip
    5, 11,
    // right shoulder -> right hip
    6, 12,
  ];

  const EMOJI_SIZE = 50;
  const emojiFont = useFont(
    require('./assets/NotoEmoji-Medium.ttf'),
    EMOJI_SIZE,
    e => console.error(e),
  );

  const fillColor = Skia.Color('black');
  const fillPaint = Skia.Paint();
  fillPaint.setColor(fillColor);

  const frameProcessor = useSkiaFrameProcessor(
    frame => {
      'worklet';

      if (plugin.model != null) {
        const smaller = resize(frame, inputWidth, inputHeight);
        const outputs = plugin.model.runSync([smaller]);

        const output = outputs[0];
        const frameWidth = frame.width;
        const frameHeight = frame.height;

        const rect = Skia.XYWHRect(0, 0, frameWidth, frameHeight);
        frame.drawRect(rect, fillPaint);

        for (let i = 0; i < lines.length; i += 2) {
          const from = lines[i];
          const to = lines[i + 1];

          const confidence = output[from * 3 + 2];
          if (confidence < 0.5) {
            continue;
          }

          frame.drawLine(
            output[from * 3 + 1] * frameWidth,
            output[from * 3] * frameHeight,
            output[to * 3 + 1] * frameWidth,
            output[to * 3] * frameHeight,
            paint,
          );
        }

        if (emojiFont != null) {
          const faceConfidence = output[2];
          if (faceConfidence > 0.5) {
            const noseY = output[0] * frame.height + EMOJI_SIZE * 0.3;
            const noseX = output[1] * frame.width - EMOJI_SIZE / 2;
            frame.drawText('😄', noseX, noseY, paint, emojiFont);
          }
        }
      }
    },
    [plugin, paint, dotSize, emojiFont],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {!hasPermission && <Text style={styles.text}>No Camera Permission.</Text>}
      {hasPermission && device != null && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          format={format}
          isActive={true}
          frameProcessor={frameProcessor}
          pixelFormat="rgb"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  text: {
    color: 'white',
    fontSize: 20,
  },
});

export default App;
