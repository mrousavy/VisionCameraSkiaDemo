import React, {useEffect, useMemo, useState} from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import {TensorflowModel, useTensorflowModel} from 'react-native-fast-tflite';
import {
  Camera,
  useCameraDevices,
  useFrameProcessor,
} from 'react-native-vision-camera';
import {resize} from './resizePlugin';
import {getBestFormat} from './formatFilter';

function tensorToString(tensor: TensorflowModel['inputs'][number]): string {
  return `${tensor.dataType} [${tensor.shape}]`;
}

function App(): JSX.Element {
  const [hasPermission, setHasPermission] = useState(false);
  const [position, setPosition] = useState<'back' | 'front'>('front');
  const devices = useCameraDevices('wide-angle-camera');
  const device = devices[position];
  const format = useMemo(
    () => (device != null ? getBestFormat(device, 720, 1080) : undefined),
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

  const frameProcessor = useFrameProcessor(
    frame => {
      'worklet';

      if (plugin.model != null) {
        const start = performance.now();
        const smaller = resize(frame, 192, 192);
        const outputs = plugin.model.runSync([smaller]);
        const end = performance.now();
        console.log(
          `Model returned ${outputs.length} outputs in ${end - start}ms!`,
        );

        const output = outputs[0];
        // X coord
        const x = output[0];
        // = output[0] Y coord
        const y = output[1];
        // = output[0] 17 landmarks of pose
        const nose = output[2];
        const leftEye = output[3];
        const rightEye = output[4];
        const leftEar = output[5];
        const rightEar = output[6];
        const leftShoulder = output[7];
        const rightShoulder = output[8];
        const leftElbow = output[9];
        const rightElbow = output[10];
        const leftWrist = output[11];
        const rightWrist = output[12];
        const leftHip = output[13];
        const rightHip = output[14];
        const leftKnee = output[15];
        const rightKnee = output[16];
        const leftAnkle = output[17];
        const rightAnkle = output[18];
        // = output[0] confidences of each channel
        const confidence1 = output[19];
        const confidence2 = output[20];
        const confidence3 = output[21];

        console.log(
          `Confidence: ${confidence1} | ${confidence2} | ${confidence3}`,
        );
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
