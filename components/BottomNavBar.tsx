import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const THEME = {
  primary: '#8E1C1C',
  text: '#111827',
  inactive: '#8B909A',
};

const TABS = [
  { icon: 'view-dashboard-outline', label: 'Dashboard', screen: 'Dashboard' },
  { icon: 'toolbox-outline', label: 'Service', screen: 'Service' },
  { icon: 'briefcase-outline', label: 'Projects', screen: 'Projects' },
  { icon: 'account-group-outline', label: 'Leads', screen: 'Leads' },
  { icon: 'account-outline', label: 'Users', screen: 'Users' },
];

const NavTabItem = ({ tab, active, onPress }: any) => {
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
        <MaterialCommunityIcons
          name={tab.icon}
          size={active ? 26 : 22}
          color={active ? THEME.primary : THEME.inactive}
        />
        <Text
          style={[
            styles.bottomNavLabel,
            active && { color: THEME.primary, fontWeight: '700' },
          ]}
        >
          {tab.label}
        </Text>
      </Animated.View>
      {active && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
};

export const BottomNavBar = ({ state, navigation, descriptors }: any) => {
  const insets = useSafeAreaInsets();

  // Safety: if state is not ready, render nothing
  if (!state || state.index === undefined) {
    return null;
  }

  return (
    <View style={[styles.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab, index) => {
        const active = state.index === index;

        const handlePress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: state.routes[index].key,
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
            onPress={handlePress}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#EEF0F3',
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
    elevation: 10,
  },
  bottomNavItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 4,
  },
  bottomNavLabel: {
    fontSize: 10,
    color: '#8B909A',
    marginTop: 4,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 16,
    height: 3,
    backgroundColor: THEME.primary,
    borderRadius: 2,
  },
});