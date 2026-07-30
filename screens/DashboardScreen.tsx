// DashboardScreen.tsx
// Compact premium white revenue card + initial skeleton loading

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { API_BASE_URL } from '../config';

import {
  clearAuthTokens,
  getAccessToken,
  setAuthTokens,
  setSessionExpiredCallback,
  useAuthApi,
} from '../hooks/useAuthApi';

import { usePermissionContext } from '../hooks/PermissionContext';
import { userCache } from '../hooks/userCache';

import {
  clearBadge,
  getBadgeCount,
  subscribeBadge,
} from '../hooks/notifBadge';

const { width } = Dimensions.get('window');

const CARD_GAP = 12;
const CARD_WIDTH = Math.round(width * 0.34);
const DRAWER_WIDTH = Math.min(330, width * 0.82);

const THEME = {
  primary: '#8E1C1C',
  primaryDark: '#6F1515',
  primaryLight: '#FCE9E9',
  primarySoft: '#FFF5F5',

  bg: '#F5F6F8',
  card: '#FFFFFF',

  text: '#14151A',
  textSecondary: '#4B4D57',

  muted: '#787C89',
  mutedLight: '#B2B5C0',

  border: '#EAEBEF',
  borderLight: '#F4F5F8',

  success: '#1B9C63',
  successLight: '#E9FBF1',

  warning: '#CB8A12',
  warningLight: '#FFF6E7',

  danger: '#DF4448',
  dangerLight: '#FDECEC',

  info: '#3B6FE0',
  infoLight: '#EAF1FF',

  skeleton: '#E9EBF0',
};

type QualityKey =
  | 'HOT'
  | 'MEDIUM'
  | '90_PCT'
  | 'FUTURE'
  | 'LOST';

const QUALITY_MAP: Record<
  QualityKey,
  {
    label: string;
    bg: string;
    text: string;
  }
> = {
  HOT: {
    label: 'Hot',
    bg: '#FEE2E2',
    text: '#991B1B',
  },

  MEDIUM: {
    label: 'Medium',
    bg: '#FEF3C7',
    text: '#92400E',
  },

  '90_PCT': {
    label: '90%',
    bg: '#DBEAFE',
    text: '#1E40AF',
  },

  FUTURE: {
    label: 'Future',
    bg: '#EDE9FE',
    text: '#5B21B6',
  },

  LOST: {
    label: 'Lost',
    bg: '#F3F4F6',
    text: '#374151',
  },
};

type StatusKey =
  | 'new'
  | 'accepted'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

const STATUS_MAP: Record<
  StatusKey,
  {
    label: string;
    bg: string;
    text: string;
  }
> = {
  new: {
    label: 'New',
    bg: '#EFF6FF',
    text: '#1D4ED8',
  },

  accepted: {
    label: 'Accepted',
    bg: '#F5F3FF',
    text: '#6D28D9',
  },

  in_progress: {
    label: 'In Progress',
    bg: '#FFF7ED',
    text: '#C2410C',
  },

  completed: {
    label: 'Completed',
    bg: '#ECFDF5',
    text: '#065F46',
  },

  cancelled: {
    label: 'Cancelled',
    bg: '#FEF2F2',
    text: '#991B1B',
  },
};

const getQualityStyle = (
  quality?: string,
) => {
  const key = (
    quality?.toUpperCase() || 'MEDIUM'
  ) as QualityKey;

  return QUALITY_MAP[key] || QUALITY_MAP.MEDIUM;
};

const getStatusStyle = (
  status?: string,
) => {
  const key = (
    status?.toLowerCase() || 'new'
  ) as StatusKey;

  return STATUS_MAP[key] || STATUS_MAP.new;
};

