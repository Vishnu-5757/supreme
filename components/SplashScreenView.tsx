import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

const { width } = Dimensions.get('window');
const ease = Easing.bezier(0.4, 0, 0.2, 1);

interface Props {
  onFinish: () => void;
}

export default function SplashScreenView({ onFinish }: Props) {
  const logoO = useSharedValue(0);
  const logoS = useSharedValue(0.9);

  const blockO = useSharedValue(0);
  const blockY = useSharedValue(14);

  const tagO  = useSharedValue(0);
  const tagSX = useSharedValue(1.18);

  useEffect(() => {
    SplashScreen.hideAsync();

    logoO.value = withTiming(1, { duration: 700, easing: ease });
    logoS.value = withSpring(1, { damping: 20, stiffness: 95 });

    blockO.value = withDelay(500, withTiming(1, { duration: 600, easing: ease }));
    blockY.value = withDelay(500, withTiming(0, { duration: 600, easing: ease }));

    tagO.value  = withDelay(1000, withTiming(1,   { duration: 700, easing: ease }));
    tagSX.value = withDelay(1000, withTiming(1.0, { duration: 900, easing: ease }));

    const timer = setTimeout(onFinish, 3000);
    return () => clearTimeout(timer);
  }, []);

  const logoStyle  = useAnimatedStyle(() => ({ opacity: logoO.value, transform: [{ scale: logoS.value }] }));
  const blockStyle = useAnimatedStyle(() => ({ opacity: blockO.value, transform: [{ translateY: blockY.value }] }));
  const tagStyle   = useAnimatedStyle(() => ({ opacity: tagO.value, transform: [{ scaleX: tagSX.value }] }));

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <Animated.Image
        source={require('../assets/SolvingSolar_logo_2048.png')}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
      />

      <Animated.View style={[styles.textBlock, blockStyle]}>
        <Animated.Text style={styles.solving}>SOLVING</Animated.Text>
        <Animated.Text style={styles.solar}>SOLAR</Animated.Text>
        <View style={styles.line} />
      </Animated.View>

      <Animated.Text style={[styles.tagline, tagStyle]}>
        POWERING A BRIGHTER TOMORROW
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: width * 0.19,
    height: width * 0.19,
    marginBottom: 26,
  },
  textBlock: {
    alignItems: 'center',
  },
  solving: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: 7,
  },
  solar: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F5A623',
    letterSpacing: 7,
    marginTop: 2,
  },
  line: {
    width: 32,
    height: 2,
    backgroundColor: '#F5A623',
    borderRadius: 2,
    marginTop: 14,
  },
  tagline: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '500',
    marginTop: 12,
  },
});
