import React, { useEffect } from 'react';
import { View, Image, StyleSheet, StatusBar } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

// Call this BEFORE the component mounts — at module level
SplashScreen.preventAutoHideAsync();

interface Props {
  onFinish: () => void;
}

export default function SplashScreenView({ onFinish }: Props) {
  useEffect(() => {
    // Hide native splash the instant your custom UI paints
    SplashScreen.hideAsync();

    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Image
        source={require('../assets/splash_solving_solar.png')}
        style={styles.image}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});