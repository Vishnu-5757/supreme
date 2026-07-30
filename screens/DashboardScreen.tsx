// DashboardScreen.tsx – Final: action buttons navigate to guarded tab screens if no access
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Animated,
  Dimensions,
  RefreshControl,
  Pressable,
  Platform,
  BackHandler,
  Easing,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE_URL } from '../config';
import {
  useAuthApi,
  setAuthTokens,
  clearAuthTokens,
  getAccessToken,
  setSessionExpiredCallback,
} from '../hooks/useAuthApi';
import { usePermissionContext } from '../hooks/PermissionContext';
import { userCache } from '../hooks/userCache';
import { getBadgeCount, subscribeBadge, clearBadge } from '../hooks/notifBadge';

const { width } = Dimensions.get('window');
const CARD_GAP = 12;
const CARD_WIDTH = (width - 32 - CARD_GAP) / 2;
const DRAWER_WIDTH = Math.min(330, width * 0.82);

const THEME = {
  primary: '#8E1C1C',
  primaryDark: '#6F1515',
  primaryLight: '#FCE9E9',
  primarySoft: '#FFF5F5',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#64748B',
  mutedLight: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  success: '#16A34A',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  info: '#2563EB',
  infoLight: '#EFF6FF',
};

// … (types, maps, helpers unchanged) …
type QualityKey = 'HOT' | 'MEDIUM' | '90_PCT' | 'FUTURE' | 'LOST';
const QUALITY_MAP: Record<QualityKey, { label: string; bg: string; text: string }> = {
  HOT: { label: 'Hot', bg: '#FEE2E2', text: '#991B1B' },
  MEDIUM: { label: 'Medium', bg: '#FEF3C7', text: '#92400E' },
  '90_PCT': { label: '90%', bg: '#DBEAFE', text: '#1E40AF' },
  FUTURE: { label: 'Future', bg: '#EDE9FE', text: '#5B21B6' },
  LOST: { label: 'Lost', bg: '#F3F4F6', text: '#374151' },
};

type StatusKey = 'new' | 'accepted' | 'in_progress' | 'completed' | 'cancelled';
const STATUS_MAP: Record<StatusKey, { label: string; bg: string; text: string }> = {
  new: { label: 'New', bg: '#EFF6FF', text: '#1D4ED8' },
  accepted: { label: 'Accepted', bg: '#F5F3FF', text: '#6D28D9' },
  in_progress: { label: 'In Progress', bg: '#FFF7ED', text: '#C2410C' },
  completed: { label: 'Completed', bg: '#ECFDF5', text: '#065F46' },
  cancelled: { label: 'Cancelled', bg: '#FEF2F2', text: '#991B1B' },
};

const getQualityStyle = (quality: string | undefined) => {
  const key = (quality?.toUpperCase() || 'MEDIUM') as QualityKey;
  return QUALITY_MAP[key] || QUALITY_MAP.MEDIUM;
};

const getStatusStyle = (status: string | undefined) => {
  const key = (status?.toLowerCase() || 'new') as StatusKey;
  return STATUS_MAP[key] || STATUS_MAP.new;
};

const formatCurrency = (value: any): string => {
  const num = typeof value === 'number' ? value : parseFloat(value) || 0;
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;
};

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const safeText = (value: any, fallback = '0') =>
  value === null || value === undefined ? fallback : String(value);

