import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface SkeletonProps {
  width?: number | `${number}%` | 'auto';
  height: number;
  radius?: number;
  style?: any;
}

// Single shimmer pulse block
export function Skeleton({ width = '100%', height, radius = 8, style }: SkeletonProps) {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 0.85, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4,  duration: 750, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <Animated.View
      style={[
        { backgroundColor: '#E5E7EB', borderRadius: radius, height, opacity: anim },
        width !== undefined && { width },
        style,
      ]}
    />
  );
}

// ── Ready-made skeleton layouts ───────────────────────────────────────────────

// A card row: avatar circle on left + two lines on right
export function SkeletonRow({ style }: { style?: any }) {
  return (
    <View style={[sk.row, style]}>
      <Skeleton width={44} height={44} radius={22} />
      <View style={sk.rowLines}>
        <Skeleton height={14} radius={6} style={{ marginBottom: 8 }} />
        <Skeleton width="60%" height={11} radius={6} />
      </View>
    </View>
  );
}

// A notification-style card
export function SkeletonNotifCard({ style }: { style?: any }) {
  return (
    <View style={[sk.notifCard, style]}>
      <Skeleton width={38} height={38} radius={12} />
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={13} radius={6} />
        <Skeleton width="75%" height={11} radius={6} />
        <Skeleton width="40%" height={10} radius={6} />
      </View>
    </View>
  );
}

// A simple list-item row (no avatar)
export function SkeletonListItem({ style }: { style?: any }) {
  return (
    <View style={[sk.listItem, style]}>
      <View style={{ flex: 1, gap: 8 }}>
        <Skeleton height={14} radius={6} />
        <Skeleton width="65%" height={11} radius={6} />
      </View>
      <Skeleton width={60} height={24} radius={8} />
    </View>
  );
}

// A stat card (number + label)
export function SkeletonStatCard({ style }: { style?: any }) {
  return (
    <View style={[sk.statCard, style]}>
      <Skeleton width={40} height={40} radius={12} style={{ marginBottom: 10 }} />
      <Skeleton width="70%" height={20} radius={6} style={{ marginBottom: 8 }} />
      <Skeleton width="50%" height={12} radius={6} />
    </View>
  );
}

// ── Full-screen premium skeleton (shown while a guarded tab loads) ──────────
// Mirrors the maroon header + rounded white body chrome shared by
// Service / Projects / Leads / Users so the transition feels seamless
// instead of a jarring spinner-on-blank-screen flash.
export function AppScreenSkeleton({ title = 'Loading' }: { title?: string }) {
  return (
    <View style={sk.screen}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#8E1C1C' }}>
        <View style={sk.header}>
          <View style={sk.headerTopRow}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Skeleton width={Math.min(140, title.length * 13 + 40)} height={20} radius={6} style={sk.onDark} />
              <Skeleton width={70} height={11} radius={6} style={[sk.onDark, { marginTop: 6, opacity: 0.7 }]} />
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Skeleton width={34} height={34} radius={17} style={sk.onDark} />
              <Skeleton width={34} height={34} radius={17} style={sk.onDark} />
            </View>
          </View>
          <Skeleton width="100%" height={38} radius={10} style={[sk.onDark, { marginTop: 14, opacity: 0.9 }]} />
        </View>
      </SafeAreaView>

      <View style={sk.body}>
        <View style={sk.bodyHeadRow}>
          <Skeleton width={90} height={22} radius={11} />
          <Skeleton width={60} height={22} radius={11} />
        </View>
        {[0, 1, 2, 3, 4].map(i => (
          <SkeletonRow key={i} style={{ marginBottom: 12 }} />
        ))}
      </View>
    </View>
  );
}

const sk = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 14,
  },
  rowLines: { flex: 1 },

  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 14, marginBottom: 10,
  },

  listItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 14, marginBottom: 10,
  },

  statCard: {
    backgroundColor: '#FFF', borderRadius: 16,
    padding: 18, alignItems: 'flex-start',
  },

  screen: { flex: 1, backgroundColor: '#8E1C1C' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 26 },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  onDark: { backgroundColor: 'rgba(255,255,255,0.22)' },
  body: {
    flex: 1, backgroundColor: '#F5F6F8',
    marginTop: -16, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    overflow: 'hidden', padding: 16,
  },
  bodyHeadRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
});
