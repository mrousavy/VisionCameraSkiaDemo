import React, {useEffect, useState} from 'react';
import {StatusBar, StyleSheet, Text, View} from 'react-native';
import {Camera, useCameraDevices} from 'react-native-vision-camera';

function App(): JSX.Element {
  const [hasPermission, setHasPermission] = useState(false);
  const [position, setPosition] = useState<'back' | 'front'>('back');
  const devices = useCameraDevices('wide-angle-camera');
  const device = devices[position];

  useEffect(() => {
    Camera.requestCameraPermission().then(p =>
      setHasPermission(p === 'granted'),
    );
  }, []);

  const frameProcessor = useFrameProcessor(frame => {
    'worklet';
    console.log(
      `${frame.timestamp}: ${frame.width}x${frame.height} (${frame.pixelFormat})`,
    );
  }, []);

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
