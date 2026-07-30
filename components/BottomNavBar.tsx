// components/BottomNavBar.tsx

import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { usePermissionContext } from '../hooks/PermissionContext';

const THEME = {
  primary: '#8E1C1C',
  text: '#111827',
  inactive: '#8B909A',
  disabled: '#C4C9D4',
};

const NAV_HORIZONTAL_PADDING = 6;

const ALL_TABS = [
  {
    icon: 'monitor-dashboard',
    label: 'Dashboard',
    screen: 'Dashboard',
    module: 'dashboard',
  },
  {
    icon: 'tools',
    label: 'Service',
    screen: 'Service',
    module: 'service',
  },
  {
    icon: 'briefcase-outline',
    label: 'Projects',
    screen: 'Projects',
    module: 'project',
  },
  {
    icon: 'account-group-outline',
    label: 'Leads',
    screen: 'Leads',
    module: 'lead',
  },
  {
    icon: 'shield-crown-outline',
    label: 'Users',
    screen: 'Users',
    module: 'users',
  },
];

type TabItem = (typeof ALL_TABS)[number];

type NavTabItemProps = {
  tab: TabItem;
  active: boolean;
  hasAccess: boolean;
  onPress: () => void;
};

const NavTabItem = ({
  tab,
  active,
  hasAccess,
  onPress,
}: NavTabItemProps) => {
  const pressScale = useRef(new Animated.Value(1)).current;
  const activeProgress = useRef(
    new Animated.Value(active ? 1 : 0),
  ).current;

  useEffect(() => {
    Animated.spring(activeProgress, {
      toValue: active ? 1 : 0,
      damping: 18,
      stiffness: 210,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [active, activeProgress]);

  const handlePressIn = () => {
    Animated.spring(pressScale, {
      toValue: 0.9,
      damping: 18,
      stiffness: 320,
      mass: 0.65,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(pressScale, {
      toValue: 1,
      damping: 14,
      stiffness: 260,
      mass: 0.7,
      useNativeDriver: true,
    }).start();

    onPress();
  };

  const iconTranslateY = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -2],
  });

  const iconScale = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.07],
  });

  const labelOpacity = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.72, 1],
  });

  const indicatorScale = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 1],
  });

  const indicatorOpacity = activeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const iconColor = !hasAccess
    ? THEME.disabled
    : active
      ? THEME.primary
      : THEME.inactive;

  return (
    <TouchableOpacity
      style={styles.bottomNavItem}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={tab.label}
      accessibilityState={{
        selected: active,
        disabled: !hasAccess,
      }}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [{ scale: pressScale }],
          },
        ]}
      >
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [
                { translateY: iconTranslateY },
                { scale: iconScale },
              ],
            },
          ]}
        >
          <MaterialCommunityIcons
            name={tab.icon}
            size={active ? 23 : 21}
            color={iconColor}
          />

          {!hasAccess && (
            <View style={styles.lockBadge}>
              <MaterialCommunityIcons
                name="lock"
                size={7}
                color="#FFFFFF"
              />
            </View>
          )}
        </Animated.View>

        <Animated.Text
          numberOfLines={1}
          style={[
            styles.bottomNavLabel,
            {
              opacity: labelOpacity,
            },
            active && hasAccess && styles.activeNavLabel,
            !hasAccess && styles.disabledNavLabel,
          ]}
        >
          {tab.label}
        </Animated.Text>

        <Animated.View
          style={[
            styles.activeIndicator,
            {
              opacity: indicatorOpacity,
              transform: [{ scale: indicatorScale }],
            },
          ]}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export const BottomNavBar = ({ state, navigation }: any) => {
  const insets = useSafeAreaInsets();

  const {
    canAccess,
    isSuperuser,
    loading,
  } = usePermissionContext();

  const [navWidth, setNavWidth] = useState(0);

  const glassTranslateX = useRef(new Animated.Value(0)).current;
  const glassScaleX = useRef(new Animated.Value(1)).current;
  const glassScaleY = useRef(new Animated.Value(1)).current;

  const visibleTabs = ALL_TABS;

  const currentRouteName =
    state?.routes?.[state?.index]?.name ?? visibleTabs[0].screen;

  const foundActiveIndex = visibleTabs.findIndex(
    tab => tab.screen === currentRouteName,
  );

  const activeTabIndex =
    foundActiveIndex >= 0 ? foundActiveIndex : 0;

  const availableWidth = Math.max(
    0,
    navWidth - NAV_HORIZONTAL_PADDING * 2,
  );

  const tabWidth =
    availableWidth > 0
      ? availableWidth / visibleTabs.length
      : 0;

  useEffect(() => {
    if (tabWidth <= 0) {
      return;
    }

    Animated.parallel([
      Animated.spring(glassTranslateX, {
        toValue: activeTabIndex * tabWidth,
        damping: 20,
        stiffness: 185,
        mass: 0.86,
        useNativeDriver: true,
      }),

      Animated.sequence([
        Animated.parallel([
          Animated.timing(glassScaleX, {
            toValue: 0.88,
            duration: 90,
            useNativeDriver: true,
          }),
          Animated.timing(glassScaleY, {
            toValue: 1.06,
            duration: 90,
            useNativeDriver: true,
          }),
        ]),

        Animated.parallel([
          Animated.spring(glassScaleX, {
            toValue: 1,
            damping: 13,
            stiffness: 220,
            mass: 0.65,
            useNativeDriver: true,
          }),
          Animated.spring(glassScaleY, {
            toValue: 1,
            damping: 13,
            stiffness: 220,
            mass: 0.65,
            useNativeDriver: true,
          }),
        ]),
      ]),
    ]).start();
  }, [
    activeTabIndex,
    glassScaleX,
    glassScaleY,
    glassTranslateX,
    tabWidth,
  ]);

  const handleNavLayout = (event: LayoutChangeEvent) => {
    const measuredWidth = event.nativeEvent.layout.width;

    setNavWidth(previousWidth => {
      if (Math.abs(previousWidth - measuredWidth) < 1) {
        return previousWidth;
      }

      return measuredWidth;
    });
  };

  if (!state || state.index === undefined || loading) {
    return null;
  }

  const activeRoute = state.routes[state.index];

  if (activeRoute?.params?.hideTabBar) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.bottomNavOuter,
        {
          paddingBottom: Math.max(insets.bottom, 10),
        },
      ]}
    >
      <View
        style={styles.bottomNavShadow}
        onLayout={handleNavLayout}
      >
        {/* Main glass background */}
        <View style={styles.navBackgroundClip}>
          <BlurView
            intensity={70}
            tint="light"
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.navWhiteTint} />

          <View style={styles.navTopReflection} />
        </View>

        {/* Sliding glass selection orb */}
        {tabWidth > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.slidingGlassPosition,
              {
                left: NAV_HORIZONTAL_PADDING,
                width: tabWidth,
                transform: [
                  { translateX: glassTranslateX },
                  { scaleX: glassScaleX },
                  { scaleY: glassScaleY },
                ],
              },
            ]}
          >
            <View style={styles.slidingGlassClip}>
              <BlurView
                intensity={95}
                tint="light"
                style={StyleSheet.absoluteFillObject}
              />

              <View style={styles.glassPrimaryTint} />

              <View style={styles.glassTopGlow} />

              <View style={styles.glassInnerBorder} />

              <View style={styles.glassBottomGlow} />
            </View>
          </Animated.View>
        )}

        <View style={styles.tabsRow}>
          {visibleTabs.map(tab => {
            const routeIndex = state.routes.findIndex(
              (route: any) => route.name === tab.screen,
            );

            const active =
              routeIndex >= 0 && state.index === routeIndex;

            const hasAccess =
              isSuperuser || canAccess(tab.module);

            const handlePress = () => {
              if (routeIndex < 0) {
                navigation.navigate(tab.screen);
                return;
              }

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
    </View>
  );
};

const styles = StyleSheet.create({
 bottomNavOuter: {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,

  paddingHorizontal: 16,
  paddingTop: 10,

  backgroundColor: 'transparent',

  zIndex: 100,
  elevation: 0,
},
bottomNavShadow: {
  position: 'relative',
  minHeight: 70,

  borderRadius: 28,

  shadowColor: '#0F172A',
  shadowOpacity: 0.16,
  shadowRadius: 20,
  shadowOffset: {
    width: 0,
    height: 8,
  },

  elevation: 16,
},
  navBackgroundClip: {
    ...StyleSheet.absoluteFillObject,

    overflow: 'hidden',
    borderRadius: 28,

    backgroundColor: 'rgba(255,255,255,0.74)',

    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.90)',
  },

  navWhiteTint: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: 'rgba(255,255,255,0.34)',
  },

  navTopReflection: {
    position: 'absolute',

    top: 1,
    left: 22,
    right: 22,

    height: 1,

    borderRadius: 1,
    backgroundColor: 'rgba(255,255,255,0.96)',
  },
tabsRow: {
  minHeight: 70,

  flexDirection: 'row',
  alignItems: 'center',

  paddingHorizontal: NAV_HORIZONTAL_PADDING,

  // Slightly more upper breathing space
  paddingTop: 8,
  paddingBottom: 4,

  borderRadius: 27,

  zIndex: 3,
},
  bottomNavItem: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    zIndex: 3,
  },

tabContent: {
  width: '100%',
  minHeight: 56,

  alignItems: 'center',
  justifyContent: 'center',

  paddingTop: 1,
  paddingHorizontal: 2,
},
iconContainer: {
  position: 'relative',

  width: 34,
  height: 30,

  alignItems: 'center',
  justifyContent: 'center',
},

  bottomNavLabel: {
    marginTop: 2,

    fontSize: 9.5,
    fontWeight: '600',
    letterSpacing: 0.05,

    color: THEME.inactive,
  },

  activeNavLabel: {
    color: THEME.primary,
    fontWeight: '800',
  },

  disabledNavLabel: {
    color: THEME.disabled,
  },

  activeIndicator: {
    width: 4,
    height: 4,

    marginTop: 4,

    borderRadius: 2,
    backgroundColor: THEME.primary,

    shadowColor: THEME.primary,
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: {
      width: 0,
      height: 1,
    },

    elevation: 2,
  },

slidingGlassPosition: {
  position: 'absolute',

  // Slightly more glass space above the icon
  top: 3,
  bottom: 5,

  paddingHorizontal: 3,

  zIndex: 1,
},
slidingGlassClip: {
  flex: 1,

  overflow: 'hidden',
  borderRadius: 21,

  backgroundColor: 'rgba(255,255,255,0.30)',

  borderWidth: 1,
  borderColor: 'rgba(255,255,255,0.96)',

  shadowColor: THEME.primary,
  shadowOpacity: 0.13,
  shadowRadius: 10,
  shadowOffset: {
    width: 0,
    height: 4,
  },

  elevation: 4,
},
  glassPrimaryTint: {
    ...StyleSheet.absoluteFillObject,

    backgroundColor: 'rgba(142,28,28,0.065)',
  },

  glassInnerBorder: {
    ...StyleSheet.absoluteFillObject,

    borderRadius: 21,

    borderWidth: 1,
    borderColor: 'rgba(142,28,28,0.08)',
  },

  glassTopGlow: {
    position: 'absolute',

    top: 1,
    left: 10,
    right: 10,

    height: 2,

    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },

  glassBottomGlow: {
    position: 'absolute',

    bottom: 2,
    left: 14,
    right: 14,

    height: 1,

    borderRadius: 1,
    backgroundColor: 'rgba(142,28,28,0.14)',
  },

  lockBadge: {
    position: 'absolute',

    right: -3,
    bottom: 0,

    width: 13,
    height: 13,

    borderRadius: 7,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor: THEME.inactive,

    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
});

export default BottomNavBar;