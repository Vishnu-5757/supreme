import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet } from 'react-native';

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
});
