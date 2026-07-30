// screens/NoAccessScreen.tsx
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PRIMARY = '#8E1C1C';
const BG      = '#F5F6F8';
const MUTED = '#64748B';

interface Props {
  moduleName?: string;
}

export default function NoAccessScreen({ moduleName }: Props) {
  const clockSpin   = useRef(new Animated.Value(0)).current;
  const counterSpin = useRef(new Animated.Value(0)).current;
  const hubPulse    = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentY    = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(contentFade, { toValue: 1, duration: 420, useNativeDriver: true }),
      Animated.spring(contentY, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.timing(clockSpin, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.timing(counterSpin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(hubPulse, { toValue: 0.93, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hubPulse, { toValue: 1,    duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const spinCW  = clockSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg',   '360deg'] });
  const spinCCW = counterSpin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg']  });


  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      {/* ── Header — exact same layout as the real module screens ── */}
      <SafeAreaView style={{ backgroundColor: PRIMARY }} edges={['top']}>
        <View style={s.headerWrap}>
          {/* Title row */}
          <View style={s.headerTopRow}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>{moduleName ?? 'Module'}</Text>
              <Text style={s.headerSubtitle}>Access Required</Text>
            </View>
            {/* Circular lock icon — same size as the real screen's iconBtn */}
            <View style={s.iconBtn}>
              <MaterialCommunityIcons name="lock-outline" size={18} color="#FFF" />
            </View>
          </View>

        </View>
      </SafeAreaView>

      {/* ── Body ── */}
      <View style={s.body}>
        <Animated.View style={[s.content, { opacity: contentFade, transform: [{ translateY: contentY }] }]}>
          {/* Spinning ring animation */}
          <View style={s.orbits}>
            <Animated.View style={[s.outerRing, { transform: [{ rotate: spinCCW }] }]} />
            <Animated.View style={[s.innerRing, { transform: [{ rotate: spinCW  }] }]} />
            <Animated.View style={[s.hub, { transform: [{ scale: hubPulse }] }]}>
              <MaterialCommunityIcons name="lock-minus-outline" size={26} color="#0F172A" />
            </Animated.View>
          </View>

          <Text style={s.title}>Access Required</Text>
          <Text style={s.subtitle}>
            You don't have permission to view the{moduleName ? ` ${moduleName}` : ''} workspace.
          </Text>
          <Text style={s.hint}>
            Locked out?{'  '}
            <Text style={s.hintBold}>Ask your admin for access</Text>
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: PRIMARY },

  // ── Header — matches ProjectsScreen / UsersScreen exactly ──
  headerWrap: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 2 },

  // Circular icon button — matches `iconBtn` in ProjectsScreen
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },

  // Search bar — same geometry, visually locked
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 10,
    paddingHorizontal: 12, height: 38, marginTop: 12,
  },
  searchBarLocked: { opacity: 0.45 },
  searchPlaceholder: { flex: 1, fontSize: 13, color: MUTED },

  // ── Body ──
  body: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  content: { alignItems: 'center', width: '100%' },

  // Orbit animation
  orbits: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  outerRing: {
    position: 'absolute', width: 110, height: 110, borderRadius: 55,
    borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed',
  },
  innerRing: {
    position: 'absolute', width: 84, height: 84, borderRadius: 42,
    borderWidth: 1.5, borderColor: '#94A3B8', borderStyle: 'dashed',
  },
  hub: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },

  title:    { fontSize: 20, fontWeight: '800', color: '#0F172A', marginBottom: 8, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 21, marginBottom: 14, paddingHorizontal: 8 },
  hint:     { fontSize: 13, color: '#64748B', textAlign: 'center' },
  hintBold: { color: '#0F172A', fontWeight: '700' },
});