const formatCurrency = (
  value: any,
): string => {
  const num =
    typeof value === 'number'
      ? value
      : parseFloat(value) || 0;

  if (Number.isNaN(num)) {
    return '₹0';
  }

  return `₹${num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
};

const formatDate = (
  dateStr?: string,
): string => {
  if (!dateStr) {
    return '';
  }

  const date = new Date(dateStr);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const safeText = (
  value: any,
  fallback = '0',
) =>
  value === null || value === undefined
    ? fallback
    : String(value);

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  delay,
}: any) {
  const anim = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 450,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  const translateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY }],
      }}
    >
      <View
        style={[
          styles.statCard,
          {
            width: CARD_WIDTH,
          },
        ]}
      >
        <View
          style={[
            styles.statIcon,
            {
              borderColor: color,
            },
          ]}
        >
          <MaterialCommunityIcons
            name={icon}
            size={18}
            color={color}
          />
        </View>

        <View
          style={[
            styles.statCornerDot,
            {
              backgroundColor: color,
            },
          ]}
        />

        <Text style={styles.statValue}>
          {value}
        </Text>

        <Text style={styles.statLabel}>
          {label}
        </Text>

        <Text style={styles.statSub}>
          {sub}
        </Text>
      </View>
    </Animated.View>
  );
}

function DrawerItem({
  icon,
  label,
  onPress,
  danger,
  delay = 0,
  loading = false,
  locked = false,
}: any) {
  const itemAnim = useRef(
    new Animated.Value(0),
  ).current;

  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, itemAnim]);

  const translateX = itemAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [14, 0],
  });

  const handlePress = locked
    ? undefined
    : onPress;

  return (
    <Animated.View
      style={{
        opacity: itemAnim,
        transform: [{ translateX }],
      }}
    >
      <Pressable
        onPress={handlePress}
        disabled={loading || locked}
        style={({ pressed }) => [
          styles.drawerItem,

          danger &&
            !locked &&
            styles.drawerItemDanger,

          (loading || locked) && {
            opacity: 0.6,
          },

          pressed &&
            !locked &&
            !loading && {
              opacity: 0.85,
            },
        ]}
      >
        {loading ? (
          <ActivityIndicator
            size="small"
            color={THEME.danger}
            style={{
              width: 28,
            }}
          />
        ) : locked ? (
          <MaterialCommunityIcons
            name="lock-outline"
            size={18}
            color={THEME.mutedLight}
            style={{
              width: 28,
            }}
          />
        ) : (
          <MaterialCommunityIcons
            name={icon}
            size={20}
            color={
              danger
                ? THEME.danger
                : THEME.text
            }
            style={{
              width: 28,
            }}
          />
        )}

        <Text
          style={[
            styles.drawerItemText,

            danger &&
              !locked && {
                color: THEME.danger,
              },

            locked && {
              color: THEME.mutedLight,
            },
          ]}
        >
          {loading
            ? 'Logging out...'
            : label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

function SkeletonBlock({
  style,
  shimmerTranslateX,
}: {
  style?: any;

  shimmerTranslateX:
    Animated.AnimatedInterpolation<
      number | string
    >;
}) {
  return (
    <View
      style={[
        styles.skeletonBlock,
        style,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.skeletonShimmer,
          {
            transform: [
              {
                translateX:
                  shimmerTranslateX,
              },
              {
                skewX: '-18deg',
              },
            ],
          },
        ]}
      />
    </View>
  );
}

function DashboardSkeleton({
  shimmerTranslateX,
  showProjects,
  showLeads,
}: {
  shimmerTranslateX:
    Animated.AnimatedInterpolation<
      number | string
    >;

  showProjects: boolean;
  showLeads: boolean;
}) {
  const renderRows = () => (
    <View style={styles.skeletonListCard}>
      {[0, 1, 2].map(
        (item, index) => (
          <View
            key={item}
            style={[
              styles.skeletonListRow,

              index < 2 &&
                styles.skeletonListRowBorder,
            ]}
          >
            <SkeletonBlock
              style={
                styles.skeletonAvatar
              }
              shimmerTranslateX={
                shimmerTranslateX
              }
            />

            <View
              style={{
                flex: 1,
                marginLeft: 12,
              }}
            >
              <SkeletonBlock
                style={{
                  width: '62%',
                  height: 12,
                  borderRadius: 6,
                }}
                shimmerTranslateX={
                  shimmerTranslateX
                }
              />

              <SkeletonBlock
                style={{
                  width: '42%',
                  height: 8,
                  borderRadius: 4,
                  marginTop: 8,
                }}
                shimmerTranslateX={
                  shimmerTranslateX
                }
              />
            </View>

            <View
              style={{
                alignItems: 'flex-end',
                marginLeft: 10,
              }}
            >
              <SkeletonBlock
                style={{
                  width: 54,
                  height: 20,
                  borderRadius: 10,
                }}
                shimmerTranslateX={
                  shimmerTranslateX
                }
              />

              <SkeletonBlock
                style={{
                  width: 44,
                  height: 8,
                  borderRadius: 4,
                  marginTop: 7,
                }}
                shimmerTranslateX={
                  shimmerTranslateX
                }
              />
            </View>
          </View>
        ),
      )}
    </View>
  );

  return (
    <View>
      <View
        style={
          styles.compactHeroSkeleton
        }
      >
        <View
          style={
            styles.skeletonHeroHeader
          }
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <SkeletonBlock
              style={{
                width: 34,
                height: 34,
                borderRadius: 11,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />

            <View
              style={{
                marginLeft: 10,
              }}
            >
              <SkeletonBlock
                style={{
                  width: 108,
                  height: 12,
                  borderRadius: 6,
                }}
                shimmerTranslateX={
                  shimmerTranslateX
                }
              />

              <SkeletonBlock
                style={{
                  width: 76,
                  height: 8,
                  borderRadius: 4,
                  marginTop: 6,
                }}
                shimmerTranslateX={
                  shimmerTranslateX
                }
              />
            </View>
          </View>

          <SkeletonBlock
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
            }}
            shimmerTranslateX={
              shimmerTranslateX
            }
          />
        </View>

        <View
          style={
            styles.skeletonCompactMiddle
          }
        >
          <View style={{ flex: 1 }}>
            <SkeletonBlock
              style={{
                width: '62%',
                height: 30,
                borderRadius: 9,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />

            <SkeletonBlock
              style={{
                width: 110,
                height: 22,
                borderRadius: 11,
                marginTop: 9,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />
          </View>

          <SkeletonBlock
            style={{
              width: 88,
              height: 58,
              borderRadius: 17,
            }}
            shimmerTranslateX={
              shimmerTranslateX
            }
          />
        </View>

        <View
          style={
            styles.skeletonCompactDivider
          }
        />

        <View
          style={
            styles.skeletonCompactFooter
          }
        >
          <SkeletonBlock
            style={{
              width: '38%',
              height: 28,
              borderRadius: 10,
            }}
            shimmerTranslateX={
              shimmerTranslateX
            }
          />

          <SkeletonBlock
            style={{
              width: '38%',
              height: 28,
              borderRadius: 10,
            }}
            shimmerTranslateX={
              shimmerTranslateX
            }
          />
        </View>
      </View>

      <View
        style={
          styles.skeletonSectionHeader
        }
      >
        <SkeletonBlock
          style={{
            width: 92,
            height: 15,
            borderRadius: 7,
          }}
          shimmerTranslateX={
            shimmerTranslateX
          }
        />

        <SkeletonBlock
          style={{
            width: 56,
            height: 9,
            borderRadius: 5,
          }}
          shimmerTranslateX={
            shimmerTranslateX
          }
        />
      </View>

      <View style={styles.skeletonGrid}>
        {[0, 1, 2, 3].map(item => (
          <View
            key={item}
            style={[
              styles.skeletonStatCard,
              {
                width: CARD_WIDTH,
              },
            ]}
          >
            <SkeletonBlock
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />

            <SkeletonBlock
              style={{
                width: '54%',
                height: 20,
                borderRadius: 7,
                marginTop: 11,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />

            <SkeletonBlock
              style={{
                width: '70%',
                height: 9,
                borderRadius: 5,
                marginTop: 8,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />

            <SkeletonBlock
              style={{
                width: '58%',
                height: 8,
                borderRadius: 4,
                marginTop: 9,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />
          </View>
        ))}
      </View>

      {showProjects && (
        <>
          <View
            style={
              styles.skeletonSectionHeader
            }
          >
            <SkeletonBlock
              style={{
                width: 126,
                height: 15,
                borderRadius: 7,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />

            <SkeletonBlock
              style={{
                width: 56,
                height: 24,
                borderRadius: 12,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />
          </View>

          {renderRows()}
        </>
      )}

      {showLeads && (
        <>
          <View
            style={
              styles.skeletonSectionHeader
            }
          >
            <SkeletonBlock
              style={{
                width: 108,
                height: 15,
                borderRadius: 7,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />

            <SkeletonBlock
              style={{
                width: 56,
                height: 24,
                borderRadius: 12,
              }}
              shimmerTranslateX={
                shimmerTranslateX
              }
            />
          </View>

          {renderRows()}
        </>
      )}
    </View>
  );
}

let _cachedDashboardUser: any = null;

export default function DashboardScreen({
  navigation,
  route,
}: any) {
  const [refreshing, setRefreshing] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [
    dashboardData,
    setDashboardData,
  ] = useState<any>(null);

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const [
    drawerVisible,
    setDrawerVisible,
  ] = useState(false);

  const [loggingOut, setLoggingOut] =
    useState(false);

  const [
    sessionExpiredVisible,
    setSessionExpiredVisible,
  ] = useState(false);

  const [
    logoutConfirmVisible,
    setLogoutConfirmVisible,
  ] = useState(false);

  const [
    localUsername,
    setLocalUsername,
  ] = useState<string | null>(null);

  const [
    revenueHidden,
    setRevenueHidden,
  ] = useState(false);

  const insets = useSafeAreaInsets();

  const { apiRequest } = useAuthApi();

  const { canAccess } =
    usePermissionContext();

  const [notifCount, setNotifCount] =
    useState(() => getBadgeCount());

  const headerAnim = useRef(
    new Animated.Value(0),
  ).current;

  const heroAnim = useRef(
    new Animated.Value(0),
  ).current;

  const chartAnim = useRef(
    new Animated.Value(0),
  ).current;

  const skeletonAnim = useRef(
    new Animated.Value(0),
  ).current;

  const bellAnim = useRef(
    new Animated.Value(0),
  ).current;

  const bellLoopRef =
    useRef<any>(null);

  const bellRunning =
    useRef(false);

  const bellIdleAnim = useRef(
    new Animated.Value(0),
  ).current;

  const bellIdleLoopRef =
    useRef<any>(null);

  const rippleAnim = useRef(
    new Animated.Value(0),
  ).current;

  const drawerAnim = useRef(
    new Animated.Value(0),
  ).current;

  const overlayAnim = useRef(
    new Animated.Value(0),
  ).current;

  const itemGroupAnim = useRef(
    new Animated.Value(0),
  ).current;

  const swipeTranslateX = useRef(
    new Animated.Value(0),
  ).current;

  const clockSpin = useRef(
    new Animated.Value(0),
  ).current;

  const counterSpin = useRef(
    new Animated.Value(0),
  ).current;

  const hubPulse = useRef(
    new Animated.Value(1),
  ).current;

  const contentFade = useRef(
    new Animated.Value(0),
  ).current;

  const contentY = useRef(
    new Animated.Value(12),
  ).current;

  const drawerPanRef = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (
        _,
        gesture,
      ) =>
        gesture.dx < -8 &&
        Math.abs(gesture.dy) < 30,

      onPanResponderMove: (
        _,
        gesture,
      ) => {
        if (gesture.dx < 0) {
          swipeTranslateX.setValue(
            gesture.dx,
          );
        }
      },

      onPanResponderRelease: (
        _,
        gesture,
      ) => {
        if (
          gesture.dx < -60 ||
          gesture.vx < -0.5
        ) {
          Animated.timing(
            swipeTranslateX,
            {
              toValue:
                -DRAWER_WIDTH,

              duration: 220,

              easing: Easing.in(
                Easing.cubic,
              ),

              useNativeDriver: true,
            },
          ).start(() =>
            setDrawerOpen(false),
          );
        } else {
          Animated.spring(
            swipeTranslateX,
            {
              toValue: 0,
              friction: 16,
              tension: 80,
              useNativeDriver: true,
            },
          ).start();
        }
      },
    }),
  ).current;

  if (route?.params?.user) {
    _cachedDashboardUser =
      route.params.user;

    userCache.current =
      _cachedDashboardUser;
  }

  const user =
    _cachedDashboardUser;

  const accessTokenFromParams =
    route?.params?.accessToken ?? '';

  const refreshTokenFromParams =
    route?.params?.refreshToken ?? '';

  const today = useMemo(
    () =>
      new Date().toLocaleDateString(
        'en-IN',
        {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      ),
    [],
  );

  const hasDashboardAccess =
    canAccess('dashboard');

  const canAccessProjects =
    canAccess('project');

  const canAccessLeads =
    canAccess('lead');

  const closeDrawer = useCallback(
    () => setDrawerOpen(false),
    [],
  );

  useEffect(() => {
    navigation.setParams({
      hideTabBar: drawerOpen,
    });
  }, [drawerOpen, navigation]);

  const fetchDashboard =
    useCallback(
      async ({
        showLoader = true,
      }: {
        showLoader?: boolean;
      } = {}) => {
        if (showLoader) {
          setLoading(true);
        }

        try {
          const response =
            await apiRequest(
              `${API_BASE_URL}/dashboard/api/`,
            );

          if (!response.ok) {
            throw new Error(
              `HTTP ${response.status}`,
            );
          }

          const json =
            await response.json();

          setDashboardData(json);
          setError(null);
        } catch (
          requestError: any
        ) {
          if (
            requestError?.message ===
            'SESSION_EXPIRED'
          ) {
            setSessionExpiredVisible(
              true,
            );
          } else {
            console.error(
              'Dashboard fetch error:',
              requestError,
            );

            setError(
              requestError?.message ||
                'Failed to load dashboard',
            );
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [apiRequest],
    );

  const onRefresh =
    useCallback(async () => {
      setRefreshing(true);

      await fetchDashboard({
        showLoader: false,
      });
    }, [fetchDashboard]);

  useEffect(() => {
    if (
      accessTokenFromParams &&
      refreshTokenFromParams
    ) {
      setAuthTokens(
        accessTokenFromParams,
        refreshTokenFromParams,
      );
    }
  }, [
    accessTokenFromParams,
    refreshTokenFromParams,
  ]);

  useEffect(() => {
    setSessionExpiredCallback(
      () =>
        setSessionExpiredVisible(
          true,
        ),
    );

    return () =>
      setSessionExpiredCallback(
        null,
      );
  }, []);

  useEffect(() => {
    if (hasDashboardAccess) {
      fetchDashboard({
        showLoader: true,
      });
    } else {
      setLoading(false);
      setDashboardData(null);
    }
  }, [
    fetchDashboard,
    hasDashboardAccess,
  ]);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [headerAnim]);

  useEffect(() => {
    if (
      !loading &&
      dashboardData
    ) {
      heroAnim.setValue(0);
      chartAnim.setValue(0);

      Animated.parallel([
        Animated.spring(
          heroAnim,
          {
            toValue: 1,
            friction: 9,
            tension: 60,
            useNativeDriver: true,
          },
        ),

        Animated.timing(
          chartAnim,
          {
            toValue: 1,
            duration: 650,
            delay: 180,
            easing: Easing.out(
              Easing.cubic,
            ),
            useNativeDriver: true,
          },
        ),
      ]).start();
    }
  }, [
    chartAnim,
    dashboardData,
    heroAnim,
    loading,
  ]);

  useEffect(() => {
    if (!loading) {
      return;
    }

    skeletonAnim.setValue(0);

    const loop = Animated.loop(
      Animated.timing(
        skeletonAnim,
        {
          toValue: 1,
          duration: 1350,
          easing: Easing.linear,
          useNativeDriver: true,
        },
      ),
    );

    loop.start();

    return () => loop.stop();
  }, [
    loading,
    skeletonAnim,
  ]);

  useEffect(() => {
    if (drawerOpen) {
      swipeTranslateX.setValue(0);
      setDrawerVisible(true);

      Animated.parallel([
        Animated.spring(
          drawerAnim,
          {
            toValue: 1,
            friction: 18,
            tension: 80,
            useNativeDriver: true,
          },
        ),

        Animated.timing(
          overlayAnim,
          {
            toValue: 1,
            duration: 280,
            easing: Easing.out(
              Easing.quad,
            ),
            useNativeDriver: true,
          },
        ),

        Animated.timing(
          itemGroupAnim,
          {
            toValue: 1,
            duration: 380,
            delay: 160,
            easing: Easing.out(
              Easing.cubic,
            ),
            useNativeDriver: true,
          },
        ),
      ]).start();
          } else {
      Animated.parallel([
        Animated.timing(drawerAnim, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),

        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),

        Animated.timing(itemGroupAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setDrawerVisible(false);
        swipeTranslateX.setValue(0);
      });
    }
  }, [
    drawerAnim,
    drawerOpen,
    itemGroupAnim,
    overlayAnim,
    swipeTranslateX,
  ]);

  useEffect(() => {
    const subscription =
      BackHandler.addEventListener(
        'hardwareBackPress',
        () => {
          if (drawerOpen) {
            closeDrawer();
            return true;
          }

          return false;
        },
      );

    return () => subscription.remove();
  }, [closeDrawer, drawerOpen]);

  useEffect(
    () => subscribeBadge(setNotifCount),
    [],
  );

  useEffect(() => {
    if (
      notifCount > 0 &&
      !bellRunning.current
    ) {
      bellRunning.current = true;

      bellIdleLoopRef.current?.stop();
      bellIdleAnim.setValue(0);

      bellLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bellAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),

          Animated.delay(2400),
        ]),
      );

      bellLoopRef.current.start();
    } else if (
      notifCount === 0 &&
      bellRunning.current
    ) {
      bellRunning.current = false;

      bellLoopRef.current?.stop();
      bellLoopRef.current = null;

      bellAnim.setValue(0);
    }

    return () => {
      bellLoopRef.current?.stop();
    };
  }, [
    bellAnim,
    bellIdleAnim,
    notifCount,
  ]);

  useEffect(() => {
    if (notifCount === 0) {
      bellIdleLoopRef.current =
        Animated.loop(
          Animated.sequence([
            Animated.timing(
              bellIdleAnim,
              {
                toValue: 1,
                duration: 750,
                easing: Easing.out(
                  Easing.sin,
                ),
                useNativeDriver: true,
              },
            ),

            Animated.delay(4500),

            Animated.timing(
              bellIdleAnim,
              {
                toValue: 0,
                duration: 0,
                useNativeDriver: true,
              },
            ),
          ]),
        );

      bellIdleLoopRef.current.start();
    } else {
      bellIdleLoopRef.current?.stop();
      bellIdleAnim.setValue(0);
    }

    return () => {
      bellIdleLoopRef.current?.stop();
    };
  }, [
    bellIdleAnim,
    notifCount,
  ]);

  useEffect(() => {
    if (notifCount > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(
            rippleAnim,
            {
              toValue: 1,
              duration: 1200,
              easing: Easing.out(
                Easing.ease,
              ),
              useNativeDriver: true,
            },
          ),

          Animated.delay(2300),

          Animated.timing(
            rippleAnim,
            {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            },
          ),
        ]),
      );

      loop.start();

      return () => loop.stop();
    }

    rippleAnim.setValue(0);

    return undefined;
  }, [
    notifCount,
    rippleAnim,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (
        userCache.current?.username
      ) {
        setLocalUsername(
          userCache.current.username,
        );
      }
    }, []),
  );

  useEffect(() => {
    if (!hasDashboardAccess) {
      Animated.parallel([
        Animated.timing(
          contentFade,
          {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
          },
        ),

        Animated.spring(contentY, {
          toValue: 0,
          friction: 9,
          tension: 50,
          useNativeDriver: true,
        }),
      ]).start();

      const clockwise =
        Animated.loop(
          Animated.timing(clockSpin, {
            toValue: 1,
            duration: 3500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        );

      const counter =
        Animated.loop(
          Animated.timing(
            counterSpin,
            {
              toValue: 1,
              duration: 6000,
              easing: Easing.linear,
              useNativeDriver: true,
            },
          ),
        );

      const pulse =
        Animated.loop(
          Animated.sequence([
            Animated.timing(
              hubPulse,
              {
                toValue: 0.95,
                duration: 1800,
                easing: Easing.inOut(
                  Easing.sin,
                ),
                useNativeDriver: true,
              },
            ),

            Animated.timing(
              hubPulse,
              {
                toValue: 1,
                duration: 1800,
                easing: Easing.inOut(
                  Easing.sin,
                ),
                useNativeDriver: true,
              },
            ),
          ]),
        );

      clockwise.start();
      counter.start();
      pulse.start();

      return () => {
        clockwise.stop();
        counter.stop();
        pulse.stop();
      };
    }

    return undefined;
  }, [
    clockSpin,
    contentFade,
    contentY,
    counterSpin,
    hasDashboardAccess,
    hubPulse,
  ]);

  const performLogout = async () => {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await fetch(
        `${API_BASE_URL}/api/logout/`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',

            Authorization:
              `Bearer ${getAccessToken()}`,
          },

          body: JSON.stringify({
            refresh:
              refreshTokenFromParams,
          }),
        },
      );
    } catch (logoutError) {
      console.warn(
        'Logout request failed, proceeding locally:',
        logoutError,
      );
    } finally {
      clearAuthTokens();

      _cachedDashboardUser = null;
      userCache.current = null;

      setLoggingOut(false);

      closeDrawer();

      navigation.replace('Login');
    }
  };

  const openScreen = (
    screen: string,
  ) => {
    closeDrawer();
    navigation.navigate(screen);
  };

  const drawerTranslateX =
    drawerAnim.interpolate({
      inputRange: [0, 1],

      outputRange: [
        -DRAWER_WIDTH - 44,
        0,
      ],
    });

  const drawerOpacity =
    drawerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

  const drawerScale =
    drawerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.98, 1],
    });

  const overlayOpacity =
    overlayAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

  const spinClockwise =
    clockSpin.interpolate({
      inputRange: [0, 1],

      outputRange: [
        '0deg',
        '360deg',
      ],
    });

  const spinCounterClockwise =
    counterSpin.interpolate({
      inputRange: [0, 1],

      outputRange: [
        '360deg',
        '0deg',
      ],
    });

  const bellRotate =
    bellAnim.interpolate({
      inputRange: [
        0,
        0.15,
        0.3,
        0.45,
        0.6,
        0.75,
        0.9,
        1,
      ],

      outputRange: [
        '0deg',
        '25deg',
        '-25deg',
        '18deg',
        '-18deg',
        '10deg',
        '-5deg',
        '0deg',
      ],
    });

  const bellIdleRotate =
    bellIdleAnim.interpolate({
      inputRange: [
        0,
        0.2,
        0.45,
        0.65,
        0.82,
        1,
      ],

      outputRange: [
        '0deg',
        '14deg',
        '-10deg',
        '6deg',
        '-3deg',
        '0deg',
      ],
    });

  const rippleScale =
    rippleAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 2.2],
    });

  const rippleOpacity =
    rippleAnim.interpolate({
      inputRange: [
        0,
        0.25,
        1,
      ],

      outputRange: [
        0.7,
        0.35,
        0,
      ],
    });

  const heroTranslateY =
    heroAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [12, 0],
    });

  const heroScale =
    heroAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.98, 1],
    });

  const chartScaleY =
    chartAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.2, 1],
    });

  const chartOpacity =
    chartAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });

  const shimmerTranslateX =
    skeletonAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [-width, width],
    });

  const activeUsername =
    localUsername ??
    user?.username ??
    'Admin';

  const displayName =
    user?.first_name
      ? `${user.first_name} ${
          user.last_name ?? ''
        }`.trim()
      : activeUsername;

  const branchName =
    user?.profile?.branch?.name
      ? String(
          user.profile.branch.name,
        )
      : 'Branch 01';

  const initials =
    displayName
      .split(' ')
      .filter(Boolean)
      .map(
        (word: string) => word[0],
      )
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';

  const totalRevenue =
    dashboardData?.total_revenue ?? 0;

  const totalOutstanding =
    dashboardData?.total_outstanding ??
    dashboardData?.pending_payments ??
    0;

  const loanProjects =
    dashboardData?.loan_project_count ??
    0;

  const totalProjects =
    dashboardData?.total_projects_count ??
    dashboardData?.total_projects ??
    0;

  const activeComplaints =
    dashboardData
      ?.active_complaints_count ??
    dashboardData?.active_complaints ??
    0;

  const recentProjects =
    dashboardData?.recent_projects ??
    [];

  const recentLeads =
    dashboardData?.recent_leads ?? [];

  const stats = dashboardData
    ? [
        {
          label: 'Outstanding',

          value: formatCurrency(
            totalOutstanding,
          ),

          sub: 'Pending collection',

          icon:
            'clock-alert-outline',

          color: THEME.warning,
        },

        {
          label:
            'Active Complaints',

          value: safeText(
            activeComplaints,
          ),

          sub:
            'Requires attention',

          icon:
            'bell-alert-outline',

          color: THEME.danger,
        },

        {
          label: 'Total Projects',

          value: safeText(
            totalProjects,
          ),

          sub: 'All time',

          icon:
            'briefcase-outline',

          color: THEME.info,
        },

        {
          label: 'Loan Projects',

          value: safeText(
            loanProjects,
          ),

          sub:
            'Financed projects',

          icon:
            'file-percent-outline',

          color: THEME.success,
        },
      ]
    : [];

  const showInitialSkeleton =
    loading && !dashboardData;

  return (
    <View style={styles.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={THEME.primary}
        translucent={false}
      />

      <SafeAreaView
        style={styles.safeArea}
        edges={['top']}
      >
        <View style={styles.screen}>
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerAnim,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() =>
                setDrawerOpen(true)
              }
              style={styles.menuBtn}
              activeOpacity={0.85}
            >
              <MaterialCommunityIcons
                name="widgets-outline"
                size={20}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View style={styles.headerLeft}>
              <Text
                style={
                  styles.headerBrand
                }
              >
                SUPREME ENERGIES
              </Text>

              <Text
                style={
                  styles.headerDate
                }
              >
                {today}
              </Text>
            </View>

            <View
              style={
                styles.headerRight
              }
            >
              <View
                style={styles.bellWrap}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.bellRipple,
                    {
                      opacity:
                        rippleOpacity,

                      transform: [
                        {
                          scale:
                            rippleScale,
                        },
                      ],
                    },
                  ]}
                />

                <TouchableOpacity
                  style={styles.iconBtn}
                  activeOpacity={0.85}
                  onPress={() => {
                    clearBadge();

                    navigation.navigate(
                      'Notifications',
                    );
                  }}
                >
                  <Animated.View
                    style={{
                      transform: [
                        {
                          rotate:
                            notifCount > 0
                              ? bellRotate
                              : bellIdleRotate,
                        },
                      ],
                    }}
                  >
                    <MaterialCommunityIcons
                      name="bell-outline"
                      size={19}
                      color="#FFFFFF"
                    />
                  </Animated.View>

                  {notifCount > 0 && (
                    <View
                      style={
                        styles.notifBadge
                      }
                    >
                      <Text
                        style={
                          styles.notifBadgeText
                        }
                      >
                        {notifCount > 9
                          ? '9+'
                          : String(
                              notifCount,
                            )}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.avatarBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate(
                    'Profile',
                    {
                      user:
                        _cachedDashboardUser ??
                        user,
                    },
                  )
                }
              >
                <Text
                  style={
                    styles.avatarInitial
                  }
                >
                  {initials}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View
            style={styles.contentArea}
          >
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={
                false
              }
              contentContainerStyle={
                hasDashboardAccess
                  ? styles.scroll
                  : styles.blockedScroll
              }
              refreshControl={
                hasDashboardAccess ? (
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                    tintColor={
                      THEME.primary
                    }
                    colors={[
                      THEME.primary,
                    ]}
                  />
                ) : undefined
              }
              scrollEnabled={
                hasDashboardAccess
              }
            >
              {hasDashboardAccess ? (
                showInitialSkeleton ? (
                  <DashboardSkeleton
                    shimmerTranslateX={
                      shimmerTranslateX
                    }
                    showProjects={
                      canAccessProjects
                    }
                    showLeads={
                      canAccessLeads
                    }
                  />
                ) : error &&
                  !dashboardData ? (
                  <View
                    style={
                      styles.errorCard
                    }
                  >
                    <View
                      style={
                        styles.errorIconWrap
                      }
                    >
                      <MaterialCommunityIcons
                        name="cloud-alert-outline"
                        size={31}
                        color={
                          THEME.danger
                        }
                      />
                    </View>

                    <Text
                      style={
                        styles.errorTitle
                      }
                    >
                      Unable to load
                      dashboard
                    </Text>

                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {error}
                    </Text>

                    <TouchableOpacity
                      style={
                        styles.retryBtn
                      }
                      onPress={() =>
                        fetchDashboard({
                          showLoader: true,
                        })
                      }
                      activeOpacity={0.85}
                    >
                      <MaterialCommunityIcons
                        name="refresh"
                        size={17}
                        color="#FFFFFF"
                      />

                      <Text
                        style={
                          styles.retryBtnText
                        }
                      >
                        Try Again
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Animated.View
                      style={[
                        styles.compactHeroCard,
                        {
                          opacity:
                            heroAnim,

                          transform: [
                            {
                              translateY:
                                heroTranslateY,
                            },

                            {
                              scale:
                                heroScale,
                            },
                          ],
                        },
                      ]}
                    >
                      <View
                        pointerEvents="none"
                        style={
                          styles.heroInnerBorder
                        }
                      />

                      <View
                        style={
                          styles.heroTopRow
                        }
                      >
                        <Text
                          style={
                            styles.heroLabel
                          }
                        >
                          Total Revenue
                        </Text>

                        <TouchableOpacity
                          style={
                            styles.heroEyeBtn
                          }
                          onPress={() =>
                            setRevenueHidden(
                              previous =>
                                !previous,
                            )
                          }
                          activeOpacity={0.8}
                        >
                          <MaterialCommunityIcons
                            name={
                              revenueHidden
                                ? 'eye-off-outline'
                                : 'eye-outline'
                            }
                            size={14}
                            color={
                              THEME.textSecondary
                            }
                          />
                        </TouchableOpacity>
                      </View>

                      <View
                        style={
                          styles.heroMainRow
                        }
                      >
                        <View
                          style={
                            styles.heroValueCol
                          }
                        >
                          <Text
                            style={
                              styles.heroValue
                            }
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={
                              0.72
                            }
                          >
                            {revenueHidden
                              ? '••••••'
                              : formatCurrency(
                                  totalRevenue,
                                )}
                          </Text>

                          <View
                            style={
                              styles.heroTrendBadge
                            }
                          >
                            <MaterialCommunityIcons
                              name="trending-up"
                              size={11}
                              color={
                                THEME.success
                              }
                            />

                            <Text
                              style={
                                styles.heroTrendText
                              }
                            >
                              Revenue overview
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.heroMedallion
                          }
                        >
                          <MaterialCommunityIcons
                            name="chart-donut"
                            size={24}
                            color={
                              THEME.primary
                            }
                          />
                        </View>
                      </View>

                      <View
                        style={
                          styles.compactHeroFooter
                        }
                      >
                        <View
                          style={
                            styles.compactMetric
                          }
                        >
                          <View
                            style={[
                              styles.compactMetricIcon,
                              { backgroundColor: THEME.infoLight },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="briefcase-check-outline"
                              size={13}
                              color={
                                THEME.info
                              }
                            />
                          </View>

                          <View>
                            <Text
                              style={
                                styles.compactMetricLabel
                              }
                            >
                              Projects
                            </Text>

                            <Text
                              style={
                                styles.compactMetricValue
                              }
                            >
                              {safeText(
                                totalProjects,
                              )}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.compactFooterDivider
                          }
                        />

                        <View
                          style={
                            styles.compactMetric
                          }
                        >
                          <View
                            style={
                              styles.compactMetricIcon
                            }
                          >
                            <MaterialCommunityIcons
                              name="map-marker-outline"
                              size={13}
                              color={
                                THEME.primary
                              }
                            />
                          </View>

                          <View
                            style={{
                              flex: 1,
                            }}
                          >
                            <Text
                              style={
                                styles.compactMetricLabel
                              }
                            >
                              Branch
                            </Text>

                            <Text
                              style={
                                styles.compactMetricValue
                              }
                              numberOfLines={1}
                            >
                              {branchName}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </Animated.View>

                    <View
                      style={
                        styles.sectionHeader
                      }
                    >
                      <View
                        style={
                          styles.sectionTitleRow
                        }
                      >
                        <View
                          style={
                            styles.sectionAccent
                          }
                        />

                        <Text
                          style={
                            styles.sectionTitle
                          }
                        >
                          Overview
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.sectionHint
                        }
                      >
                        This month
                      </Text>
                    </View>

                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      decelerationRate="fast"
                      snapToInterval={CARD_WIDTH + CARD_GAP}
                      snapToAlignment="start"
                      style={styles.statsScroll}
                      contentContainerStyle={styles.statsScrollContent}
                    >
                      {stats.map(
                        (
                          item,
                          index,
                        ) => (
                          <StatCard
                            key={
                              item.label
                            }
                            {...item}
                            delay={
                              index * 80
                            }
                          />
                        ),
                      )}
                    </ScrollView>

                    {canAccessProjects && (
                      <>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionTitleRow}>
                            <View style={styles.sectionAccent} />
                            <Text style={styles.sectionTitle}>
                              Recent Projects
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.seeAllPill}
                            onPress={() =>
                              navigation.navigate('Projects')
                            }
                            activeOpacity={0.8}
                          >
                            <Text style={styles.seeAll}>
                              See all
                            </Text>

                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={14}
                              color={THEME.primary}
                            />
                          </TouchableOpacity>
                        </View>

                        <View style={styles.listCard}>
                          {recentProjects.length ? (
                            recentProjects.map(
                              (
                                project: any,
                                index: number,
                              ) => {
                                const badge =
                                  getStatusStyle(
                                    project?.status ||
                                      project?.status_display,
                                  );

                                const title =
                                  project?.customer_name ||
                                  project?.name ||
                                  project?.title ||
                                  project?.project_name ||
                                  'Project';

                                const subtitle =
                                  project?.mobile ||
                                  project?.phone ||
                                  formatDate(
                                    project?.created_at,
                                  );

                                const amountText =
                                  project?.total_amount
                                    ? formatCurrency(
                                        project.total_amount,
                                      )
                                    : '';

                                return (
                                  <TouchableOpacity
                                    key={
                                      project?.id ??
                                      `${title}-${index}`
                                    }
                                    activeOpacity={0.9}
                                    style={[
                                      styles.listRow,

                                      index <
                                        recentProjects.length -
                                          1 &&
                                        styles.listRowBorder,
                                    ]}
                                    onPress={() =>
                                      navigation.navigate(
                                        'AddEditProject',
                                        {
                                          project,
                                          onSuccess:
                                            onRefresh,
                                        },
                                      )
                                    }
                                  >
                                    <View
                                      style={
                                        styles.listAvatar
                                      }
                                    >
                                      <MaterialCommunityIcons
                                        name="briefcase-outline"
                                        size={18}
                                        color={
                                          THEME.primary
                                        }
                                      />
                                    </View>

                                    <View
                                      style={{
                                        flex: 1,
                                      }}
                                    >
                                      <Text
                                        style={
                                          styles.listName
                                        }
                                        numberOfLines={1}
                                      >
                                        {title}
                                      </Text>

                                      <Text
                                        style={
                                          styles.listSub
                                        }
                                        numberOfLines={1}
                                      >
                                        {subtitle}

                                        {project?.created_at
                                          ? ` · ${formatDate(
                                              project.created_at,
                                            )}`
                                          : ''}
                                      </Text>
                                    </View>

                                    <View
                                      style={
                                        styles.listRight
                                      }
                                    >
                                      <View
                                        style={
                                          styles.statusRow
                                        }
                                      >
                                        <View
                                          style={[
                                            styles.statusDot,
                                            {
                                              backgroundColor:
                                                badge.text,
                                            },
                                          ]}
                                        />

                                        <Text
                                          style={
                                            styles.statusLabel
                                          }
                                        >
                                          {badge.label}
                                        </Text>
                                      </View>

                                      {!!amountText && (
                                        <Text
                                          style={
                                            styles.levelText
                                          }
                                        >
                                          {amountText}
                                        </Text>
                                      )}
                                    </View>

                                    <MaterialCommunityIcons
                                      name="chevron-right"
                                      size={16}
                                      color={
                                        THEME.mutedLight
                                      }
                                      style={{
                                        marginLeft: 6,
                                      }}
                                    />
                                  </TouchableOpacity>
                                );
                              },
                            )
                          ) : (
                            <Text
                              style={
                                styles.emptyText
                              }
                            >
                              No recent projects
                            </Text>
                          )}
                        </View>
                      </>
                    )}

                    {canAccessLeads && (
                      <>
                        <View style={styles.sectionHeader}>
                          <View style={styles.sectionTitleRow}>
                            <View style={styles.sectionAccent} />

                            <Text style={styles.sectionTitle}>
                              Recent Leads
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.seeAllPill}
                            onPress={() =>
                              navigation.navigate('Leads')
                            }
                            activeOpacity={0.8}
                          >
                            <Text style={styles.seeAll}>
                              See all
                            </Text>

                            <MaterialCommunityIcons
                              name="chevron-right"
                              size={14}
                              color={THEME.primary}
                            />
                          </TouchableOpacity>
                        </View>

                        <View
                          style={[
                            styles.listCard,
                            {
                              marginBottom: 32,
                            },
                          ]}
                        >
                          {recentLeads.length ? (
                            recentLeads.map(
                              (
                                lead: any,
                                index: number,
                              ) => {
                                const badge =
                                  getQualityStyle(
                                    lead?.quality_name ||
                                      lead?.quality ||
                                      '',
                                  );

                                const title =
                                  lead?.customer_name ||
                                  lead?.name ||
                                  'Lead';

                                const subtitle =
                                  lead?.mobile || '';

                                const followUp =
                                  lead?.follow_up_date
                                    ? formatDate(
                                        lead.follow_up_date,
                                      )
                                    : 'No follow-up';

                                return (
                                  <TouchableOpacity
                                    key={
                                      lead?.id ??
                                      `${title}-${index}`
                                    }
                                    activeOpacity={0.9}
                                    style={[
                                      styles.listRow,

                                      index <
                                        recentLeads.length -
                                          1 &&
                                        styles.listRowBorder,
                                    ]}
                                    onPress={() =>
                                      navigation.navigate(
                                        'AddEditLead',
                                        {
                                          lead,
                                          onSuccess:
                                            onRefresh,
                                        },
                                      )
                                    }
                                  >
                                    <View
                                      style={
                                        styles.listAvatar
                                      }
                                    >
                                      <MaterialCommunityIcons
                                        name="account-group-outline"
                                        size={18}
                                        color={
                                          THEME.primary
                                        }
                                      />
                                    </View>

                                    <View
                                      style={{
                                        flex: 1,
                                      }}
                                    >
                                      <Text
                                        style={
                                          styles.listName
                                        }
                                        numberOfLines={1}
                                      >
                                        {title}
                                      </Text>

                                      <Text
                                        style={
                                          styles.listSub
                                        }
                                        numberOfLines={1}
                                      >
                                        {subtitle}
                                      </Text>
                                    </View>

                                    <View
                                      style={
                                        styles.listRight
                                      }
                                    >
                                      <View
                                        style={
                                          styles.statusRow
                                        }
                                      >
                                        <View
                                          style={[
                                            styles.statusDot,
                                            {
                                              backgroundColor:
                                                badge.text,
                                            },
                                          ]}
                                        />

                                        <Text
                                          style={
                                            styles.statusLabel
                                          }
                                        >
                                          {badge.label}
                                        </Text>
                                      </View>

                                      <Text
                                        style={
                                          styles.levelText
                                        }
                                      >
                                        {followUp}
                                      </Text>
                                    </View>

                                    <MaterialCommunityIcons
                                      name="chevron-right"
                                      size={16}
                                      color={
                                        THEME.mutedLight
                                      }
                                      style={{
                                        marginLeft: 6,
                                      }}
                                    />
                                  </TouchableOpacity>
                                );
                              },
                            )
                          ) : (
                            <Text
                              style={
                                styles.emptyText
                              }
                            >
                              No recent leads
                            </Text>
                          )}
                        </View>
                      </>
                    )}
                  </>
                )
              ) : (
                <Animated.View
                  style={[
                    styles.blockedCard,
                    {
                      opacity: contentFade,

                      transform: [
                        {
                          translateY:
                            contentY,
                        },
                      ],
                    },
                  ]}
                >
                  <View
                    style={
                      styles.engineContainer
                    }
                  >
                    <Animated.View
                      style={[
                        styles.outerDashedOrbit,
                        {
                          transform: [
                            {
                              rotate:
                                spinCounterClockwise,
                            },
                          ],
                        },
                      ]}
                    />

                    <Animated.View
                      style={[
                        styles.innerDashedOrbit,
                        {
                          transform: [
                            {
                              rotate:
                                spinClockwise,
                            },
                          ],
                        },
                      ]}
                    />

                    <Animated.View
                      style={[
                        styles.centerShieldHub,
                        {
                          transform: [
                            {
                              scale:
                                hubPulse,
                            },
                          ],
                        },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="lock-minus-outline"
                        size={28}
                        color={THEME.text}
                      />
                    </Animated.View>
                  </View>

                  <Text
                    style={
                      styles.blockedTitle
                    }
                  >
                    Access Required
                  </Text>

                  <Text
                    style={
                      styles.blockedText
                    }
                  >
                    You need permission to
                    unlock the Dashboard
                    workspace.
                  </Text>

                  <Text
                    style={
                      styles.inlineHint
                    }
                  >
                    Locked out?{' '}

                    <Text
                      style={
                        styles.hintLink
                      }
                    >
                      Ask your admin for
                      access
                    </Text>
                  </Text>
                </Animated.View>
              )}
            </ScrollView>
          </View>

          {drawerVisible && (
            <View
              style={styles.drawerLayer}
              pointerEvents="box-none"
            >
              <Pressable
                style={
                  StyleSheet.absoluteFillObject
                }
                onPress={closeDrawer}
              >
                <Animated.View
                  pointerEvents="none"
                  style={[
                    styles.overlay,
                    {
                      opacity:
                        overlayOpacity,
                    },
                  ]}
                />
              </Pressable>

              <Animated.View
                style={[
                  styles.drawer,
                  {
                    width: DRAWER_WIDTH,

                    paddingBottom:
                      24 + insets.bottom,

                    opacity:
                      drawerOpacity,

                    transform: [
                      {
                        translateX:
                          Animated.add(
                            drawerTranslateX,
                            swipeTranslateX,
                          ),
                      },

                      {
                        scale:
                          drawerScale,
                      },
                    ],
                  },
                ]}
                {...drawerPanRef.panHandlers}
              >
                <View
                  style={
                    styles.drawerHeader
                  }
                >
                  <View
                    style={
                      styles.drawerLogo
                    }
                  >
                    <MaterialCommunityIcons
                      name="shield-check-outline"
                      size={20}
                      color="#FFFFFF"
                    />
                  </View>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        styles.drawerBrand
                      }
                    >
                      Supreme Energies
                    </Text>

                    <Text
                      style={
                        styles.drawerRole
                      }
                    >
                      {user?.is_superuser
                        ? 'Super Admin'
                        : user?.is_staff
                          ? 'Staff'
                          : 'Admin Portal'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={closeDrawer}
                    style={
                      styles.closeBtn
                    }
                  >
                    <MaterialCommunityIcons
                      name="close"
                      size={20}
                      color={THEME.text}
                    />
                  </TouchableOpacity>
                </View>

                {user && (
                  <View
                    style={
                      styles.drawerUserChip
                    }
                  >
                    <View
                      style={
                        styles.drawerUserAvatar
                      }
                    >
                      <Text
                        style={
                          styles.drawerUserInitial
                        }
                      >
                        {(
                          user.first_name?.[0] ??
                          user.username?.[0] ??
                          'U'
                        ).toUpperCase()}
                      </Text>
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          styles.drawerUserName
                        }
                      >
                        {displayName}
                      </Text>

                      <Text
                        style={
                          styles.drawerUserEmail
                        }
                        numberOfLines={1}
                      >
                        {user.email ||
                          activeUsername}
                      </Text>
                    </View>
                  </View>
                )}

                <Animated.View
                  style={{
                    opacity:
                      itemGroupAnim,

                    transform: [
                      {
                        translateY:
                          itemGroupAnim.interpolate(
                            {
                              inputRange: [
                                0,
                                1,
                              ],

                              outputRange: [
                                8,
                                0,
                              ],
                            },
                          ),
                      },
                    ],
                  }}
                >
                  <View
                    style={
                      styles.drawerSection
                    }
                  >
                    <Text
                      style={
                        styles.drawerSectionTitle
                      }
                    >
                      Navigation
                    </Text>

                    <DrawerItem
                      icon="home-analytics"
                      label="Dashboard"
                      onPress={() =>
                        openScreen(
                          'Dashboard',
                        )
                      }
                      delay={0}
                    />

                    <DrawerItem
                      icon="layers-triple-outline"
                      label="Projects"
                      onPress={() =>
                        openScreen(
                          'Projects',
                        )
                      }
                      delay={70}
                      locked={
                        !canAccessProjects
                      }
                    />

                    <DrawerItem
                      icon="tools"
                      label="Service"
                      onPress={() =>
                        openScreen(
                          'Service',
                        )
                      }
                      delay={140}
                      locked={
                        !canAccess(
                          'service',
                        )
                      }
                    />

                    <DrawerItem
                      icon="account-multiple-plus-outline"
                      label="Leads"
                      onPress={() =>
                        openScreen('Leads')
                      }
                      delay={210}
                      locked={
                        !canAccessLeads
                      }
                    />

                    <DrawerItem
                      icon="shield-account-outline"
                      label="Users"
                      onPress={() =>
                        openScreen('Users')
                      }
                      delay={280}
                      locked={
                        !canAccess('users')
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.drawerSection
                    }
                  >
                    <Text
                      style={
                        styles.drawerSectionTitle
                      }
                    >
                      Account
                    </Text>

                    <DrawerItem
                      icon="logout-variant"
                      label="Logout"
                      onPress={() =>
                        setLogoutConfirmVisible(
                          true,
                        )
                      }
                      danger
                      delay={340}
                      loading={
                        loggingOut
                      }
                    />
                  </View>
                </Animated.View>

                <View
                  style={
                    styles.drawerFooter
                  }
                >
                  <Text
                    style={
                      styles.drawerFooterText
                    }
                  >
                    Version 2.0.4
                  </Text>

                  <Text
                    style={
                      styles.drawerFooterSub
                    }
                  >
                    Secure session active
                  </Text>
                </View>
              </Animated.View>
            </View>
          )}
        </View>
      </SafeAreaView>

      <Modal
        visible={
          sessionExpiredVisible
        }
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {}}
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={
              styles.modalContainer
            }
          >
            <View
              style={[
                styles.modalIconWrap,
                {
                  backgroundColor:
                    THEME.dangerLight,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="clock-outline"
                size={34}
                color={THEME.danger}
              />
            </View>

            <Text
              style={styles.modalTitle}
            >
              Session Expired
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              Your session has expired.
              Please log in again to
              continue.
            </Text>

            <TouchableOpacity
              style={
                styles.modalButton
              }
              onPress={() => {
                setSessionExpiredVisible(
                  false,
                );

                performLogout();
              }}
            >
              <Text
                style={
                  styles.modalButtonText
                }
              >
                Login Again
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          logoutConfirmVisible
        }
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() =>
          setLogoutConfirmVisible(
            false,
          )
        }
      >
        <View
          style={styles.modalOverlay}
        >
          <View
            style={
              styles.modalContainer
            }
          >
            <View
              style={[
                styles.modalIconWrap,
                {
                  backgroundColor:
                    THEME.dangerLight,
                },
              ]}
            >
              <MaterialCommunityIcons
                name="logout"
                size={34}
                color={THEME.danger}
              />
            </View>

            <Text
              style={styles.modalTitle}
            >
              Confirm Logout
            </Text>

            <Text
              style={
                styles.modalMessage
              }
            >
              Are you sure you want to
              logout?
            </Text>

            <View
              style={
                styles.modalButtonRow
              }
            >
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonCancel,
                ]}
                onPress={() =>
                  setLogoutConfirmVisible(
                    false,
                  )
                }
              >
                <Text
                  style={
                    styles.modalButtonCancelText
                  }
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.modalButtonConfirm,
                ]}
                onPress={() => {
                  setLogoutConfirmVisible(
                    false,
                  );

                  performLogout();
                }}
              >
                <Text
                  style={
                    styles.modalButtonText
                  }
                >
                  Logout
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
    root: {
    flex: 1,
    backgroundColor: THEME.primary,
  },

  safeArea: {
    flex: 1,
    backgroundColor: THEME.primary,
  },

  screen: {
    flex: 1,
    backgroundColor: THEME.primary,
  },

  header: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 22,
    paddingBottom: 36,
  },

  menuBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },

  headerLeft: {
    flex: 1,
  },

  headerBrand: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  headerDate: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 11,
    marginTop: 2,
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  bellWrap: {
    position: 'relative',
    marginRight: 8,
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },

  bellRipple: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },

  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },

  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: THEME.primary,
  },

  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 10,
  },

  avatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.85)',
  },

  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },

  contentArea: {
    flex: 1,
    backgroundColor: THEME.bg,
    marginTop: -12,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    overflow: 'hidden',
  },

  scroll: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 110,
  },

  blockedScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },

  compactHeroCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 15,
    marginBottom: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(142,28,28,0.08)',
    shadowColor: '#421313',
    shadowOpacity: 0.13,
    shadowRadius: 16,
    shadowOffset: {
      width: 0,
      height: 7,
    },
    elevation: 5,
  },

  heroInnerBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.75)',
  },

  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  heroLabel: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },

  heroEyeBtn: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: '#F7F8FA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
  },

  heroMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  heroValueCol: {
    flex: 1,
    paddingRight: 10,
  },

  heroValue: {
    fontSize: 24,
    fontWeight: '900',
    color: THEME.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },

  heroTrendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: THEME.successLight,
    borderWidth: 1,
    borderColor: 'rgba(27,156,99,0.10)',
  },

  heroTrendText: {
    marginLeft: 5,
    fontSize: 9,
    fontWeight: '800',
    color: THEME.success,
  },

  heroMedallion: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: THEME.primaryLight,
  },

  compactHeroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  compactMetric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  compactMetricIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 7,
  },

  compactMetricLabel: {
    fontSize: 9.5,
    fontWeight: '700',
    color: THEME.muted,
  },

  compactMetricValue: {
    fontSize: 13,
    fontWeight: '900',
    color: THEME.text,
    marginTop: 1,
  },

  compactFooterDivider: {
    width: 1,
    height: 30,
    backgroundColor: THEME.border,
    marginHorizontal: 12,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },

  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  sectionAccent: {
    width: 4,
    height: 15,
    borderRadius: 2,
    backgroundColor: THEME.primary,
    marginRight: 8,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.text,
  },

  sectionHint: {
    fontSize: 11,
    color: THEME.muted,
    fontWeight: '600',
  },

  seeAllPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.borderLight,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },

  seeAll: {
    fontSize: 12,
    color: THEME.primary,
    fontWeight: '700',
    marginRight: 1,
  },

  statsScroll: {
    marginHorizontal: -16,
    marginBottom: 28,
  },

  statsScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 6,
  },

  statCard: {
    position: 'relative',
    backgroundColor: THEME.card,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    marginRight: CARD_GAP,
    shadowColor: '#0B0C10',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#FAFAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 9,
    borderWidth: 1.5,
  },

  statCornerDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 6,
    height: 6,
    borderRadius: 3,
  },

  statValue: {
    fontSize: 18,
    fontWeight: '900',
    color: THEME.text,
    letterSpacing: -0.3,
  },

  statLabel: {
    fontSize: 10.5,
    color: THEME.text,
    marginTop: 3,
    fontWeight: '700',
  },

  statSub: {
    fontSize: 9.5,
    color: THEME.muted,
    marginTop: 2,
    fontWeight: '600',
  },

  listCard: {
    backgroundColor: THEME.card,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    shadowColor: '#0B0C10',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },

  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 13,
  },

  listRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },

  listAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: THEME.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: THEME.primaryLight,
  },

  listName: {
    fontSize: 14,
    fontWeight: '700',
    color: THEME.text,
  },

  listSub: {
    fontSize: 11,
    color: THEME.muted,
    marginTop: 3,
  },

  listRight: {
    alignItems: 'flex-end',
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginRight: 5,
  },

  statusLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: THEME.textSecondary,
  },

  levelText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: THEME.primary,
  },

  emptyText: {
    textAlign: 'center',
    paddingVertical: 30,
    color: THEME.muted,
    fontSize: 13,
  },

  skeletonBlock: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: THEME.skeleton,
  },

  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 110,
    backgroundColor: 'rgba(255,255,255,0.64)',
  },

  compactHeroSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    shadowColor: '#0B0C10',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 2,
  },

  skeletonHeroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  skeletonCompactMiddle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 16,
  },

  skeletonCompactDivider: {
    height: 1,
    backgroundColor: THEME.borderLight,
    marginTop: 14,
    marginBottom: 12,
  },

  skeletonCompactFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  skeletonSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 22,
  },

  skeletonStatCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    marginBottom: CARD_GAP,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },

  skeletonListCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 18,
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },

  skeletonListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
  },

  skeletonListRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },

  skeletonAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },

  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingVertical: 32,
    paddingHorizontal: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: THEME.borderLight,
  },

  errorIconWrap: {
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: THEME.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  errorTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: THEME.text,
  },

  errorText: {
    marginTop: 7,
    fontSize: 13,
    color: THEME.muted,
    textAlign: 'center',
    lineHeight: 19,
  },

  retryBtn: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 30,
  },

  retryBtnText: {
    marginLeft: 7,
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,8,8,0.55)',
  },

  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    zIndex: 101,
    elevation: 101,
    paddingTop:
      Platform.OS === 'android'
        ? 40
        : 20,
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: {
      width: 8,
      height: 0,
    },
  },

  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },

  drawerLogo: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: THEME.primary,
  },

  drawerBrand: {
    fontSize: 15,
    fontWeight: '800',
    color: THEME.text,
  },

  drawerRole: {
    fontSize: 11,
    color: THEME.muted,
    marginTop: 2,
    fontWeight: '600',
  },

  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: THEME.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  drawerUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: THEME.primarySoft,
    borderRadius: 16,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: THEME.primaryLight,
  },

  drawerUserAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: THEME.primary,
  },

  drawerUserInitial: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },

  drawerUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
  },

  drawerUserEmail: {
    fontSize: 10,
    color: THEME.muted,
    marginTop: 2,
  },

  drawerSection: {
    marginTop: 8,
  },

  drawerSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: THEME.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },

  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 12,
    marginBottom: 4,
    backgroundColor: THEME.bg,
  },

  drawerItemDanger: {
    backgroundColor: THEME.dangerLight,
  },

  drawerItemText: {
    fontSize: 13,
    fontWeight: '700',
    color: THEME.text,
    marginLeft: 8,
  },

  drawerFooter: {
    marginTop: 'auto',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },

  drawerFooterText: {
    fontSize: 11,
    color: THEME.muted,
    fontWeight: '700',
  },

  drawerFooterSub: {
    fontSize: 10,
    color: THEME.mutedLight,
    marginTop: 2,
  },

  blockedCard: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  engineContainer: {
    width: 130,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },

  outerDashedOrbit: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderStyle: 'dashed',
  },

  innerDashedOrbit: {
    position: 'absolute',
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 1.5,
    borderColor: THEME.mutedLight,
    borderStyle: 'dashed',
  },

  centerShieldHub: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: THEME.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: THEME.border,
    shadowColor: '#0F172A',
    shadowOpacity: 0.03,
    shadowRadius: 8,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    elevation: 1,
  },

  blockedTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: THEME.text,
    marginBottom: 8,
    letterSpacing: -0.4,
  },

  blockedText: {
    fontSize: 14,
    color: THEME.muted,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 16,
    paddingHorizontal: 15,
  },

  inlineHint: {
    fontSize: 13,
    color: THEME.muted,
    fontWeight: '400',
    textAlign: 'center',
  },

  hintLink: {
    color: THEME.text,
    fontWeight: '600',
  },

  modalOverlay: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    shadowColor: '#000000',
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 8,
  },

  modalIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: THEME.text,
    marginTop: 12,
    marginBottom: 6,
  },

  modalMessage: {
    fontSize: 13,
    color: THEME.muted,
    textAlign: 'center',
    marginBottom: 22,
    lineHeight: 18,
  },

  modalButton: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
  },

  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 12,
  },

  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
    flex: 1,
  },

  modalButtonConfirm: {
    backgroundColor: THEME.danger,
    flex: 1,
  },

  modalButtonCancelText: {
    color: THEME.text,
    fontWeight: '700',
    fontSize: 14,
  },
});