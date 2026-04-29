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
  Linking,
  ScrollView,
  Alert,
  Pressable,
  PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';
import { useFocusEffect } from '@react-navigation/native';

const { height } = Dimensions.get('window');

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

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const truncatePlace = (place: string) => {
  if (!place) return '';
  return place.split(/[,\-–]/)[0].trim();
};

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

const getQualityStyle = (name: string) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('hot')) return { bg: '#FEE2E2', text: '#991B1B', dot: '#EF4444', icon: 'fire' };
  if (lower.includes('90') || lower.includes('high')) return { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6', icon: 'trending-up' };
  if (lower.includes('medium')) return { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B', icon: 'minus-circle-outline' };
  if (lower.includes('future')) return { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED', icon: 'clock-outline' };
  if (lower.includes('lost')) return { bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF', icon: 'close-circle-outline' };
  return { bg: '#F1F5F9', text: '#334155', dot: '#94A3B8', icon: 'help-circle-outline' };
};

const getStatusStyle = (name: string) => {
  const lower = (name || '').toLowerCase();
  if (lower.includes('new')) return { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' };
  if (lower.includes('contacted')) return { bg: '#F5F3FF', text: '#6D28D9', dot: '#7C3AED' };
  if (lower.includes('follow')) return { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' };
  if (lower.includes('closed') || lower.includes('won')) return { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' };
  if (lower.includes('lost')) return { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' };
  return { bg: '#F1F5F9', text: '#334155', dot: '#94A3B8' };
};

const getInitials = (name: string) => {
  if (!name) return 'L';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const DetailRow = ({ icon, label, value, color }: any) => {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIconWrap, { backgroundColor: (color || THEME.primary) + '18' }]}>
        <MaterialCommunityIcons name={icon} size={16} color={color || THEME.primary} />
      </View>
      <View style={styles.detailTextWrap}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
};

const LeadDetailModal = ({ lead, visible, onClose, onEdit, onDelete, onCall }: any) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }),
        Animated.timing(backdropOp, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: height, duration: 280, useNativeDriver: true }),
        Animated.timing(backdropOp, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5 && g.dy > 0,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) {
          slideAnim.setValue(g.dy);
          const ratio = Math.max(0, 1 - g.dy / 350);
          backdropOp.setValue(ratio);
        }
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 120 || g.vy > 0.6) {
          Animated.parallel([
            Animated.timing(slideAnim, { toValue: height, duration: 250, useNativeDriver: true }),
            Animated.timing(backdropOp, { toValue: 0, duration: 200, useNativeDriver: true }),
          ]).start(onClose);
        } else {
          Animated.parallel([
            Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 60, friction: 12 }),
            Animated.timing(backdropOp, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]).start();
        }
      },
    })
  ).current;

  if (!lead) return null;

  const qualityName = lead.quality_fk?.name || 'Unknown';
  const statusName = lead.status_fk?.name || 'Unknown';
  const qualityStyle = getQualityStyle(qualityName);
  const statusStyle = getStatusStyle(statusName);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.fullModalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.62)', opacity: backdropOp }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.detailSheet, { transform: [{ translateY: slideAnim }] }]}>
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.sheetHandle} />
            <Text style={styles.swipeHint}>Swipe down to dismiss</Text>
          </View>

          <View style={styles.sheetHeader}>
            <View style={[styles.sheetAvatar, { backgroundColor: qualityStyle.bg }]}>
              <Text style={[styles.sheetAvatarText, { color: qualityStyle.text }]}>{getInitials(lead.customer_name)}</Text>
            </View>
            <View style={styles.sheetHeaderInfo}>
              <Text style={styles.sheetName}>{lead.customer_name}</Text>
              <Text style={styles.sheetMobile}>{lead.mobile}</Text>
              <View style={styles.sheetBadgeRow}>
                <View style={[styles.qualityBadgeLarge, { backgroundColor: qualityStyle.bg }]}>
                  <MaterialCommunityIcons name={qualityStyle.icon as any} size={13} color={qualityStyle.text} />
                  <Text style={[styles.qualityBadgeLargeText, { color: qualityStyle.text }]}>{qualityName}</Text>
                </View>
                <View style={[styles.sheetBadge, { backgroundColor: statusStyle.bg }]}>
                  <View style={[styles.statusDotSmall, { backgroundColor: statusStyle.dot }]} />
                  <Text style={[styles.sheetBadgeText, { color: statusStyle.text }]}>{statusName}</Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.sheetClose} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={THEME.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.successLight }]} onPress={() => onCall(lead.mobile)}>
              <MaterialCommunityIcons name="phone" size={20} color={THEME.success} />
              <Text style={[styles.quickBtnText, { color: THEME.success }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.infoLight }]} onPress={() => onEdit(lead)}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={THEME.info} />
              <Text style={[styles.quickBtnText, { color: THEME.info }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.dangerLight }]} onPress={() => onDelete(lead)}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={THEME.danger} />
              <Text style={[styles.quickBtnText, { color: THEME.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
            <Text style={styles.sectionLabel}>LEAD DETAILS</Text>
            <View style={styles.detailCard}>
              <DetailRow icon="phone" label="Mobile" value={lead.mobile} color={THEME.success} />
              <DetailRow icon="map-marker-outline" label="Place" value={lead.place} color={THEME.info} />
              <DetailRow icon="package-variant" label="Product" value={lead.product?.name} color={THEME.primary} />
              <DetailRow icon="source-branch" label="Lead Source" value={lead.lead_source?.name} color={THEME.warning} />
              <DetailRow icon="note-text-outline" label="Notes" value={lead.notes} color={THEME.muted} />
            </View>

            <Text style={styles.sectionLabel}>FOLLOW-UP & ASSIGNMENT</Text>
            <View style={styles.detailCard}>
              <DetailRow
                icon="calendar-clock"
                label="Follow-up Date"
                value={lead.follow_up_date ? formatDateTime(lead.follow_up_date) : 'Not set'}
                color={lead.follow_up_date ? THEME.warning : THEME.muted}
              />
              <DetailRow
                icon="account-outline"
                label="Assigned To"
                value={
                  lead.assigned_to
                    ? `${lead.assigned_to.first_name || ''} ${lead.assigned_to.last_name || ''}`.trim() || lead.assigned_to.username
                    : 'Unassigned'
                }
                color={lead.assigned_to ? THEME.info : THEME.muted}
              />
              <DetailRow
                icon="account-plus-outline"
                label="Created By"
                value={
                  lead.created_by
                    ? `${lead.created_by.first_name || ''} ${lead.created_by.last_name || ''}`.trim() || lead.created_by.username
                    : '-'
                }
                color={THEME.muted}
              />
            </View>

            <Text style={styles.sectionLabel}>TIMELINE</Text>
            <View style={styles.detailCard}>
              <DetailRow icon="clock-plus-outline" label="Created At" value={formatDateTime(lead.created_at)} color={THEME.muted} />
            </View>

            <View style={{ height: 36 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const LeadCard = React.memo(({ lead, index, onPress, onCall }: any) => {
  const qualityName = lead.quality_fk?.name || 'Unknown';
  const statusName = lead.status_fk?.name || 'Unknown';
  const qualityStyle = getQualityStyle(qualityName);
  const statusStyle = getStatusStyle(statusName);

  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, delay: index * 20, duration: 220, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, delay: index * 20, useNativeDriver: true, tension: 80, friction: 11 }),
    ]).start();
  }, [index]);

  const isHot = qualityName.toLowerCase().includes('hot');
  const assignedName = lead.assigned_to ? (lead.assigned_to.first_name || lead.assigned_to.username || null) : null;
  const followUpLabel = lead.follow_up_date ? formatDateTime(lead.follow_up_date) : null;
  const cityLabel = truncatePlace(lead.place);

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: translateAnim }] }}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.leadCard}>
        <View style={styles.cardTop}>
          <View style={[styles.avatarRing, { borderColor: qualityStyle.dot + '55' }]}>
            <View style={[styles.avatar, { backgroundColor: qualityStyle.bg }]}>
              <Text style={[styles.avatarText, { color: qualityStyle.text }]}>{getInitials(lead.customer_name)}</Text>
            </View>
            {isHot && (
              <View style={styles.hotBadge}>
                <MaterialCommunityIcons name="fire" size={9} color="#FFF" />
              </View>
            )}
          </View>

          <View style={styles.cardMiddle}>
            <Text style={styles.nameText} numberOfLines={1}>{lead.customer_name}</Text>
            <View style={styles.metaRow}>
              <MaterialCommunityIcons name="phone-outline" size={12} color={THEME.muted} />
              <Text style={styles.metaText} numberOfLines={1}>{lead.mobile || '—'}</Text>
              {cityLabel ? (
                <>
                  <View style={styles.dotSep} />
                  <MaterialCommunityIcons name="map-marker-outline" size={12} color={THEME.muted} />
                  <Text style={[styles.metaText, { flexShrink: 1 }]} numberOfLines={1}>{cityLabel}</Text>
                </>
              ) : null}
            </View>

            <View style={styles.chipRow}>
              <View style={[styles.qualityChip, { backgroundColor: qualityStyle.bg }]}>
                <MaterialCommunityIcons name={qualityStyle.icon as any} size={12} color={qualityStyle.text} />
                <Text style={[styles.qualityChipText, { color: qualityStyle.text }]} numberOfLines={1}>{qualityName}</Text>
              </View>
              <View style={[styles.chip, { backgroundColor: statusStyle.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
                <Text style={[styles.chipText, { color: statusStyle.text }]} numberOfLines={1}>{statusName}</Text>
              </View>
              {lead.product?.name ? (
                <View style={[styles.chip, { backgroundColor: THEME.borderLight }]}>
                  <MaterialCommunityIcons name="package-variant-closed" size={10} color={THEME.textSecondary} />
                  <Text style={[styles.chipText, { color: THEME.textSecondary }]} numberOfLines={1}>{lead.product.name}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons
              name={assignedName ? 'account-check-outline' : 'account-alert-outline'}
              size={12}
              color={assignedName ? THEME.info : THEME.mutedLight}
            />
            <Text
              style={[
                styles.footerText,
                { color: assignedName ? THEME.info : THEME.mutedLight },
                !assignedName && styles.footerTextMuted,
              ]}
              numberOfLines={1}
            >
              {assignedName || 'Unassigned'}
            </Text>
          </View>

          <View style={styles.footerDivider} />

          <View style={styles.footerItem}>
            <MaterialCommunityIcons
              name={followUpLabel ? 'calendar-clock' : 'calendar-remove-outline'}
              size={12}
              color={followUpLabel ? THEME.warning : THEME.mutedLight}
            />
            <Text
              style={[
                styles.footerText,
                { color: followUpLabel ? THEME.warning : THEME.mutedLight },
                !followUpLabel && styles.footerTextMuted,
              ]}
              numberOfLines={1}
            >
              {followUpLabel || 'No follow-up'}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.85}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.arrowBtn}
          >
            <MaterialCommunityIcons name="chevron-right" size={18} color={THEME.mutedLight} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function LeadsScreen({ navigation }: any) {
  const { apiRequest } = useAuthApi();

  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [qualityFilter, setQualityFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [showQualityDropdown, setShowQualityDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [qualityOptions, setQualityOptions] = useState<any[]>([]);
  const [statusOptions, setStatusOptions] = useState<any[]>([]);
  const [loadingQualityOptions, setLoadingQualityOptions] = useState(false);
  const [loadingStatusOptions, setLoadingStatusOptions] = useState(false);

  const [tempQualitySelection, setTempQualitySelection] = useState<string[]>([]);
  const [tempStatusSelection, setTempStatusSelection] = useState<string[]>([]);

  // ─── FIX: fadeAnim starts at 1 so the screen is never invisible ───
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // ─── FIX: single isFetching guard prevents ALL concurrent calls ───
  const isFetching = useRef(false);

  // ─── FIX: track whether the initial mount fetch has been fired ───
  const mountFetchDone = useRef(false);

  // ─── FIX: stable ref for the "needs refresh on focus" flag ───
  const needsRefreshOnFocus = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  // ─── Fetch filter options once on mount ───────────────────────────
  useEffect(() => {
    const fetchFilterOptions = async () => {
      setLoadingQualityOptions(true);
      setLoadingStatusOptions(true);

      try {
        const qRes = await apiRequest(`${API_BASE_URL}/lead/quality/manage/`);
        if (qRes.ok) {
          const qData = await qRes.json();
          setQualityOptions(qData.data || []);
        }
      } catch (err) {
        console.warn('Quality options fetch failed');
      } finally {
        setLoadingQualityOptions(false);
      }

      try {
        const sRes = await apiRequest(`${API_BASE_URL}/lead/api/config/status/`);
        if (sRes.ok) {
          const sData = await sRes.json();
          setStatusOptions(sData.items || []);
        }
      } catch (err) {
        console.warn('Status options fetch failed');
      } finally {
        setLoadingStatusOptions(false);
      }
    };

    fetchFilterOptions();
    // apiRequest is stable (from a hook), so this truly runs once
  }, []);

  // ─── Core fetch function ──────────────────────────────────────────
  // NOTE: searchQuery / qualityFilter / statusFilter are NOT in the
  // dependency array here.  We pass them as arguments instead so that
  // useFocusEffect can call fetchLeads with a stable reference while
  // the filter-driven useEffect below passes fresh values.
  const fetchLeads = useCallback(
    async (
      page: number,
      shouldAppend: boolean,
      search: string,
      quality: string[],
      status: string[],
    ) => {
      if (isFetching.current) return;
      isFetching.current = true;

      if (!shouldAppend) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      try {
        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (quality.length > 0) params.append('quality', quality.join(','));
        if (status.length > 0) params.append('status', status.join(','));
        params.append('page', page.toString());
        params.append('page_size', '20');

        const url = `${API_BASE_URL}/lead/api/leads/?${params.toString()}`;
        const res = await apiRequest(url);
        if (!res.ok) throw new Error('Failed to fetch leads');
        const data = await res.json();

        if (shouldAppend) {
          setLeads(prev => [...prev, ...(data.results || [])]);
        } else {
          setLeads(data.results || []);
        }

        setTotalCount(data.count || 0);
        setHasNextPage(!!data.next);
        setCurrentPage(page);
      } catch (err: any) {
        if (err.message !== 'SESSION_EXPIRED') {
          showToast('Could not load leads', 'error');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        isFetching.current = false;
      }
    },
    [apiRequest, showToast],
    // ↑ Only truly stable values — no filter state here
  );

  // ─── FIX: filter / search changes drive fetches ───────────────────
  useEffect(() => {
    fetchLeads(1, false, searchQuery, qualityFilter, statusFilter);
  }, [searchQuery, qualityFilter, statusFilter]);

  // ─── FIX: useFocusEffect only refreshes when returning to screen ──
  useFocusEffect(
    useCallback(() => {
      if (!mountFetchDone.current) {
        mountFetchDone.current = true;
        return;
      }
      fetchLeads(1, false, searchQuery, qualityFilter, statusFilter);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLeads(1, false, searchQuery, qualityFilter, statusFilter);
  }, [fetchLeads, searchQuery, qualityFilter, statusFilter]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !loadingMore && !loading && !refreshing) {
      fetchLeads(currentPage + 1, true, searchQuery, qualityFilter, statusFilter);
    }
  }, [hasNextPage, loadingMore, loading, refreshing, currentPage, fetchLeads, searchQuery, qualityFilter, statusFilter]);

  const handleCall = async (phone: string) => {
    if (!phone) return;
    const url = `tel:${phone}`;
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) await Linking.openURL(url);
      else showToast('Cannot make calls on this device', 'error');
    } catch {
      showToast('Unable to make call', 'error');
    }
  };

  const openDetail = (lead: any) => {
    setSelectedLead(lead);
    setShowDetailModal(true);
  };

  const handleEdit = (lead: any) => {
    setShowDetailModal(false);
    navigation.navigate('AddEditLead', {
      lead: lead,
      onSuccess: () => fetchLeads(1, false, searchQuery, qualityFilter, statusFilter),
    });
  };

  const handleDelete = (lead: any) => {
    Alert.alert(
      'Delete Lead',
      `Are you sure you want to delete "${lead.customer_name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setShowDetailModal(false);
            try {
              const res = await apiRequest(`${API_BASE_URL}/lead/api/leads/${lead.id}/`, { method: 'DELETE' });
              if (res.ok) {
                setLeads(prev => prev.filter(l => l.id !== lead.id));
                setTotalCount(c => c - 1);
                showToast('Lead deleted successfully', 'success');
              } else {
                showToast('Failed to delete lead', 'error');
              }
            } catch {
              showToast('Failed to delete lead', 'error');
            }
          },
        },
      ]
    );
  };

  const navigateToAddLead = () => {
    navigation.navigate('AddEditLead', {
      onSuccess: () => fetchLeads(1, false, searchQuery, qualityFilter, statusFilter),
    });
  };

  const hotLeads = leads.filter(l => l.quality_fk?.name?.toLowerCase().includes('hot')).length;
  const assignedLeads = leads.filter(l => l.assigned_to).length;
  const getFilterCount = () => qualityFilter.length + statusFilter.length;

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={THEME.primary} />
        <Text style={styles.footerLoaderText}>Loading more...</Text>
      </View>
    );
  };

  const openQualityModal = () => {
    setTempQualitySelection([...qualityFilter]);
    setShowQualityDropdown(true);
  };

  const openStatusModal = () => {
    setTempStatusSelection([...statusFilter]);
    setShowStatusDropdown(true);
  };

  const applyQualityFilters = () => {
    setQualityFilter(tempQualitySelection);
    setShowQualityDropdown(false);
  };

  const applyStatusFilters = () => {
    setStatusFilter(tempStatusSelection);
    setShowStatusDropdown(false);
  };

  const clearAllFilters = () => {
    setQualityFilter([]);
    setStatusFilter([]);
  };

  const toggleQualityOption = (id: string) => {
    setTempQualitySelection(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleStatusOption = (id: string) => {
    setTempStatusSelection(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  if (loading && !refreshing && leads.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <View style={styles.centerLoader}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loaderText}>Loading leads…</Text>
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
        <View style={styles.headerWrap}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Leads</Text>
              <Text style={styles.headerSubtitle}>
                {totalCount} total • {hotLeads} hot • {assignedLeads} assigned
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
                <MaterialCommunityIcons name="refresh" size={18} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.addButton} onPress={navigateToAddLead}>
                <MaterialCommunityIcons name="plus" size={18} color={THEME.primary} />
                <Text style={styles.addButtonText}>New</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={16} color={THEME.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, mobile, place..."
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

        <View style={styles.filterStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterPill, qualityFilter.length > 0 && styles.filterPillActive]}
              onPress={openQualityModal}
            >
              <MaterialCommunityIcons name="star-four-points-outline" size={13} color={qualityFilter.length > 0 ? '#FFF' : THEME.primary} />
              <Text style={[styles.filterPillText, qualityFilter.length > 0 && styles.filterPillTextActive]}>
                Quality {qualityFilter.length > 0 ? `(${qualityFilter.length})` : ''}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={13} color={qualityFilter.length > 0 ? '#FFF' : THEME.primary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterPill, statusFilter.length > 0 && styles.filterPillActive]}
              onPress={openStatusModal}
            >
              <MaterialCommunityIcons name="progress-check" size={13} color={statusFilter.length > 0 ? '#FFF' : THEME.primary} />
              <Text style={[styles.filterPillText, statusFilter.length > 0 && styles.filterPillTextActive]}>
                Status {statusFilter.length > 0 ? `(${statusFilter.length})` : ''}
              </Text>
              <MaterialCommunityIcons name="chevron-down" size={13} color={statusFilter.length > 0 ? '#FFF' : THEME.primary} />
            </TouchableOpacity>

            {getFilterCount() > 0 && (
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearAllFilters}>
                <MaterialCommunityIcons name="filter-off-outline" size={13} color={THEME.danger} />
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
          <Text style={styles.resultCount}>{leads.length} shown</Text>
        </View>

        <FlatList
          data={leads}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item, index }) => (
            <LeadCard lead={item} index={index} onPress={() => openDetail(item)} onCall={handleCall} />
          )}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={THEME.primary}
              colors={[THEME.primary]}
            />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <View style={styles.emptyIconCircle}>
                  <MaterialCommunityIcons name="account-search-outline" size={44} color={THEME.muted} />
                </View>
                <Text style={styles.emptyTitle}>No leads found</Text>
                <Text style={styles.emptySub}>Try different filters or add a new lead</Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={navigateToAddLead}>
                  <MaterialCommunityIcons name="account-plus-outline" size={16} color="#FFF" />
                  <Text style={styles.emptyAddText}>Add First Lead</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          scrollEventThrottle={16}
        />

        <LeadDetailModal
          lead={selectedLead}
          visible={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onCall={handleCall}
        />

        <Modal
          visible={showQualityDropdown}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowQualityDropdown(false)}
        >
          <View style={styles.centerModalRoot}>
            <Pressable style={styles.modalBackdropFull} onPress={() => setShowQualityDropdown(false)} />
            <View style={styles.multiSelectCard}>
              <View style={styles.multiSelectHeader}>
                <Text style={styles.multiSelectTitle}>Filter by Quality</Text>
                <TouchableOpacity onPress={() => setShowQualityDropdown(false)}>
                  <MaterialCommunityIcons name="close" size={20} color={THEME.muted} />
                </TouchableOpacity>
              </View>
              {loadingQualityOptions ? (
                <View style={styles.dropdownLoading}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                  <Text style={styles.dropdownLoadingText}>Loading...</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: height * 0.5 }}>
                  {qualityOptions.length === 0 ? (
                    <Text style={styles.dropdownEmpty}>No quality options available</Text>
                  ) : (
                    qualityOptions.map(option => (
                      <TouchableOpacity
                        key={String(option.id)}
                        style={styles.checkboxItem}
                        onPress={() => toggleQualityOption(String(option.id))}
                      >
                        <View style={[styles.checkbox, tempQualitySelection.includes(String(option.id)) && styles.checkboxChecked]}>
                          {tempQualitySelection.includes(String(option.id)) && (
                            <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>{option.name}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              )}
              <View style={styles.multiSelectFooter}>
                <TouchableOpacity style={styles.clearSelectionBtn} onPress={() => setTempQualitySelection([])}>
                  <Text style={styles.clearSelectionText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={applyQualityFilters}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showStatusDropdown}
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={() => setShowStatusDropdown(false)}
        >
          <View style={styles.centerModalRoot}>
            <Pressable style={styles.modalBackdropFull} onPress={() => setShowStatusDropdown(false)} />
            <View style={styles.multiSelectCard}>
              <View style={styles.multiSelectHeader}>
                <Text style={styles.multiSelectTitle}>Filter by Status</Text>
                <TouchableOpacity onPress={() => setShowStatusDropdown(false)}>
                  <MaterialCommunityIcons name="close" size={20} color={THEME.muted} />
                </TouchableOpacity>
              </View>
              {loadingStatusOptions ? (
                <View style={styles.dropdownLoading}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                  <Text style={styles.dropdownLoadingText}>Loading...</Text>
                </View>
              ) : (
                <ScrollView style={{ maxHeight: height * 0.5 }}>
                  {statusOptions.length === 0 ? (
                    <Text style={styles.dropdownEmpty}>No status options available</Text>
                  ) : (
                    statusOptions.map(option => (
                      <TouchableOpacity
                        key={String(option.id)}
                        style={styles.checkboxItem}
                        onPress={() => toggleStatusOption(String(option.id))}
                      >
                        <View style={[styles.checkbox, tempStatusSelection.includes(String(option.id)) && styles.checkboxChecked]}>
                          {tempStatusSelection.includes(String(option.id)) && (
                            <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                          )}
                        </View>
                        <Text style={styles.checkboxLabel}>{option.name}</Text>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              )}
              <View style={styles.multiSelectFooter}>
                <TouchableOpacity style={styles.clearSelectionBtn} onPress={() => setTempStatusSelection([])}>
                  <Text style={styles.clearSelectionText}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.applyBtn} onPress={applyStatusFilters}>
                  <Text style={styles.applyBtnText}>Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.bg },
  screenWrap: { flex: 1 },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: THEME.muted, fontWeight: '500' },
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
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 10,
    paddingHorizontal: 12, height: 38, marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: THEME.text, paddingVertical: 0 },
  filterStrip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6,
    backgroundColor: THEME.bg,
  },
  filterRow: { gap: 8, paddingRight: 10 },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF', borderRadius: 999,
    paddingHorizontal: 12, height: 32,
    borderWidth: 1, borderColor: THEME.border,
  },
  filterPillActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  filterPillText: { fontSize: 12, fontWeight: '700', color: THEME.primary, maxWidth: 120 },
  filterPillTextActive: { color: '#FFF' },
  clearFiltersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: THEME.dangerLight, paddingHorizontal: 10,
    height: 32, borderRadius: 999,
    borderWidth: 1, borderColor: THEME.danger + '30',
  },
  clearFiltersText: { fontSize: 11, color: THEME.danger, fontWeight: '700' },
  resultCount: { fontSize: 11, color: THEME.muted, fontWeight: '600', marginLeft: 'auto' },
  listContent: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 22 },
  leadCard: {
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
    position: 'relative', flexShrink: 0,
  },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800' },
  hotBadge: {
    position: 'absolute', bottom: -2, right: -2,
    backgroundColor: '#EF4444', borderRadius: 8,
    width: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#FFF',
  },
  cardMiddle: { flex: 1, minWidth: 0 },
  nameText: { fontSize: 15, fontWeight: '700', color: THEME.text, letterSpacing: -0.2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  metaText: { fontSize: 11, color: THEME.muted, fontWeight: '500', flexShrink: 1 },
  dotSep: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: THEME.mutedLight, flexShrink: 0 },
  chipRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 5, marginTop: 8, alignItems: 'center' },
  qualityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 9, paddingVertical: 5,
    borderRadius: 8,
  },
  qualityChipText: { fontSize: 12, fontWeight: '800' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 6, maxWidth: 110,
  },
  chipText: { fontSize: 10, fontWeight: '700' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5, flexShrink: 0 },
  callSimpleBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: THEME.primarySoft,
    borderWidth: 1,
    borderColor: THEME.primary + '25',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
    gap: 6,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 1,
    flex: 1,
  },
  footerText: { fontSize: 11, fontWeight: '600', flexShrink: 1 },
  footerTextMuted: { fontStyle: 'italic', fontWeight: '500' },
  footerDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: THEME.border,
    flexShrink: 0,
  },
  arrowBtn: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10, width: '100%' },
  emptyIconCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: THEME.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: THEME.text },
  emptySub: { fontSize: 13, color: THEME.muted, textAlign: 'center' },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: THEME.primary,
    paddingHorizontal: 22, paddingVertical: 12,
    borderRadius: 30, marginTop: 8,
    elevation: 4, shadowColor: THEME.primary,
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  emptyAddText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  footerLoaderText: { fontSize: 13, color: THEME.muted, fontWeight: '500' },
  toastContainer: {
    position: 'absolute', top: 16, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, elevation: 8, zIndex: 9999,
  },
  toastText: { color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 },
  fullModalRoot: { flex: 1, justifyContent: 'flex-end' },
  centerModalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalBackdropFull: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.62)' },
  detailSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: height * 0.88,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 20,
  },
  handleArea: { alignItems: 'center', paddingTop: 12, paddingBottom: 4 },
  sheetHandle: { width: 40, height: 4, backgroundColor: THEME.border, borderRadius: 2 },
  swipeHint: { fontSize: 11, color: THEME.mutedLight, fontWeight: '500', marginTop: 5 },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: THEME.border, gap: 14,
  },
  sheetAvatar: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  sheetAvatarText: { fontSize: 22, fontWeight: '800' },
  sheetHeaderInfo: { flex: 1 },
  sheetName: { fontSize: 18, fontWeight: '800', color: THEME.text, marginBottom: 2 },
  sheetMobile: { fontSize: 13, color: THEME.muted, marginBottom: 8 },
  sheetBadgeRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  qualityBadgeLarge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20,
  },
  qualityBadgeLargeText: { fontSize: 13, fontWeight: '800' },
  sheetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  sheetBadgeText: { fontSize: 11, fontWeight: '800' },
  statusDotSmall: { width: 7, height: 7, borderRadius: 3.5 },
  sheetClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: THEME.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: THEME.border,
  },
  quickBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12, borderRadius: 14 },
  quickBtnText: { fontSize: 12, fontWeight: '700' },
  sheetScroll: { paddingHorizontal: 20 },
  sectionLabel: {
    fontSize: 10, fontWeight: '800', color: THEME.muted,
    letterSpacing: 1, marginTop: 20, marginBottom: 8,
  },
  detailCard: { backgroundColor: THEME.bg, borderRadius: 16, overflow: 'hidden' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  detailIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  detailTextWrap: { flex: 1 },
  detailLabel: { fontSize: 11, color: THEME.muted, fontWeight: '600', marginBottom: 2 },
  detailValue: { fontSize: 14, color: THEME.text, fontWeight: '600' },
  dropdownLoading: { paddingVertical: 20, alignItems: 'center', justifyContent: 'center' },
  dropdownLoadingText: { fontSize: 13, color: THEME.muted, marginTop: 8 },
  dropdownEmpty: { paddingVertical: 16, textAlign: 'center', fontSize: 13, color: THEME.muted },
  multiSelectCard: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    width: '100%',
    maxWidth: 340,
    maxHeight: height * 0.7,
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  multiSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: THEME.borderLight,
  },
  multiSelectTitle: { fontSize: 16, fontWeight: '700', color: THEME.text },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: THEME.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  checkboxLabel: { fontSize: 14, color: THEME.text, fontWeight: '500' },
  multiSelectFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
  },
  clearSelectionBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  clearSelectionText: { fontSize: 14, color: THEME.muted, fontWeight: '600' },
  applyBtn: { backgroundColor: THEME.primary, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 10 },
  applyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});