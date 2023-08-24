import React, {useEffect, useMemo, useState} from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import {TensorflowModel, useTensorflowModel} from 'react-native-fast-tflite';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
  useSkiaFrameProcessor,
} from 'react-native-vision-camera';
import {resize} from './resizePlugin';
import {getBestFormat} from './formatFilter';
import {Skia} from '@shopify/react-native-skia';

function tensorToString(tensor: TensorflowModel['inputs'][number]): string {
  return `${tensor.dataType} [${tensor.shape}]`;
}

function App(): JSX.Element {
  const [hasPermission, setHasPermission] = useState(false);
  const [position, setPosition] = useState<'back' | 'front'>('front');
  const devices = useCameraDevices('wide-angle-camera');
  const device = devices[position];
  const format = useMemo(
    () => (device != null ? getBestFormat(device, 360, 500) : undefined),
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

  const inputWidth = plugin.model?.inputs[0].shape[1] ?? 0;
  const inputHeight = plugin.model?.inputs[0].shape[2] ?? 0;
  console.log(plugin.model?.inputs[0]);

  const paint = Skia.Paint();
  paint.setColor(Skia.Color('red'));
  paint.setStrokeWidth(5);

  const frameProcessor = useSkiaFrameProcessor(
    frame => {
      'worklet';

      console.log(frame.width, frame.height);
      if (plugin.model != null) {
        const start = performance.now();
        const smaller = resize(frame, inputWidth, inputHeight);
        const outputs = plugin.model.runSync([smaller]);
        const end = performance.now();
        console.log(
          `Model returned ${outputs.length} outputs in ${end - start}ms!`,
        );

        const output = outputs[0];

        for (let i = 0; i < 17; i++) {
          const x = output[i * 3];
          const y = output[i * 3 + 1];
          const confidence = output[i * 3 + 2];

          if (confidence > 0.5) {
            const targetX = x * frame.width;
            const targetY = y * frame.height;

            const rect = Skia.XYWHRect(targetX - 15, targetY - 15, 30, 30);
            frame.drawRect(rect, paint);
          }
        }
      }
    },
    [plugin],
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
