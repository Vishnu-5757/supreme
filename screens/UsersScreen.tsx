import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator,
  FlatList,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';
import { useFocusEffect } from '@react-navigation/native';
import { clearBadge, getBadgeCount, subscribeBadge } from '../hooks/notifBadge';
import { AccountMenu } from '../components/AccountMenu';

const { width } = Dimensions.get('window');

// ─── THEME (same as LeadsScreen) ─────────────────────────────────────────────
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

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getInitials = (name: string, username: string) => {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }
  return username ? username.substring(0, 2).toUpperCase() : 'U';
};

// ─── UserDeleteConfirmModal ────────────────────────────────────────────────────
const UserDeleteConfirmModal = ({ visible, username, onCancel, onConfirm, loading }: any) => (
  <Modal transparent visible={visible} animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
    <View style={dmStyles.overlay}>
      <View style={dmStyles.card}>
        <View style={dmStyles.iconWrap}>
          <MaterialCommunityIcons name="delete-alert-outline" size={36} color={THEME.danger} />
        </View>
        <Text style={dmStyles.title}>Delete User?</Text>
        <Text style={dmStyles.msg}>
          Are you sure you want to delete{' '}
          <Text style={{ fontWeight: '800', color: THEME.text }}>"{username}"</Text>?
          {'\n'}This action cannot be undone.
        </Text>
        <View style={dmStyles.btns}>
          <TouchableOpacity style={dmStyles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={dmStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[dmStyles.deleteBtn, loading && { opacity: 0.65 }]} onPress={onConfirm} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator size="small" color="#FFF" />
              : <><MaterialCommunityIcons name="delete" size={16} color="#FFF" /><Text style={dmStyles.deleteText}>Yes, Delete</Text></>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const dmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,18,36,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  card:    { width: '100%', backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center', elevation: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  iconWrap:   { width: 72, height: 72, borderRadius: 36, backgroundColor: THEME.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title:      { fontSize: 20, fontWeight: '800', color: THEME.text, marginBottom: 8 },
  msg:        { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  btns:       { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 14, borderWidth: 1.5, borderColor: THEME.border, alignItems: 'center', backgroundColor: '#FAFBFC' },
  cancelText: { fontSize: 14, fontWeight: '700', color: THEME.textSecondary },
  deleteBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: THEME.danger, paddingVertical: 13, borderRadius: 14, elevation: 3, shadowColor: THEME.danger, shadowOpacity: 0.3, shadowRadius: 8 },
  deleteText: { color: '#FFF', fontWeight: '800', fontSize: 14 },
});

// ─── UserFeedbackModal ─────────────────────────────────────────────────────────
const UFM_CFG = {
  success: { bg: '#059669', tint: '#ECFDF5', icon: 'check-bold',  btn: 'Done'   },
  error:   { bg: '#DC2626', tint: '#FEF2F2', icon: 'close-thick', btn: 'Got it' },
} as const;

const UserFeedbackModal = ({ visible, type, title, message, onClose }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  const cardScale  = anim.interpolate({ inputRange: [0, 0.6, 1],      outputRange: [0.85, 1.02, 1] });
  const cardOpacity = anim.interpolate({ inputRange: [0, 0.3, 1],     outputRange: [0, 1, 1] });
  const iconScale  = anim.interpolate({ inputRange: [0, 0.6, 0.8, 1], outputRange: [0, 0, 1.15, 1] });
  const ctOpacity  = anim.interpolate({ inputRange: [0, 0.5, 1],      outputRange: [0, 0, 1] });
  const ctY        = anim.interpolate({ inputRange: [0, 0.5, 1],      outputRange: [10, 10, 0] });

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, tension: 55, friction: 8, useNativeDriver: true }).start();
    } else {
      anim.setValue(0);
    }
  }, [visible]);

  const cfg = UFM_CFG[type as 'success' | 'error'] ?? UFM_CFG.error;
  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={ufmStyles.overlay}>
        <Animated.View style={[ufmStyles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <View style={ufmStyles.iconZone}>
            <Animated.View style={[ufmStyles.iconBg, { backgroundColor: cfg.tint, transform: [{ scale: iconScale }] }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={34} color={cfg.bg} />
            </Animated.View>
          </View>
          <Animated.View style={[ufmStyles.textZone, { opacity: ctOpacity, transform: [{ translateY: ctY }] }]}>
            <Text style={ufmStyles.title}>{title}</Text>
            <Text style={ufmStyles.message}>{message}</Text>
          </Animated.View>
          <View style={ufmStyles.sep} />
          <Animated.View style={{ width: '100%', opacity: ctOpacity }}>
            <TouchableOpacity style={ufmStyles.btn} onPress={onClose} activeOpacity={0.75}>
              <Text style={[ufmStyles.btnText, { color: cfg.bg }]}>{cfg.btn}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const ufmStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(10,18,36,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card:     { width: '100%', backgroundColor: '#FFF', borderRadius: 24, alignItems: 'center', overflow: 'hidden', elevation: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  iconZone: { paddingTop: 32, paddingBottom: 16, alignItems: 'center' },
  iconBg:   { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  textZone: { paddingHorizontal: 24, alignItems: 'center', paddingBottom: 20 },
  title:    { fontSize: 19, fontWeight: '800', color: '#0F172A', marginBottom: 6, textAlign: 'center' },
  message:  { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  sep:      { width: '100%', height: 1, backgroundColor: '#F1F5F9' },
  btn:      { width: '100%', paddingVertical: 17, alignItems: 'center', backgroundColor: '#FFF' },
  btnText:  { fontSize: 15, fontWeight: '700' },
});

// ─── User Card (Compact, Lead‑style) ──────────────────────────────────────────
// ─── User Card (Branch name moved to right side) ──────────────────────────────
const UserCard = ({ user, index, onEdit, onDelete }: any) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, delay: index * 20, duration: 220, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, delay: index * 20, useNativeDriver: true, tension: 80, friction: 11 }),
    ]).start();
  }, [index]);

  const getRoleBadge = () => {
    if (user.is_superuser) return { label: 'Admin', color: THEME.info, bg: THEME.infoLight, icon: 'shield-account' };
    if (user.is_staff) return { label: 'Staff', color: THEME.warning, bg: THEME.warningLight, icon: 'account-cog' };
    return { label: 'User', color: THEME.muted, bg: THEME.borderLight, icon: 'account' };
  };
  const role = getRoleBadge();

  const displayName = user.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : user.username;

  const initials = getInitials(displayName, user.username);
  const branchName = user.profile?.branch?.name || 'No branch';

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: translateAnim }] }}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => onEdit(user)} style={styles.userCard}>
        {/* Top section: avatar, main info, status + actions */}
        <View style={styles.cardTop}>
          <View style={[styles.avatarRing, { borderColor: role.color + '55' }]}>
            <View style={[styles.avatar, { backgroundColor: role.bg }]}>
              <Text style={[styles.avatarText, { color: role.color }]}>{initials}</Text>
            </View>
          </View>

          <View style={styles.cardMiddle}>
            <View style={styles.nameRow}>
              <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
              {user.profile?.is_technician && (
                <View style={styles.techBadge}>
                  <MaterialCommunityIcons name="wrench" size={10} color={THEME.primary} />
                  <Text style={styles.techBadgeText}>Tech</Text>
                </View>
              )}
            </View>
            <Text style={styles.userEmail} numberOfLines={1}>{user.email || '—'}</Text>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={11} color={THEME.muted} />
              <Text style={styles.metaText}>{formatDate(user.date_joined)}</Text>
            </View>
          </View>

          <View style={styles.cardRight}>
            <View style={[styles.statusChip, { backgroundColor: user.is_active ? THEME.successLight : THEME.dangerLight }]}>
              <View style={[styles.statusDot, { backgroundColor: user.is_active ? THEME.success : THEME.danger }]} />
              <Text style={[styles.statusText, { color: user.is_active ? THEME.success : THEME.danger }]}>
                {user.is_active ? 'Active' : 'Inactive'}
              </Text>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(user)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="pencil-outline" size={16} color={THEME.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => onDelete(user)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="delete-outline" size={16} color={THEME.danger} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Bottom footer row: role on left, branch on right */}
        <View style={styles.cardFooter}>
          <View style={[styles.roleFooter, { backgroundColor: role.bg }]}>
            <MaterialCommunityIcons name={role.icon} size={12} color={role.color} />
            <Text style={[styles.roleFooterText, { color: role.color }]}>{role.label}</Text>
          </View>
          <View style={styles.branchFooter}>
            <MaterialCommunityIcons name="store-outline" size={11} color={THEME.muted} />
            <Text style={styles.branchFooterText} numberOfLines={1}>{branchName}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ── Loading Screen ───────────────────────────────────────────────