function StatCard({ label, value, sub, icon, color, bg, delay }: any) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, { toValue: 1, duration: 450, delay, useNativeDriver: true }).start();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <View style={[styles.statCard, { width: CARD_WIDTH }]}>
        <View style={[styles.statIcon, { backgroundColor: bg }]}>
          <MaterialCommunityIcons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
        <View style={styles.statFooter}>
          <View style={[styles.statDot, { backgroundColor: color }]} />
          <Text style={[styles.statSub, { color }]}>{sub}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function DrawerItem({ icon, label, onPress, danger, delay = 0, loading = false, locked = false }: any) {
  const itemAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(itemAnim, {
      toValue: 1,
      duration: 260,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [delay, itemAnim]);

  const handlePress = locked ? undefined : onPress;

  return (
    <Animated.View
      style={{
        opacity: itemAnim,
        transform: [{ translateX: itemAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
      }}
    >
      <Pressable
        onPress={handlePress}
        disabled={loading || locked}
        style={({ pressed }) => [
          styles.drawerItem,
          (loading || locked) && { opacity: 0.6 },
          pressed && !locked && !loading && { opacity: 0.85 },
        ]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={THEME.danger} style={{ width: 28 }} />
        ) : locked ? (
          <MaterialCommunityIcons name="lock-outline" size={18} color={THEME.mutedLight} style={{ width: 28 }} />
        ) : (
          <MaterialCommunityIcons name={icon} size={20} color={danger ? THEME.danger : THEME.text} style={{ width: 28 }} />
        )}
        <Text style={[styles.drawerItemText, danger && !locked && { color: THEME.danger }, locked && { color: THEME.mutedLight }]}>
          {loading ? 'Logging out...' : label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
// ─── ChangeProfileModal removed — profile is now a full screen flow ───


let _cachedDashboardUser: any = null;
export default function DashboardScreen({ navigation, route }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [sessionExpiredVisible, setSessionExpiredVisible] = useState(false);
  const [logoutConfirmVisible, setLogoutConfirmVisible] = useState(false);
  const [localUsername, setLocalUsername] = useState<string | null>(null);

  const { apiRequest } = useAuthApi();
  const { canAccess } = usePermissionContext();

  const [notifCount, setNotifCount] = useState(() => getBadgeCount());
  const bellAnim = useRef(new Animated.Value(0)).current;
  const bellLoopRef = useRef<any>(null);
  const bellRunning = useRef(false);
  const bellIdleAnim = useRef(new Animated.Value(0)).current;
  const bellIdleLoopRef = useRef<any>(null);
  const rippleAnim = useRef(new Animated.Value(0)).current;

  const headerAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(0)).current;
const overlayAnim = useRef(new Animated.Value(0)).current;
const itemGroupAnim = useRef(new Animated.Value(0)).current;
const swipeTranslateX = useRef(new Animated.Value(0)).current;
const drawerPanRef = useRef(
  PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => g.dx < -8 && Math.abs(g.dy) < 30,
    onPanResponderMove: (_, g) => {
      if (g.dx < 0) swipeTranslateX.setValue(g.dx);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -60 || g.vx < -0.5) {
        Animated.timing(swipeTranslateX, {
          toValue: -DRAWER_WIDTH,
          duration: 220,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }).start(() => setDrawerOpen(false));
      } else {
        Animated.spring(swipeTranslateX, {
          toValue: 0,
          friction: 16,
          tension: 80,
          useNativeDriver: true,
        }).start();
      }
    },
  })
);
  const clockSpin = useRef(new Animated.Value(0)).current;
  const counterSpin = useRef(new Animated.Value(0)).current;
  const hubPulse = useRef(new Animated.Value(1)).current;
  const contentFade = useRef(new Animated.Value(0)).current;
  const contentY = useRef(new Animated.Value(12)).current;

 if (route?.params?.user) { _cachedDashboardUser = route.params.user; userCache.current = _cachedDashboardUser; }
const user = _cachedDashboardUser;
  const accessTokenFromParams = route?.params?.accessToken ?? '';
  const refreshTokenFromParams = route?.params?.refreshToken ?? '';

  const today = useMemo(
    () => new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    []
  );

  useEffect(() => {
    if (accessTokenFromParams && refreshTokenFromParams) setAuthTokens(accessTokenFromParams, refreshTokenFromParams);
  }, [accessTokenFromParams, refreshTokenFromParams]);

  useEffect(() => {
    setSessionExpiredCallback(() => setSessionExpiredVisible(true));
    return () => setSessionExpiredCallback(null);
  }, []);

  const closeDrawer = () => setDrawerOpen(false);

  // ── MISSING: Animate drawer open/close ──
useEffect(() => {
  if (drawerOpen) {
    swipeTranslateX.setValue(0); // reset swipe offset on open
    setDrawerVisible(true);
    Animated.parallel([
      Animated.spring(drawerAnim, {
        toValue: 1,
        friction: 18,        // higher = less bounce, more premium
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(itemGroupAnim, {
        toValue: 1,
        duration: 380,
        delay: 160,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
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
}, [drawerOpen]);

// ── MISSING: Android back button closes drawer ──
useEffect(() => {
  const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
    if (drawerOpen) {
      closeDrawer();
      return true;
    }
    return false;
  });
  return () => backHandler.remove();
}, [drawerOpen]);
  const performLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch(`${API_BASE_URL}/api/logout/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getAccessToken()}` },
        body: JSON.stringify({ refresh: refreshTokenFromParams }),
      });
    } catch (err) { console.warn('Logout request failed, proceeding locally:', err); }
    finally { clearAuthTokens(); _cachedDashboardUser = null; setLoggingOut(false); closeDrawer(); navigation.replace('Login'); }
  };

  const handleLogoutPress = () => setLogoutConfirmVisible(true);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const response = await apiRequest(`${API_BASE_URL}/dashboard/api/`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      setDashboardData(json);
      setError(null);
    } catch (err: any) {
      if (err.message === 'SESSION_EXPIRED') setSessionExpiredVisible(true);
      else { console.error('Dashboard fetch error:', err); setError(err.message || 'Failed to load dashboard'); }
    } finally { setLoading(false); setRefreshing(false); }
  };

  const hasDashboardAccess = canAccess('dashboard');

  useEffect(() => {
    if (hasDashboardAccess) fetchDashboard();
    else { setLoading(false); setDashboardData(null); }
  }, [hasDashboardAccess]);

  useEffect(() => { Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(); }, [headerAnim]);

  // Subscribe to badge count changes from incoming notifications
  useEffect(() => subscribeBadge(setNotifCount), []);

  // Bell shake — fast ring when notifications arrive
  useEffect(() => {
    if (notifCount > 0 && !bellRunning.current) {
      bellRunning.current = true;
      bellIdleLoopRef.current?.stop();
      bellIdleAnim.setValue(0);
      bellLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bellAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.delay(2400),
        ])
      );
      bellLoopRef.current.start();
    } else if (notifCount === 0 && bellRunning.current) {
      bellRunning.current = false;
      bellLoopRef.current?.stop();
      bellLoopRef.current = null;
      bellAnim.setValue(0);
    }
    return () => { bellLoopRef.current?.stop(); };
  }, [notifCount]);

  // Gentle idle swing when no notifications — bell gently rings every 5 seconds
  useEffect(() => {
    if (notifCount === 0) {
      bellIdleLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(bellIdleAnim, { toValue: 1, duration: 750, easing: Easing.out(Easing.sin), useNativeDriver: true }),
          Animated.delay(4500),
          Animated.timing(bellIdleAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      bellIdleLoopRef.current.start();
    } else {
      bellIdleLoopRef.current?.stop();
      bellIdleAnim.setValue(0);
    }
    return () => { bellIdleLoopRef.current?.stop(); };
  }, [notifCount]);

  // Ripple ring — only runs when there are unread notifications
  useEffect(() => {
    if (notifCount > 0) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(rippleAnim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.delay(2300),
          Animated.timing(rippleAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    } else {
      rippleAnim.setValue(0);
    }
  }, [notifCount]);

  // Sync username from shared cache when returning from ProfileScreen / EditProfileScreen
  useFocusEffect(
    React.useCallback(() => {
      if (userCache.current?.username) {
        setLocalUsername(userCache.current.username);
      }
    }, [])
  );

  useEffect(() => {
    if (!hasDashboardAccess) {
      Animated.parallel([
        Animated.timing(contentFade, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.spring(contentY, { toValue: 0, friction: 9, tension: 50, useNativeDriver: true }),
      ]).start();
      Animated.loop(Animated.timing(clockSpin, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true })).start();
      Animated.loop(Animated.timing(counterSpin, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })).start();
      Animated.loop(Animated.sequence([
        Animated.timing(hubPulse, { toValue: 0.95, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hubPulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])).start();
    }
  }, [hasDashboardAccess]);

  // … rest of the useEffects unchanged …

  const onRefresh = async () => { setRefreshing(true); await fetchDashboard(); };
  const openDrawer = () => setDrawerOpen(true);
  const openScreen = (screen: string) => { closeDrawer(); if (screen === 'Users') navigation.navigate('Users'); else if (screen === 'Leads') navigation.navigate('Leads'); else if (screen === 'Projects') navigation.navigate('Projects'); else if (screen === 'Service') navigation.navigate('Service'); };

  const drawerTranslateX = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [-DRAWER_WIDTH - 44, 0] });
  const drawerOpacity = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] });
  const drawerScale = drawerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
  const overlayOpacity = overlayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const spinClockwise = clockSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinCounterClockwise = counterSpin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  // Fast shake for notifications
  const bellRotate = bellAnim.interpolate({
    inputRange: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1],
    outputRange: ['0deg', '25deg', '-25deg', '18deg', '-18deg', '10deg', '-5deg', '0deg'],
  });
  // Gentle damped swing for idle state
  const bellIdleRotate = bellIdleAnim.interpolate({
    inputRange: [0, 0.2, 0.45, 0.65, 0.82, 1],
    outputRange: ['0deg', '14deg', '-10deg', '6deg', '-3deg', '0deg'],
  });
  // Ripple ring scale and fade
  const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
  const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0.7, 0.35, 0] });

  const activeUsername = localUsername ?? user?.username ?? 'Admin';
  const displayName = user?.first_name ? `${user.first_name} ${user.last_name ?? ''}`.trim() : activeUsername;
  const branchName = user?.profile?.branch?.name ? String(user.profile.branch.name) : 'Branch 01';
  const firstName = user?.first_name || displayName.split(' ')[0] || activeUsername;
  const initials = displayName.split(' ').filter(Boolean).map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; })();

  const totalRevenue = dashboardData?.total_revenue ?? 0;
  const totalOutstanding = dashboardData?.total_outstanding ?? dashboardData?.pending_payments ?? 0;
  const loanProjects = dashboardData?.loan_project_count ?? 0;
  const totalProjects = dashboardData?.total_projects_count ?? dashboardData?.total_projects ?? 0;
  const activeComplaints = dashboardData?.active_complaints_count ?? dashboardData?.active_complaints ?? 0;
  const recentProjects = dashboardData?.recent_projects ?? [];
  const recentLeads = dashboardData?.recent_leads ?? [];
  
  const stats = dashboardData ? [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue), sub: `${safeText(totalProjects)} projects`, icon: 'chart-areaspline', color: THEME.success, bg: THEME.successLight },
    { label: 'Outstanding', value: formatCurrency(totalOutstanding), sub: `${safeText(loanProjects)} loan projects`, icon: 'clock-alert-outline', color: THEME.warning, bg: THEME.warningLight },
    { label: 'Active Complaints', value: safeText(activeComplaints), sub: 'Requires attention', icon: 'bell-alert-outline', color: THEME.danger, bg: THEME.dangerLight },
    { label: 'Total Projects', value: safeText(totalProjects), sub: `${safeText(loanProjects)} loan projects`, icon: 'layers-triple-outline', color: THEME.info, bg: THEME.infoLight },
  ] : [];

  return (
    <View style={{ flex: 1, backgroundColor: THEME.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} translucent={false} />
      <SafeAreaView style={{ flex: 1, backgroundColor: THEME.primary }} edges={['top']}>
        <View style={{ flex: 1, backgroundColor: THEME.bg }}>
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: headerAnim }]}>
            <TouchableOpacity onPress={openDrawer} style={styles.menuBtn} activeOpacity={0.85}>
              <MaterialCommunityIcons name="menu" size={22} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerLeft}>
              <Text style={styles.headerBrand}>SUPREME ENERGIES</Text>
              <Text style={styles.headerDate}>{today}</Text>
            </View>
            <View style={styles.headerRight}>
              <View style={styles.bellWrap}>
                {/* Expanding ripple ring */}
                <Animated.View
                  pointerEvents="none"
                  style={[styles.bellRipple, { opacity: rippleOpacity, transform: [{ scale: rippleScale }] }]}
                />
                <TouchableOpacity
                  style={styles.iconBtn}
                  activeOpacity={0.85}
                  onPress={() => { clearBadge(); navigation.navigate('Notifications'); }}
                >
                  <Animated.View style={{ transform: [{ rotate: notifCount > 0 ? bellRotate : bellIdleRotate }] }}>
                    <MaterialCommunityIcons name="bell-outline" size={20} color="#FFF" />
                  </Animated.View>
                  {notifCount > 0 && (
                    <View style={styles.notifBadge}>
                      <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : String(notifCount)}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.avatarBtn} activeOpacity={0.85} onPress={() => navigation.navigate('Profile', { user: _cachedDashboardUser ?? user })}>
                <MaterialCommunityIcons name="account-circle-outline" size={20} color={THEME.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Content area */}
          <View style={styles.contentArea}>
            <ScrollView
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={hasDashboardAccess ? styles.scroll : styles.blockedScroll}
              refreshControl={hasDashboardAccess ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} /> : undefined}
              scrollEnabled={hasDashboardAccess}
            >
              {hasDashboardAccess ? (
                <>
                  <View style={styles.heroCard}>
                    <View style={styles.heroTopRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.heroTitle}>Welcome back, {displayName}</Text>
                        <Text style={styles.heroSub}>Here is your daily business overview</Text>
                      </View>
                      <View style={styles.branchChip}>
                        <View style={styles.branchDot} />
                        <Text style={styles.branchText}>{branchName}</Text>
                      </View>
                    </View>

                    {/* Action buttons – always visible, navigate to tab if no permission */}
                    <View style={styles.heroActions}>
                      <TouchableOpacity
                        style={styles.primaryAction}
                        onPress={() => {
                          if (canAccess('project')) navigation.navigate('AddEditProject');
                          else navigation.navigate('Projects');   // tab screen will show NoAccess
                        }}
                        activeOpacity={0.9}
                      >
                        <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
                        <Text style={styles.primaryActionText}>New Project</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.secondaryAction}
                        onPress={() => {
                          if (canAccess('lead')) navigation.navigate('AddEditLead');
                          else navigation.navigate('Leads');      // tab screen will show NoAccess
                        }}
                        activeOpacity={0.9}
                      >
                        <MaterialCommunityIcons name="account-group-outline" size={18} color={THEME.primary} />
                        <Text style={styles.secondaryActionText}>New Lead</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {loading ? (
                    <View style={styles.centerLoader}><ActivityIndicator size="large" color={THEME.primary} /><Text style={styles.loaderText}>Loading dashboard...</Text></View>
                  ) : error ? (
                    <View style={styles.centerLoader}><MaterialCommunityIcons name="alert-circle-outline" size={44} color={THEME.danger} /><Text style={styles.errorText}>{error}</Text><TouchableOpacity style={styles.retryBtn} onPress={fetchDashboard}><Text style={styles.retryBtnText}>Retry</Text></TouchableOpacity></View>
                  ) : (
                    <>
                      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Overview</Text><Text style={styles.sectionHint}>This month</Text></View>
                      <View style={styles.statsGrid}>{stats.map((item, i) => <StatCard key={item.label} {...item} delay={i * 80} />)}</View>

                      {/* Recent Projects – hidden if no project access */}
                      {canAccess('project') && (
                        <>
                          <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Projects</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Projects')}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
                          </View>
                          <View style={styles.listCard}>
                            {recentProjects?.length ? recentProjects.map((project: any, i: number) => {
                              const badge = getStatusStyle(project?.status || project?.status_display) || getQualityStyle(project?.quality);
                              const title = project?.customer_name || project?.name || project?.title || project?.project_name || 'Project';
                              const subtitle = project?.mobile || project?.phone || formatDate(project?.created_at);
                              const amountText = project?.total_amount ? formatCurrency(project.total_amount) : '';
                              return (
                                <TouchableOpacity key={project?.id ?? `${title}-${i}`} activeOpacity={0.9} style={[styles.listRow, i < recentProjects.length - 1 && styles.listRowBorder]} onPress={() => navigation.navigate('AddEditProject', { project, onSuccess: onRefresh })}>
                                  <View style={styles.listAvatar}><MaterialCommunityIcons name="briefcase-outline" size={18} color={THEME.primary} /></View>
                                  <View style={{ flex: 1 }}><Text style={styles.listName}>{title}</Text><Text style={styles.listSub}>{subtitle}{project?.created_at ? ` · ${formatDate(project.created_at)}` : ''}</Text></View>
                                  <View style={{ alignItems: 'flex-end' }}><View style={[styles.badge, { backgroundColor: badge.bg, marginBottom: 4 }]}><Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text></View><Text style={[styles.levelText, { color: THEME.primary }]}>{amountText}</Text></View>
                                </TouchableOpacity>
                              );
                            }) : <Text style={styles.emptyText}>No recent projects</Text>}
                          </View>
                        </>
                      )}

                      {/* Recent Leads – hidden if no lead access */}
                      {canAccess('lead') && (
                        <>
                          <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Recent Leads</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('Leads')}><Text style={styles.seeAll}>See all</Text></TouchableOpacity>
                          </View>
                          <View style={[styles.listCard, { marginBottom: 32 }]}>
                            {recentLeads?.length ? recentLeads.map((lead: any, i: number) => {
                              const quality = lead?.quality_name || lead?.quality || '';
                              const badge = getQualityStyle(quality);
                              const title = lead?.customer_name || lead?.name || 'Lead';
                              const subtitle = lead?.mobile || '';
                              const followUp = lead?.follow_up_date ? formatDate(lead.follow_up_date) : 'No follow-up';
                              return (
                                <TouchableOpacity key={lead?.id ?? `${title}-${i}`} activeOpacity={0.9} style={[styles.listRow, i < recentLeads.length - 1 && styles.listRowBorder]} onPress={() => navigation.navigate('AddEditLead', { lead, onSuccess: onRefresh })}>
                                  <View style={[styles.listAvatar, { backgroundColor: THEME.primaryLight }]}><MaterialCommunityIcons name="account-group-outline" size={18} color={THEME.primary} /></View>
                                  <View style={{ flex: 1 }}><Text style={styles.listName}>{title}</Text><Text style={styles.listSub}>{subtitle}</Text></View>
                                  <View style={{ alignItems: 'flex-end' }}><View style={[styles.badge, { backgroundColor: badge.bg, marginBottom: 4 }]}><Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text></View><Text style={[styles.levelText, { color: THEME.primary }]}>{followUp}</Text></View>
                                </TouchableOpacity>
                              );
                            }) : <Text style={styles.emptyText}>No recent leads</Text>}
                          </View>
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* Restricted view animation */
                <Animated.View style={[styles.blockedCard, { opacity: contentFade, transform: [{ translateY: contentY }] }]}>
                  <View style={styles.engineContainer}>
                    <Animated.View style={[styles.outerDashedOrbit, { transform: [{ rotate: spinCounterClockwise }] }]} />
                    <Animated.View style={[styles.innerDashedOrbit, { transform: [{ rotate: spinClockwise }] }]} />
                    <Animated.View style={[styles.centerShieldHub, { transform: [{ scale: hubPulse }] }]}><MaterialCommunityIcons name="lock-minus-outline" size={28} color={THEME.text} /></Animated.View>
                  </View>
                  <Text style={styles.blockedTitle}>Access Required</Text>
                  <Text style={styles.blockedText}>You need permission to unlock the Dashboard workspace.</Text>
                  <Text style={styles.inlineHint}>Locked out? <Text style={styles.hintLink}>Ask your admin for access</Text></Text>
                </Animated.View>
              )}
            </ScrollView>
          </View>

          {/* Drawer (always functional) */}
          {drawerVisible && (
            <View style={styles.drawerLayer} pointerEvents="box-none">
              <Pressable style={StyleSheet.absoluteFillObject} onPress={closeDrawer}><Animated.View pointerEvents="none" style={[styles.overlay, { opacity: overlayOpacity }]} /></Pressable>
              <Animated.View
  style={[styles.drawer, {
    width: DRAWER_WIDTH,
    opacity: drawerOpacity,
    transform: [
      { translateX: Animated.add(drawerTranslateX, swipeTranslateX) },
      { scale: drawerScale },
    ],
  }]}
  
  {...drawerPanRef.current.panHandlers}
>
                <View style={styles.drawerHeader}>
                  <View style={styles.drawerLogo}><MaterialCommunityIcons name="shield-check-outline" size={20} color="#FFF" /></View>
                  <View style={{ flex: 1 }}><Text style={styles.drawerBrand}>Supreme Energies</Text><Text style={styles.drawerRole}>{user?.is_superuser ? 'Super Admin' : user?.is_staff ? 'Staff' : 'Admin Portal'}</Text></View>
                  <TouchableOpacity onPress={closeDrawer} style={styles.closeBtn}><MaterialCommunityIcons name="close" size={20} color={THEME.text} /></TouchableOpacity>
                </View>
                {user && (
                  <View style={styles.drawerUserChip}>
                    <View style={styles.drawerUserAvatar}><Text style={styles.drawerUserInitial}>{(user.first_name?.[0] ?? user.username?.[0] ?? 'U').toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}><Text style={styles.drawerUserName}>{displayName}</Text><Text style={styles.drawerUserEmail} numberOfLines={1}>{user.email || activeUsername}</Text></View>
                  </View>
                )}
                <Animated.View style={{ opacity: itemGroupAnim, transform: [{ translateY: itemGroupAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }) }] }}>
                  <View style={styles.drawerSection}>
                    <Text style={styles.drawerSectionTitle}>Navigation</Text>
                    <DrawerItem icon="home-analytics" label="Dashboard" onPress={() => openScreen('Dashboard')} delay={0} />
                    <DrawerItem icon="layers-triple-outline" label="Projects" onPress={() => openScreen('Projects')} delay={70} locked={!canAccess('project')} />
                    <DrawerItem icon="tools" label="Service" onPress={() => openScreen('Service')} delay={140} locked={!canAccess('service')} />
                    <DrawerItem icon="account-multiple-plus-outline" label="Leads" onPress={() => openScreen('Leads')} delay={210} locked={!canAccess('lead')} />
                    <DrawerItem icon="shield-account-outline" label="Users" onPress={() => openScreen('Users')} delay={280} locked={!canAccess('users')} />
                  </View>
                  <View style={styles.drawerSection}><Text style={styles.drawerSectionTitle}>Account</Text><DrawerItem icon="logout-variant" label="Logout" onPress={handleLogoutPress} danger delay={340} loading={loggingOut} /></View>
                </Animated.View>
                <View style={styles.drawerFooter}><Text style={styles.drawerFooterText}>Version 2.0.4</Text><Text style={styles.drawerFooterSub}>Secure session active</Text></View>
              </Animated.View>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Session Expired Modal */}
      <Modal
        visible={sessionExpiredVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <MaterialCommunityIcons name="clock-outline" size={48} color={THEME.danger} />
            <Text style={styles.modalTitle}>Session Expired</Text>
            <Text style={styles.modalMessage}>Your session has expired. Please log in again to continue.</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => { setSessionExpiredVisible(false); performLogout(); }}
            >
              <Text style={styles.modalButtonText}>Login Again</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Logout Confirm Modal */}
      <Modal
        visible={logoutConfirmVisible}
        transparent
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        navigationBarTranslucent
        onRequestClose={() => setLogoutConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <MaterialCommunityIcons name="logout" size={48} color={THEME.danger} />
            <Text style={styles.modalTitle}>Confirm Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalButtonRow}>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonCancel]} onPress={() => setLogoutConfirmVisible(false)}>
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalButton, styles.modalButtonConfirm]} onPress={() => { setLogoutConfirmVisible(false); performLogout(); }}>
                <Text style={styles.modalButtonText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  contentArea: { flex: 1, backgroundColor: THEME.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 5 },
  blockedScroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, paddingBottom: 40 },
  header: { backgroundColor: THEME.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  menuBtn: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10, backgroundColor: 'rgba(255,255,255,0.12)' },
  headerLeft: { flex: 1 },
  headerBrand: { color: '#FFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.8 },
  headerDate: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  bellWrap: { position: 'relative', marginRight: 8, width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  bellRipple: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 10, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  notifBadge: { position: 'absolute', top: 3, right: 3, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: THEME.primary },
  notifBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '900', lineHeight: 11 },
  avatarBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center' },
  heroCard: { backgroundColor: THEME.card, borderRadius: 20, padding: 16, marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2, borderWidth: 1, borderColor: THEME.borderLight },
  heroTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  heroTitle: { fontSize: 18, fontWeight: '800', color: THEME.text },
  heroSub: { marginTop: 4, fontSize: 12, color: THEME.muted },
  branchChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.primarySoft, borderWidth: 1, borderColor: THEME.primaryLight, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  branchDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: THEME.success, marginRight: 6 },
  branchText: { fontSize: 11, fontWeight: '700', color: THEME.primary },
  heroActions: { flexDirection: 'row', gap: 10 },
  primaryAction: { flex: 1, backgroundColor: THEME.primary, borderRadius: 14, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  primaryActionText: { color: '#FFF', fontSize: 13, fontWeight: '700', marginLeft: 6 },
  secondaryAction: { flex: 1, backgroundColor: '#FFF', borderWidth: 1.5, borderColor: THEME.border, borderRadius: 14, minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  secondaryActionText: { color: THEME.primary, fontSize: 13, fontWeight: '700', marginLeft: 6 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: THEME.text },
  sectionHint: { fontSize: 11, color: THEME.muted, fontWeight: '600' },
  seeAll: { fontSize: 12, color: THEME.primary, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  statCard: { backgroundColor: THEME.card, borderRadius: 16, padding: 14, marginBottom: CARD_GAP, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: THEME.borderLight },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 20, fontWeight: '800', color: THEME.text },
  statLabel: { fontSize: 11, color: THEME.muted, marginTop: 2, fontWeight: '600' },
  statFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  statDot: { width: 4, height: 4, borderRadius: 2, marginRight: 5 },
  statSub: { fontSize: 10, fontWeight: '700' },
  listCard: { backgroundColor: THEME.card, borderRadius: 16, overflow: 'hidden', marginBottom: 18, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1, borderWidth: 1, borderColor: THEME.borderLight },
  listRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: THEME.borderLight },
  listAvatar: { width: 38, height: 38, borderRadius: 12, backgroundColor: THEME.primaryLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listName: { fontSize: 14, fontWeight: '700', color: THEME.text },
  listSub: { fontSize: 11, color: THEME.muted, marginTop: 3 },
  badge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '800' },
  levelText: { fontSize: 11, fontWeight: '800' },
  drawerLayer: { ...StyleSheet.absoluteFillObject, zIndex: 100, elevation: 100 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  drawer: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#FFF', zIndex: 101, elevation: 101, paddingTop: Platform.OS === 'android' ? 40 : 20, paddingHorizontal: 16, paddingBottom: 24, borderTopRightRadius: 24, borderBottomRightRadius: 24, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 6, height: 0 } },
  drawerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  drawerLogo: { width: 40, height: 40, borderRadius: 12, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  drawerBrand: { fontSize: 15, fontWeight: '800', color: THEME.text },
  drawerRole: { fontSize: 11, color: THEME.muted, marginTop: 2, fontWeight: '600' },
  closeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' },
  drawerUserChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: THEME.primarySoft, borderRadius: 14, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: THEME.primaryLight },
  drawerUserAvatar: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  drawerUserInitial: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  drawerUserName: { fontSize: 13, fontWeight: '700', color: THEME.text },
  drawerUserEmail: { fontSize: 10, color: THEME.muted, marginTop: 2 },
  drawerSection: { marginTop: 8 },
  drawerSectionTitle: { fontSize: 11, fontWeight: '800', color: THEME.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', minHeight: 46, borderRadius: 12, paddingHorizontal: 12, marginBottom: 4, backgroundColor: THEME.bg },
  drawerItemText: { fontSize: 13, fontWeight: '700', color: THEME.text, marginLeft: 8 },
  drawerFooter: { marginTop: 'auto', paddingTop: 12, borderTopWidth: 1, borderTopColor: THEME.border },
  drawerFooterText: { fontSize: 11, color: THEME.muted, fontWeight: '700' },
  drawerFooterSub: { fontSize: 10, color: THEME.mutedLight, marginTop: 2 },
  centerLoader: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  loaderText: { marginTop: 12, fontSize: 13, color: THEME.muted, fontWeight: '500' },
  errorText: { marginTop: 12, fontSize: 13, color: THEME.danger, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { marginTop: 18, backgroundColor: THEME.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 30 },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  emptyText: { textAlign: 'center', paddingVertical: 32, color: THEME.muted, fontSize: 13 },
  blockedCard: { alignItems: 'center', justifyContent: 'center' },
  engineContainer: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  outerDashedOrbit: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, borderColor: '#E2E8F0', borderStyle: 'dashed' },
  innerDashedOrbit: { position: 'absolute', width: 86, height: 86, borderRadius: 43, borderWidth: 1.5, borderColor: '#94A3B8', borderStyle: 'dashed' },
  centerShieldHub: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E2E8F0', shadowColor: '#0F172A', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 1 },
  blockedTitle: { fontSize: 22, fontWeight: '700', color: THEME.text, marginBottom: 8, letterSpacing: -0.4 },
  blockedText: { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 21, marginBottom: 16, paddingHorizontal: 15 },
  inlineHint: { fontSize: 13, color: THEME.muted, fontWeight: '400', textAlign: 'center' },
  hintLink: { color: THEME.text, fontWeight: '600' },
  modalOverlay: { flex: 1, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16 },
  modalContainer: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', maxWidth: 340, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, elevation: 8 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: THEME.text, marginTop: 12, marginBottom: 6 },
  modalMessage: { fontSize: 13, color: THEME.muted, textAlign: 'center', marginBottom: 22, lineHeight: 18 },
  modalButton: { backgroundColor: THEME.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30, width: '100%', alignItems: 'center' },
  modalButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  modalButtonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 12 },
  modalButtonCancel: { backgroundColor: '#F3F4F6', flex: 1 },
  modalButtonConfirm: { backgroundColor: THEME.danger, flex: 1 },
  modalButtonCancelText: { color: THEME.text, fontWeight: '700', fontSize: 14 },
});