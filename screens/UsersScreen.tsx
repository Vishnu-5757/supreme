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
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';
import { useFocusEffect } from '@react-navigation/native';

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

// ─── Toast ─────────────────────────────────────────────────────────────────────
const Toast = ({ message, type, visible, onHide }: any) => {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 7 }),
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, { toValue: -100, duration: 300, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(onHide);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [visible]);

  if (!visible) return null;
  const bgColor = type === 'success' ? THEME.success : type === 'error' ? THEME.danger : THEME.info;
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'information';

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY }], opacity, backgroundColor: bgColor }]}>
      <MaterialCommunityIcons name={icon} size={20} color="#FFF" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

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

// ─── Main Users Screen ────────────────────────────────────────────────────────
export default function UsersScreen({ navigation }: any) {
  const { apiRequest } = useAuthApi();

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const initialLoadDone = useRef(false);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') =>
    setToast({ visible: true, message, type });

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
    showToast('Could not load users', 'error');
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

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/users/api/users/${selectedUser.id}/`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        showToast(data.error || 'Deletion failed', 'error');
        return;
      }
      showToast('User deleted', 'success');
      setDeleteModalVisible(false);
      fetchUsers(1, false);
    } catch {
      showToast('Network error', 'error');
    } finally {
      setSubmitting(false);
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
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loaderText}>Loading users…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
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
              <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
                <MaterialCommunityIcons name="refresh" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate('AddUser')}>
                <MaterialCommunityIcons name="plus" size={18} color={THEME.primary} />
                <Text style={styles.addButtonText}>New</Text>
              </TouchableOpacity>
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
              onDelete={(u: any) => { setSelectedUser(u); setDeleteModalVisible(true); }}
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

        {/* ── DELETE MODAL ── */}
        <Modal
          visible={deleteModalVisible}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setDeleteModalVisible(false)}
        >
          <View style={styles.centerModalRoot}>
            <Pressable style={styles.modalBackdropFull} onPress={() => setDeleteModalVisible(false)} />
            <View style={styles.deleteModal}>
              <View style={styles.deleteIconWrap}>
                <MaterialCommunityIcons name="delete-alert-outline" size={44} color={THEME.danger} />
              </View>
              <Text style={styles.deleteTitle}>Delete User?</Text>
              <Text style={styles.deleteMsg}>
                Are you sure you want to delete{' '}
                <Text style={{ fontWeight: '700', color: THEME.text }}>"{selectedUser?.username}"</Text>?
                {'\n'}This action cannot be undone.
              </Text>
              <View style={styles.deleteBtns}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleDeleteUser} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="delete" size={16} color="#FFF" />
                      <Text style={styles.confirmText}>Delete</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

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
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  screenWrap: { flex: 1 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: THEME.muted, fontWeight: '500' },

  // ── Header ──
  headerWrap: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
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
  },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', paddingHorizontal: 12,
    height: 34, borderRadius: 17,
  },
  addButtonText: { color: THEME.primary, fontSize: 13, fontWeight: '700' },

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

  // ── Toast ──
  toastContainer: {
    position: 'absolute', top: 16, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, elevation: 8, zIndex: 9999,
  },
  toastText: { color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 },

  // ── Modals ──
  centerModalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalBackdropFull: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  deleteModal: {
    width: '100%', maxWidth: 360, backgroundColor: '#FFF',
    borderRadius: 24, padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, elevation: 20,
  },
  deleteIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: THEME.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  deleteTitle: { fontSize: 20, fontWeight: '800', color: THEME.text, marginBottom: 8 },
  deleteMsg: { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  deleteBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  cancelBtn: {
    flex: 1, paddingVertical: 13, borderRadius: 14,
    borderWidth: 1.5, borderColor: THEME.border,
    alignItems: 'center', backgroundColor: '#FAFBFC',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: THEME.textSecondary },
  confirmBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    backgroundColor: THEME.danger, paddingVertical: 13, borderRadius: 14,
    elevation: 3, shadowColor: THEME.danger, shadowOpacity: 0.3, shadowRadius: 8,
  },
  confirmText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

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