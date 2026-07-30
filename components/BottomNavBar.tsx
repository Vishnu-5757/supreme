// components/BottomNavBar.tsx
import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { usePermissionContext } from '../hooks/PermissionContext';

const THEME = {
  primary: '#8E1C1C',
  text: '#111827',
  inactive: '#8B909A',
};

const ALL_TABS = [
  { icon: 'monitor-dashboard',     label: 'Dashboard', screen: 'Dashboard', module: 'dashboard' },
  { icon: 'tools',                 label: 'Service',   screen: 'Service',   module: 'service'   },
  { icon: 'briefcase-outline',     label: 'Projects',  screen: 'Projects',  module: 'project'   },
  { icon: 'account-group-outline', label: 'Leads',     screen: 'Leads',     module: 'lead'      },
  { icon: 'shield-crown-outline',  label: 'Users',     screen: 'Users',     module: 'users'     },
];

// ─── Single tab item ──────────────────────────────────────────────────────────
const NavTabItem = ({ tab, active, hasAccess, onPress }: any) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const animateIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.92,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const animateOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 8,
    }).start();
    onPress();
  };

  return (
    <TouchableOpacity
      style={styles.bottomNavItem}
      onPressIn={animateIn}
      onPressOut={animateOut}
      activeOpacity={1}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
        {/* Active pill — always in flow to prevent height shift between tabs */}
        <View style={[styles.activePill, !(active && hasAccess) && { backgroundColor: 'transparent' }]} />
        <View style={{ position: 'relative' }}>
          <MaterialCommunityIcons
            name={tab.icon}
            size={active ? 25 : 22}
            color={active ? THEME.primary : hasAccess ? THEME.inactive : '#C4C9D4'}
          />
          {!hasAccess && (
            <View style={styles.lockBadge}>
              <MaterialCommunityIcons name="lock" size={7} color="#fff" />
            </View>
          )}
        </View>
        <Text
          style={[
            styles.bottomNavLabel,
            active && hasAccess && { color: THEME.primary, fontWeight: '800' },
            !hasAccess && { color: '#C4C9D4' },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ─── Bottom Nav Bar ───────────────────────────────────────────────────────────
export const BottomNavBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { canAccess, isSuperuser, loading } = usePermissionContext();
  if (!state || state.index === undefined) return null;

  // Show all tabs for superuser; otherwise filter by permission
  // Always show all tabs — each screen handles its own permission check
  const visibleTabs = ALL_TABS;

  // Don't render anything while permissions are still loading
  if (loading) return null;

  return (
    <View style={[styles.bottomNavOuter, { paddingBottom: Math.max(insets.bottom, 6) }]}>
    <View style={styles.bottomNav}>
      {visibleTabs.map((tab) => {
        const routeIndex = state.routes.findIndex((r: any) => r.name === tab.screen);
        const active = state.index === routeIndex;
        const hasAccess = isSuperuser || canAccess(tab.module);

        const handlePress = () => {
          // Navigate regardless of permission — screen shows NoAccessScreen if restricted
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[routeIndex]?.key,
            canPreventDefault: true,
          });
          if (!active && !event.defaultPrevented) {
            navigation.navigate(tab.screen);
          }
        };

        return (
          <NavTabItem
            key={tab.screen}
            tab={tab}
            active={active}
            hasAccess={hasAccess}
            onPress={handlePress}
          />
        );
      })}
    </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNavOuter: {
    backgroundColor: 'transparent',
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingTop: 5,
    paddingBottom: 5,
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -2 },
    elevation: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 2,
  },
  bottomNavLabel: {
    fontSize: 10,
    color: '#8B909A',
    marginTop: 3,
    fontWeight: '600',
  },
  activePill: {
    width: 32,
    height: 3,
    backgroundColor: THEME.primary,
    borderRadius: 999,
    marginBottom: 4,
  },
  lockBadge: {
    position: 'absolute',
    bottom: -3,
    right: -5,
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: '#8B909A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