const LoadingScreen = () => {
  const pulse = useRef(new Animated.Value(1)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;
  const shimmer1 = useRef(new Animated.Value(0.4)).current;
  const shimmer2 = useRef(new Animated.Value(0.4)).current;
  const shimmer3 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1.12, duration: 700, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
    ])).start();
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 1200, useNativeDriver: true })
    ).start();
    const makeShimmer = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]));
    makeShimmer(shimmer1, 0).start();
    makeShimmer(shimmer2, 200).start();
    makeShimmer(shimmer3, 400).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  return (
    <Animated.View style={[loadStyles.wrapper, { opacity: fadeIn }]}>
      <View style={loadStyles.body}>
        <View style={loadStyles.spinnerWrap}>
          <Animated.View style={[loadStyles.spinRing, { transform: [{ rotate }] }]} />
          <Animated.View style={[loadStyles.iconCircle, { transform: [{ scale: pulse }] }]}>
            <MaterialCommunityIcons name="account-group-outline" size={30} color="#FFF" />
          </Animated.View>
        </View>
        <Text style={loadStyles.title}>Loading Users</Text>
        <Text style={loadStyles.subtitle}>Fetching your records…</Text>
        {([shimmer1, shimmer2, shimmer3] as Animated.Value[]).map((anim, i) => (
          <Animated.View key={i} style={[loadStyles.skeletonCard, { opacity: anim }]}>
            <View style={loadStyles.skeletonAvatar} />
            <View style={loadStyles.skeletonContent}>
              <View style={[loadStyles.skeletonLine, { width: '65%', marginBottom: 8 }]} />
              <View style={[loadStyles.skeletonLine, { width: '40%', height: 8 }]} />
            </View>
            <View style={loadStyles.skeletonBadge} />
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
};

const loadStyles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: THEME.bg },
  body: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 48 },
  spinnerWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  spinRing: {
    position: 'absolute', width: 90, height: 90, borderRadius: 45,
    borderWidth: 3, borderColor: THEME.primary,
    borderTopColor: 'transparent', borderRightColor: THEME.primaryLight,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: THEME.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: THEME.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 10, elevation: 8,
  },
  title: { fontSize: 20, fontWeight: '800', color: THEME.text, marginBottom: 6 },
  subtitle: { fontSize: 13, color: THEME.muted, marginBottom: 32 },
  skeletonCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF',
    borderRadius: 14, padding: 14, marginBottom: 10, width: '100%',
    borderWidth: 1, borderColor: THEME.borderLight, elevation: 1,
  },
  skeletonAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: THEME.primaryLight, marginRight: 12 },
  skeletonContent: { flex: 1 },
  skeletonLine: { height: 10, borderRadius: 6, backgroundColor: THEME.borderLight },
  skeletonBadge: { width: 52, height: 22, borderRadius: 6, backgroundColor: THEME.primaryLight },
});

