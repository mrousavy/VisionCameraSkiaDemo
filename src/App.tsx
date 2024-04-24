import React, {useEffect, useState} from 'react';
import {Dimensions, StatusBar, StyleSheet, Text, View} from 'react-native';
import {TensorflowModel, useTensorflowModel} from 'react-native-fast-tflite';
import {useResizePlugin} from 'vision-camera-resize-plugin';
import {
  Camera,
  useCameraDevices,
  useSkiaFrameProcessor,
} from 'react-native-vision-camera';
import {PaintStyle, Skia, useFont} from '@shopify/react-native-skia';

function tensorToString(tensor: TensorflowModel['inputs'][number]): string {
  return `${tensor.dataType} [${tensor.shape}]`;
}

const LINE_WIDTH = 5;
const EMOJI_SIZE = 50;
const MIN_CONFIDENCE = 0.45;

const VIEW_WIDTH = Dimensions.get('screen').width;

function App(): JSX.Element {
  const [hasPermission, setHasPermission] = useState(false);
  const devices = useCameraDevices();
  const device = devices.find(d => d.position === 'front');
  const {resize} = useResizePlugin();

  const plugin = useTensorflowModel(
    require('./assets/lite-model_movenet_singlepose_lightning_tflite_int8_4.tflite'),
    'core-ml',
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

  // to get from px -> dp since we draw in the camera coordinate system
  const SCALE = (1080 ?? VIEW_WIDTH) / VIEW_WIDTH;

  const paint = Skia.Paint();
  paint.setStyle(PaintStyle.Fill);
  paint.setStrokeWidth(LINE_WIDTH * SCALE);
  paint.setColor(Skia.Color('white'));

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

  const emojiFont = useFont(
    require('./assets/NotoEmoji-Medium.ttf'),
    EMOJI_SIZE * SCALE,
    e => console.error(e),
  );

  const fillColor = Skia.Color('black');
  const fillPaint = Skia.Paint();
  fillPaint.setColor(fillColor);

  const frameProcessor = useSkiaFrameProcessor(
    frame => {
      'worklet';

      if (plugin.model != null) {
        const smaller = resize(frame, {
          scale: {
            width: inputWidth,
            height: inputHeight,
          },
          pixelFormat: 'rgb',
          dataType: 'uint8',
          rotation: '0deg',
        });
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
          if (confidence > MIN_CONFIDENCE) {
            frame.drawLine(
              Number(output[from * 3 + 1]) * Number(frameWidth),
              Number(output[from * 3]) * Number(frameHeight),
              Number(output[to * 3 + 1]) * Number(frameWidth),
              Number(output[to * 3]) * Number(frameHeight),
              paint,
            );
          }
        }

        if (emojiFont != null) {
          const faceConfidence = output[2];
          if (faceConfidence > MIN_CONFIDENCE) {
            const noseY = Number(output[0]) * frame.height + EMOJI_SIZE * 0.3;
            const noseX = Number(output[1]) * frame.width - EMOJI_SIZE / 2;
            frame.drawText('😄', noseX, noseY, paint, emojiFont);
          }
        }
      }
    },
    [plugin, paint, emojiFont],
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      {!hasPermission && <Text style={styles.text}>No Camera Permission.</Text>}
      {hasPermission && device != null && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
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