// ─── Main Users Screen ────────────────────────────────────────────────────────
export default function UsersScreen({ navigation }: any) {
  const { apiRequest } = useAuthApi();
  const insets = useSafeAreaInsets();

  const [notifCount, setNotifCount] = useState(() => getBadgeCount());
  useEffect(() => subscribeBadge(setNotifCount), []);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const initialLoadDone = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

 const fetchUsers = async (page: number = 1, shouldAppend: boolean = false) => {
  if (!shouldAppend) setLoading(true);
  else setLoadingMore(true);

  try {
    const params = new URLSearchParams();
    if (searchQuery) params.append('q', searchQuery);
    if (roleFilter) params.append('role', roleFilter);
    params.append('page', page.toString());
    params.append('per_page', '20');   // ✅ match backend param

    const url = `${API_BASE_URL}/users/api/users/?${params.toString()}`;
    const res = await apiRequest(url);
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();

    if (shouldAppend) setUsers(prev => [...prev, ...(data.results || [])]);
    else setUsers(data.results || []);

    setTotalCount(data.count || 0);
    setHasNextPage(data.current_page < data.num_pages);   // ✅ use num_pages
    setCurrentPage(page);
  } catch {
    // load error — non-blocking, no modal needed
  } finally {
    setLoading(false);
    setRefreshing(false);
    setLoadingMore(false);
  }
};

  useEffect(() => {
    if (initialLoadDone.current) {
      fetchUsers(1, false);
    } else {
      initialLoadDone.current = true;
    }
  }, [searchQuery, roleFilter]);

  useFocusEffect(
    useCallback(() => {
      fetchUsers(1, false);
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(1, false);
  };

  const loadMore = () => {
    if (hasNextPage && !loadingMore && !loading && !refreshing) {
      fetchUsers(currentPage + 1, true);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/users/api/users/${deleteTarget.id}/`, { method: 'DELETE' });
      setDeleteTarget(null);
      setDeleteLoading(false);
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== deleteTarget.id));
        setTotalCount(c => c - 1);
        setDeleteFeedback({ visible: true, type: 'success', title: 'Deleted!', message: 'The user has been removed successfully.' });
      } else {
        const data = await res.json().catch(() => ({}));
        setDeleteFeedback({ visible: true, type: 'error', title: 'Failed', message: data.error || 'Could not delete the user. Please try again.' });
      }
    } catch {
      setDeleteTarget(null);
      setDeleteLoading(false);
      setDeleteFeedback({ visible: true, type: 'error', title: 'Error', message: 'Something went wrong. Please try again.' });
    }
  };

  const activeRoleLabel = (() => {
    if (roleFilter === 'admin') return 'Admin';
    if (roleFilter === 'staff') return 'Staff';
    if (roleFilter === 'user') return 'User';
    return 'Role';
  })();

  const totalUsers = totalCount;
  const activeUsers = users.filter(u => u.is_active).length;

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={THEME.primary} />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  };

  if (loading && !refreshing && users.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.bg }}>
        <StatusBar barStyle="dark-content" backgroundColor={THEME.bg} />
        <SafeAreaView style={{ flex: 1 }} edges={['top']}>
          <LoadingScreen />
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.primary }}>
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <UserDeleteConfirmModal
        visible={!!deleteTarget}
        username={deleteTarget?.username || ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
        loading={deleteLoading}
      />
      <UserFeedbackModal
        visible={deleteFeedback.visible}
        type={deleteFeedback.type}
        title={deleteFeedback.title}
        message={deleteFeedback.message}
        onClose={() => setDeleteFeedback(f => ({ ...f, visible: false }))}
      />

      <Animated.View style={[styles.screenWrap, { opacity: fadeAnim }]}>

        {/* ── HEADER ── */}
        <View style={styles.headerWrap}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Users</Text>
              <Text style={styles.headerSubtitle}>
                {totalUsers} total • {activeUsers} active
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => { clearBadge(); navigation.navigate('Notifications'); }}
              >
                <MaterialCommunityIcons name="bell-outline" size={18} color="#FFF" />
                {notifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : String(notifCount)}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <AccountMenu navigation={navigation} />
            </View>
          </View>

          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={16} color={THEME.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, email..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={THEME.mutedLight}
              returnKeyType="search"
            />
            {searchQuery !== '' && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close-circle" size={15} color={THEME.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.bodyWrap}>
        {/* ── FILTER STRIP ── */}
        <View style={styles.filterStrip}>
          <TouchableOpacity
            style={[styles.filterPill, roleFilter && styles.filterPillActive]}
            onPress={() => setShowRoleDropdown(true)}
          >
            <MaterialCommunityIcons name="account-group-outline" size={13} color={roleFilter ? '#FFF' : THEME.primary} />
            <Text style={[styles.filterPillText, roleFilter && styles.filterPillTextActive]} numberOfLines={1}>
              {activeRoleLabel}
            </Text>
            <MaterialCommunityIcons name="chevron-down" size={13} color={roleFilter ? '#FFF' : THEME.primary} />
          </TouchableOpacity>

          {roleFilter !== '' && (
            <TouchableOpacity
              style={styles.clearFiltersBtn}
              onPress={() => setRoleFilter('')}
            >
              <MaterialCommunityIcons name="filter-off-outline" size={13} color={THEME.danger} />
              <Text style={styles.clearFiltersText}>Clear</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.resultCount}>{users.length} shown</Text>
        </View>

        {/* ── USER LIST ── */}
        <FlatList
          data={users}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item, index }) => (
            <UserCard
              user={item}
              index={index}
              onEdit={(u: any) => navigation.navigate('EditUser', { user: u })}
              onDelete={(u: any) => setDeleteTarget(u)}
            />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} colors={[THEME.primary]} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="account-off-outline" size={44} color={THEME.muted} />
                </View>
                <Text style={styles.emptyTitle}>No users found</Text>
                <Text style={styles.emptySub}>Try adjusting your search or add a new user</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={() => navigation.navigate('AddUser')}>
                  <MaterialCommunityIcons name="account-plus-outline" size={16} color="#FFF" />
                  <Text style={styles.emptyAddText}>Add First User</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          scrollEventThrottle={16}
        />

        <TouchableOpacity
          style={[styles.fab, { bottom: 90 + insets.bottom }]}
          onPress={() => navigation.navigate('AddUser')}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={26} color="#FFF" />
        </TouchableOpacity>
        </View>

        {/* ── ROLE DROPDOWN ── */}
        <Modal
          visible={showRoleDropdown}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowRoleDropdown(false)}
        >
          <View style={styles.centerModalRoot}>
            <Pressable style={styles.modalBackdropFull} onPress={() => setShowRoleDropdown(false)} />
            <View style={styles.dropdownCard}>
              <Text style={styles.dropdownHeader}>Filter by Role</Text>
              {[
                { label: 'All roles', value: '' },
                { label: 'Admin', value: 'admin' },
                { label: 'Staff', value: 'staff' },
                { label: 'User', value: 'user' },
              ].map(role => (
                <TouchableOpacity
                  key={role.value}
                  style={[styles.dropdownItem, roleFilter === role.value && styles.dropdownItemActive]}
                  onPress={() => {
                    setRoleFilter(role.value);
                    setShowRoleDropdown(false);
                  }}
                >
                  <Text style={[styles.dropdownText, roleFilter === role.value && styles.dropdownTextActive]}>
                    {role.label}
                  </Text>
                  {roleFilter === role.value && (
                    <MaterialCommunityIcons name="check-circle" size={18} color={THEME.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </Modal>

      </Animated.View>
    </SafeAreaView>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.primary },
  screenWrap: { flex: 1, backgroundColor: THEME.primary },
  bodyWrap: {
    flex: 1,
    backgroundColor: THEME.bg,
    marginTop: -16,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: THEME.muted, fontWeight: '500' },

  // ── Header ──
  headerWrap: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 26,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
    cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  branchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  branchFooterText: {
    fontSize: 11,
    color: THEME.muted,
    fontWeight: '500',
    maxWidth: 120,
  },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 2, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)',
  },
  notifBadge: {
    position: 'absolute', top: 2, right: 2, minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: THEME.primary,
  },
  notifBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '900', lineHeight: 10 },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: THEME.primary,
    alignItems: 'center', justifyContent: 'center',
    elevation: 8,
    shadowColor: THEME.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  // ── Search ──
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 10,
    paddingHorizontal: 12, height: 38, marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: THEME.text, paddingVertical: 0 },

  // ── Filter strip ──
  filterStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
    backgroundColor: THEME.bg,
  },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF', borderRadius: 999,
    paddingHorizontal: 12, height: 32,
    borderWidth: 1, borderColor: THEME.border,
  },
  filterPillActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  filterPillText: { fontSize: 12, fontWeight: '700', color: THEME.primary },
  filterPillTextActive: { color: '#FFF' },
  clearFiltersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: THEME.dangerLight, paddingHorizontal: 10,
    height: 32, borderRadius: 999, marginLeft: 8,
    borderWidth: 1, borderColor: THEME.danger + '30',
  },
  clearFiltersText: { fontSize: 11, color: THEME.danger, fontWeight: '700' },
  resultCount: { fontSize: 11, color: THEME.muted, fontWeight: '600', marginLeft: 'auto' },

  // ── List ──
  listContent: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 22 },

  // ── User Card ──
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatarRing: {
    width: 48, height: 48, borderRadius: 24,
    borderWidth: 2, alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  cardMiddle: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  userName: { fontSize: 15, fontWeight: '700', color: THEME.text },
  techBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: THEME.primaryLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20,
  },
  techBadgeText: { fontSize: 9, fontWeight: '800', color: THEME.primary },
  userEmail: { fontSize: 12, color: THEME.muted, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11, color: THEME.muted },
  dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: THEME.mutedLight, marginHorizontal: 4 },
  cardRight: { alignItems: 'flex-end', flexShrink: 0 },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20,
    marginBottom: 8,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: '700' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: THEME.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  actionBtnDanger: { backgroundColor: THEME.dangerLight },
  roleFooter: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    marginTop: 10,
  },
  roleFooterText: { fontSize: 11, fontWeight: '700' },

  // ── Empty State ──
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyIconCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: THEME.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  emptySub: { fontSize: 13, color: THEME.muted, textAlign: 'center' },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: THEME.primary, paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 30, marginTop: 8, elevation: 4,
    shadowColor: THEME.primary, shadowOpacity: 0.3, shadowRadius: 8,
  },
  emptyAddText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // ── Pagination footer ──
  footerLoader: {
    paddingVertical: 20, alignItems: 'center',
    justifyContent: 'center', flexDirection: 'row', gap: 8,
  },
  footerLoaderText: { fontSize: 13, color: THEME.muted, fontWeight: '500' },

  // ── Modals ──
  centerModalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalBackdropFull: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },

  dropdownCard: {
    backgroundColor: '#FFF', borderRadius: 18,
    width: '100%', maxWidth: 280, paddingVertical: 8,
    elevation: 12, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 16,
  },
  dropdownHeader: {
    fontSize: 11, fontWeight: '800', color: THEME.muted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 18, paddingTop: 12, paddingBottom: 10,
  },
  dropdownItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 13,
    marginHorizontal: 6, borderRadius: 10,
  },
  dropdownItemActive: { backgroundColor: THEME.primaryLight },
  dropdownText: { fontSize: 14, color: THEME.text, fontWeight: '500' },
  dropdownTextActive: { color: THEME.primary, fontWeight: '700' },
});