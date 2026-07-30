// ServiceScreen.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar,
  RefreshControl, TextInput, Modal, ActivityIndicator,
  FlatList, Animated, Dimensions, Linking, ScrollView,
  Alert, Pressable, PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  textSub: '#475569',
  muted: '#64748B',
  mutedLight: '#94A3B8',
  border: '#E2E8F0',
  borderLt: '#F1F5F9',
  borderLight: '#F1F5F9',
  success: '#16A34A',
  successLt: '#ECFDF5',
  warning: '#D97706',
  warningLt: '#FFFBEB',
  danger: '#DC2626',
  dangerLt: '#FEF2F2',
  info: '#2563EB',
  infoLt: '#EFF6FF',
};

// ── Helpers ──────────────────────────────────────────────────────
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
};

const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'new': return { bg: '#EFF6FF', text: '#1D4ED8', dot: '#3B82F6' };
    case 'accepted': return { bg: '#F5F3FF', text: '#6D28D9', dot: '#7C3AED' };
    case 'in_progress': return { bg: '#FFF7ED', text: '#C2410C', dot: '#F97316' };
    case 'completed': return { bg: '#ECFDF5', text: '#065F46', dot: '#10B981' };
    case 'cancelled': return { bg: '#FEF2F2', text: '#991B1B', dot: '#EF4444' };
    default: return { bg: '#F1F5F9', text: '#334155', dot: '#94A3B8' };
  }
};

const getLevelStyle = (level: string) => {
  switch (level) {
    case 'low': return { bg: '#ECFDF5', text: '#065F46', icon: 'arrow-down' };
    case 'medium': return { bg: '#FFF7ED', text: '#C2410C', icon: 'minus' };
    case 'high': return { bg: '#FEF3C7', text: '#92400E', icon: 'arrow-up' };
    case 'urgent': return { bg: '#FEE2E2', text: '#991B1B', icon: 'alert' };
    default: return { bg: '#F1F5F9', text: '#334155', icon: 'help-circle-outline' };
  }
};

const getInitials = (name: string) => {
  if (!name) return 'S';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

// ── Toast ─────────────────────────────────────────────────────────
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

// ── Feedback Modal (centered, same style as AddEditServiceScreen) ─
const SS_FM_CFG = {
  success: { bg: '#059669', tint: '#ECFDF5', icon: 'check-bold',  btn: 'Done'   },
  error:   { bg: '#DC2626', tint: '#FEF2F2', icon: 'close-thick', btn: 'Got it' },
  info:    { bg: '#2563EB', tint: '#EFF6FF', icon: 'information', btn: 'OK'     },
} as const;

const ServiceFeedbackModal = ({ visible, type, title, message, onClose, autoDismiss = false }: {
  visible: boolean; type: 'success' | 'error' | 'info';
  title: string; message: string; onClose: () => void; autoDismiss?: boolean;
}) => {
  const cfg  = SS_FM_CFG[type];
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, tension: 70, friction: 11, useNativeDriver: true }).start();
      if (autoDismiss) {
        const delay = type === 'success' ? 1000 : 2000;
        const t = setTimeout(onClose, delay);
        return () => clearTimeout(t);
      }
    } else {
      anim.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const cardScale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const cardOpacity = anim.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' });
  const iconScale   = anim.interpolate({ inputRange: [0, 0.6, 0.82, 1], outputRange: [0, 1.15, 0.95, 1] });
  const ctOpacity   = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const ctY         = anim.interpolate({ inputRange: [0.4, 1], outputRange: [10, 0], extrapolate: 'clamp' });

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={sfmStyles.overlay}>
        <Animated.View style={[sfmStyles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <View style={sfmStyles.iconZone}>
            <Animated.View style={[sfmStyles.iconBg, { backgroundColor: cfg.tint, transform: [{ scale: iconScale }] }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={34} color={cfg.bg} />
            </Animated.View>
          </View>
          <Animated.View style={[sfmStyles.textZone, { opacity: ctOpacity, transform: [{ translateY: ctY as any }] }]}>
            <Text style={sfmStyles.title}>{title}</Text>
            <Text style={sfmStyles.message}>{message}</Text>
          </Animated.View>
          <View style={sfmStyles.sep} />
          {autoDismiss && type === 'success' ? (
            <View style={sfmStyles.spinRow}>
              <ActivityIndicator size="small" color={cfg.bg} />
              <Text style={[sfmStyles.spinText, { color: cfg.bg }]}>Please wait…</Text>
            </View>
          ) : !autoDismiss ? (
            <TouchableOpacity style={sfmStyles.btn} onPress={onClose} activeOpacity={0.7}>
              <Text style={[sfmStyles.btnText, { color: cfg.bg }]}>{cfg.btn}</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const sfmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.52)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card: { width: '100%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 18 },
  iconZone: { paddingTop: 34, alignItems: 'center' },
  iconBg: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  textZone: { paddingHorizontal: 28, paddingTop: 18, paddingBottom: 26, alignItems: 'center' },
  title: { fontSize: 19, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 8, letterSpacing: 0.1 },
  message: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },
  sep: { height: 1, backgroundColor: '#F1F5F9' },
  btn: { paddingVertical: 17, alignItems: 'center', backgroundColor: '#fff' },
  btnText: { fontSize: 16, fontWeight: '700', letterSpacing: 0.1 },
  spinRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 18 },
  spinText: { fontSize: 14, fontWeight: '600' },
});

// ── Custom Delete Confirmation Modal ────────────────────────────
const DeleteConfirmModal = ({
  visible,
  itemName,
  onCancel,
  onConfirm,
  loading,
}: {
  visible: boolean;
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="fade"
    statusBarTranslucent
    onRequestClose={onCancel}
  >
    <View style={styles.delRoot}>
      <View style={styles.delBox}>
        <View style={styles.delIconWrap}>
          <MaterialCommunityIcons name="trash-can-outline" size={28} color={THEME.danger} />
        </View>
        <Text style={styles.delTitle}>Delete Service?</Text>
        <Text style={styles.delSub}>
          <Text style={{ fontWeight: '700', color: THEME.text }}>"{itemName}"</Text>{' '}
          will be permanently removed.
        </Text>
        <View style={styles.delBtns}>
          <TouchableOpacity style={styles.delCancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={styles.delCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.delConfirmBtn, loading && { opacity: 0.6 }]}
            onPress={onConfirm}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.delConfirmText}>Yes, Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ── Detail Row component ─────────────────────────────────────────
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

// ── Service Detail Modal ─────────────────────────────────────────
const ServiceDetailModal = ({ service, visible, onClose, onEdit, onDelete, onCall }: any) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

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

  if (!service) return null;

  const statusStyle = getStatusStyle(service.status);
  const levelStyle = getLevelStyle(service.service_level);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.fullModalRoot}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.62)', opacity: backdropOp }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View style={[styles.detailSheet, { transform: [{ translateY: slideAnim }], paddingBottom: insets.bottom }]}>
          <View {...panResponder.panHandlers} style={styles.handleArea}>
            <View style={styles.sheetHandle} />
            <Text style={styles.swipeHint}>Swipe down to dismiss</Text>
          </View>

          <View style={styles.sheetHeader}>
            <View style={[styles.sheetAvatar, { backgroundColor: statusStyle.bg }]}>
              <Text style={[styles.sheetAvatarText, { color: statusStyle.text }]}>{getInitials(service.customer_name)}</Text>
            </View>
            <View style={styles.sheetHeaderInfo}>
              <Text style={styles.sheetName}>{service.customer_name}</Text>
              <Text style={styles.sheetMobile}>{service.mobile}</Text>
              <View style={styles.sheetBadgeRow}>
                <View style={[styles.qualityBadgeLarge, { backgroundColor: statusStyle.bg }]}>
                  <MaterialCommunityIcons name="circle" size={13} color={statusStyle.text} />
                  <Text style={[styles.qualityBadgeLargeText, { color: statusStyle.text }]}>{service.status_display || service.status}</Text>
                </View>
                <View style={[styles.sheetBadge, { backgroundColor: levelStyle.bg }]}>
                  <MaterialCommunityIcons name={levelStyle.icon} size={13} color={levelStyle.text} />
                  <Text style={[styles.sheetBadgeText, { color: levelStyle.text }]}>
                    {service.service_level_display || service.service_level}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.sheetClose} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={THEME.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickActions}>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.successLt }]} onPress={() => onCall(service.mobile)}>
              <MaterialCommunityIcons name="phone" size={20} color={THEME.success} />
              <Text style={[styles.quickBtnText, { color: THEME.success }]}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.infoLt }]} onPress={() => onEdit(service)}>
              <MaterialCommunityIcons name="pencil-outline" size={20} color={THEME.info} />
              <Text style={[styles.quickBtnText, { color: THEME.info }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.dangerLt }]} onPress={() => onDelete(service)}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color={THEME.danger} />
              <Text style={[styles.quickBtnText, { color: THEME.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
            <Text style={styles.sectionLabel}>SERVICE DETAILS</Text>
            <View style={styles.detailCard}>
              <DetailRow icon="note-text-outline" label="Complaints" value={service.complaints} />
              <DetailRow icon="currency-inr" label="Service Charge" value={formatCurrency(service.service_charge)} />
              <DetailRow icon="map-marker-outline" label="Address" value={service.address} />
              <DetailRow icon="identifier" label="Invoice" value={service.invoice_number} />
              {service.assigned_technician ? (
                <DetailRow
                  icon="account-hard-hat"
                  label="Assigned To"
                  value={`${service.assigned_technician.first_name || ''} ${service.assigned_technician.last_name || ''}`.trim() || service.assigned_technician.username}
                />
              ) : null}
            </View>

            <Text style={styles.sectionLabel}>ADDITIONAL INFORMATION</Text>
            <View style={styles.detailCard}>
              <DetailRow icon="calendar-month" label="Created" value={formatDate(service.created_at)} />
              {service.created_by ? (
                <DetailRow
                  icon="account-outline"
                  label="Created By"
                  value={`${service.created_by.first_name || ''} ${service.created_by.last_name || ''}`.trim() || service.created_by.username}
                />
              ) : null}
            </View>

            <View style={{ height: 36 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ── Service Card ─────────────────────────────────────────────────
const ServiceCard = React.memo(({ service, index, onPress }: any) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, delay: index * 20, duration: 220, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, delay: index * 20, useNativeDriver: true, tension: 80, friction: 11 }),
    ]).start();
  }, [index]);

  const statusStyle = getStatusStyle(service.status);
  const levelStyle = getLevelStyle(service.service_level);
  const assignedName = service.assigned_technician
    ? (service.assigned_technician.first_name || service.assigned_technician.username)
    : null;

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: translateAnim }] }}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={styles.card}>
        <View style={styles.cardTop}>
          <View style={[styles.avatar, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.avatarText, { color: statusStyle.text }]}>{getInitials(service.customer_name)}</Text>
          </View>
          <View style={styles.cardMiddle}>
            <Text style={styles.nameText} numberOfLines={1}>{service.customer_name}</Text>
            <Text style={styles.metaText}>{service.mobile}</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: levelStyle.bg }]}>
            <MaterialCommunityIcons name={levelStyle.icon} size={12} color={levelStyle.text} />
            <Text style={[styles.chipText, { color: levelStyle.text }]}>{service.service_level_display}</Text>
          </View>
        </View>

        <View style={styles.middleRow}>
          <View style={[styles.statusTag, { backgroundColor: statusStyle.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: statusStyle.dot }]} />
            <Text style={[styles.statusTagText, { color: statusStyle.text }]}>{service.status_display}</Text>
          </View>
          {service.complaints ? (
            <Text style={styles.complaintText} numberOfLines={1}>{service.complaints}</Text>
          ) : null}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons
              name={assignedName ? 'account-check-outline' : 'account-alert-outline'}
              size={12}
              color={assignedName ? THEME.info : THEME.mutedLight}
            />
            <Text style={[styles.footerText, !assignedName && styles.footerTextMuted]}>
              {assignedName || 'Unassigned'}
            </Text>
          </View>
          <View style={styles.footerItem}>
            <MaterialCommunityIcons name="currency-inr" size={12} color={THEME.muted} />
            <Text style={styles.footerText}>{formatCurrency(service.service_charge)}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={THEME.mutedLight} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});
// ── ✨ NEW: Attractive Loading Screen ────────────────────────────
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
            <MaterialCommunityIcons name="toolbox-outline" size={30} color="#FFF" />
          </Animated.View>
        </View>
        <Text style={loadStyles.title}>Loading Services</Text>
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
  topAccent: { height: 6, backgroundColor: THEME.primary, borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
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
// ── Main Screen ──────────────────────────────────────────────────
export default function ServiceScreen({ navigation }: any) {
  const { apiRequest } = useAuthApi();

  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [levelFilter, setLevelFilter] = useState<string[]>([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
  const [deleteFeedback, setDeleteFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });
  const [selectedService, setSelectedService] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Multi‑select modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [tempStatusSelection, setTempStatusSelection] = useState<string[]>([]);
  const [tempLevelSelection, setTempLevelSelection] = useState<string[]>([]);

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isFetching = useRef(false);
  const mountFetchDone = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const fetchServices = useCallback(
    async (page: number, shouldAppend: boolean, search: string, statusArr: string[], levelArr: string[]) => {
      if (isFetching.current) return;
      isFetching.current = true;

      if (!shouldAppend) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (statusArr.length > 0) params.append('status', statusArr.join(','));
        if (levelArr.length > 0) params.append('level', levelArr.join(','));
        params.append('page', page.toString());
        params.append('page_size', '20');

        const url = `${API_BASE_URL}/service/api/services/?${params.toString()}`;
        const res = await apiRequest(url);
        if (!res.ok) throw new Error('Failed to fetch services');
        const data = await res.json();

        if (shouldAppend) {
          setServices(prev => [...prev, ...(data.results || [])]);
        } else {
          setServices(data.results || []);
        }

        setTotalCount(data.count || 0);
        setHasNextPage(!!data.next);
        setCurrentPage(page);
      } catch (err: any) {
        if (err.message !== 'SESSION_EXPIRED') {
          showToast('Could not load services', 'error');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        isFetching.current = false;
      }
    },
    [apiRequest, showToast],
  );

  useEffect(() => {
    fetchServices(1, false, searchQuery, statusFilter, levelFilter);
  }, [searchQuery, statusFilter, levelFilter]);

  useFocusEffect(
    useCallback(() => {
      if (!mountFetchDone.current) {
        mountFetchDone.current = true;
        return;
      }
      fetchServices(1, false, searchQuery, statusFilter, levelFilter);
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchServices(1, false, searchQuery, statusFilter, levelFilter);
  }, [fetchServices, searchQuery, statusFilter, levelFilter]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !loadingMore && !loading && !refreshing) {
      fetchServices(currentPage + 1, true, searchQuery, statusFilter, levelFilter);
    }
  }, [hasNextPage, loadingMore, loading, refreshing, currentPage, fetchServices, searchQuery, statusFilter, levelFilter]);

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

  const openDetail = (service: any) => {
    setSelectedService(service);
    setShowDetailModal(true);
  };

  const handleEdit = (service: any) => {
    setShowDetailModal(false);
    navigation.navigate('AddEditService', {
      service,
      onSuccess: () => fetchServices(1, false, searchQuery, statusFilter, levelFilter),
    });
  };

  const handleDelete = (service: any) => {
    setShowDetailModal(false);
    setTimeout(() => {
      setDeleteTarget(service);
    }, 300);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/service/api/services/${deleteTarget.id}/`, { method: 'DELETE' });
      if (res.ok) {
        setServices(prev => prev.filter(s => s.id !== deleteTarget.id));
        setTotalCount(c => c - 1);
        setDeleteFeedback({ visible: true, type: 'success', title: 'Deleted!', message: 'The service record has been deleted successfully.' });
      } else {
        setDeleteFeedback({ visible: true, type: 'error', title: 'Delete Failed', message: 'Could not delete the service. Please try again.' });
      }
    } catch {
      setDeleteFeedback({ visible: true, type: 'error', title: 'Delete Failed', message: 'Something went wrong. Please try again.' });
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const navigateToAdd = () => {
    navigation.navigate('AddEditService', {
      onSuccess: () => fetchServices(1, false, searchQuery, statusFilter, levelFilter),
    });
  };

  const openStatusModal = () => {
    setTempStatusSelection([...statusFilter]);
    setShowStatusModal(true);
  };

  const openLevelModal = () => {
    setTempLevelSelection([...levelFilter]);
    setShowLevelModal(true);
  };

  const applyStatusFilters = () => {
    setStatusFilter(tempStatusSelection);
    setShowStatusModal(false);
  };

  const applyLevelFilters = () => {
    setLevelFilter(tempLevelSelection);
    setShowLevelModal(false);
  };

  const clearAllFilters = () => {
    setStatusFilter([]);
    setLevelFilter([]);
  };

  const toggleTempStatusOption = (id: string) => {
    setTempStatusSelection(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleTempLevelOption = (id: string) => {
    setTempLevelSelection(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const activeFilterCount = statusFilter.length + levelFilter.length;

  if (loading && !refreshing && services.length === 0) {
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
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast(t => ({ ...t, visible: false }))}
        />
        <ServiceFeedbackModal
          visible={deleteFeedback.visible}
          type={deleteFeedback.type}
          title={deleteFeedback.title}
          message={deleteFeedback.message}
          autoDismiss={deleteFeedback.type === 'success'}
          onClose={() => setDeleteFeedback(f => ({ ...f, visible: false }))}
        />
        <Animated.View style={[styles.screenWrap, { opacity: fadeAnim }]}>
          <View style={styles.headerWrap}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerLeft}>
                <Text style={styles.headerTitle}>Services</Text>
                <Text style={styles.headerSubtitle}>{totalCount} total</Text>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
                  <MaterialCommunityIcons name="refresh" size={18} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.addButton} onPress={navigateToAdd}>
                  <MaterialCommunityIcons name="plus" size={18} color={THEME.primary} />
                  <Text style={styles.addButtonText}>New</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.searchBar}>
              <MaterialCommunityIcons name="magnify" size={16} color={THEME.muted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name, mobile, invoice..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={THEME.mutedLight}
              />
              {searchQuery !== '' && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <MaterialCommunityIcons name="close-circle" size={15} color={THEME.muted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.filterStrip}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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

              <TouchableOpacity
                style={[styles.filterPill, levelFilter.length > 0 && styles.filterPillActive]}
                onPress={openLevelModal}
              >
                <MaterialCommunityIcons name="flag-outline" size={13} color={levelFilter.length > 0 ? '#FFF' : THEME.primary} />
                <Text style={[styles.filterPillText, levelFilter.length > 0 && styles.filterPillTextActive]}>
                  Level {levelFilter.length > 0 ? `(${levelFilter.length})` : ''}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={13} color={levelFilter.length > 0 ? '#FFF' : THEME.primary} />
              </TouchableOpacity>

              {activeFilterCount > 0 && (
                <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearAllFilters}>
                  <MaterialCommunityIcons name="filter-off-outline" size={13} color={THEME.danger} />
                  <Text style={styles.clearFiltersText}>Clear</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          <FlatList
            data={services}
            keyExtractor={item => item.id.toString()}
            renderItem={({ item, index }) => <ServiceCard service={item} index={index} onPress={() => openDetail(item)} />}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} colors={[THEME.primary]} />
            }
            ListEmptyComponent={
              !loading ? (
                <View style={styles.emptyWrap}>
                  <MaterialCommunityIcons name="toolbox-outline" size={44} color={THEME.muted} />
                  <Text style={styles.emptyTitle}>No services found</Text>
                  <Text style={styles.emptySub}>Tap + to add a new service</Text>
                  <TouchableOpacity style={styles.emptyAddBtn} onPress={navigateToAdd}>
                    <Text style={styles.emptyAddText}>Add Service</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                  <Text style={styles.footerLoaderText}>Loading more...</Text>
                </View>
              ) : null
            }
          />
        </Animated.View>
      </SafeAreaView>

      {/* Modals outside SafeAreaView */}
      <ServiceDetailModal
        service={selectedService}
        visible={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCall={handleCall}
      />
      <DeleteConfirmModal
        visible={!!deleteTarget}
        itemName={deleteTarget?.customer_name || 'this service'}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
      />
      <Modal visible={showStatusModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowStatusModal(false)}>
        <View style={styles.centerModalRoot}>
          <Pressable style={styles.modalBackdropFull} onPress={() => setShowStatusModal(false)} />
          <View style={styles.multiSelectCard}>
            <View style={styles.multiSelectHeader}>
              <Text style={styles.multiSelectTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setShowStatusModal(false)}>
                <MaterialCommunityIcons name="close" size={20} color={THEME.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: height * 0.5 }}>
              {['new', 'accepted', 'in_progress', 'completed', 'cancelled'].map(status => (
                <TouchableOpacity
                  key={status}
                  style={styles.checkboxItem}
                  onPress={() => toggleTempStatusOption(status)}
                >
                  <View style={[styles.checkbox, tempStatusSelection.includes(status) && styles.checkboxChecked]}>
                    {tempStatusSelection.includes(status) && (
                      <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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

      <Modal visible={showLevelModal} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowLevelModal(false)}>
        <View style={styles.centerModalRoot}>
          <Pressable style={styles.modalBackdropFull} onPress={() => setShowLevelModal(false)} />
          <View style={styles.multiSelectCard}>
            <View style={styles.multiSelectHeader}>
              <Text style={styles.multiSelectTitle}>Filter by Level</Text>
              <TouchableOpacity onPress={() => setShowLevelModal(false)}>
                <MaterialCommunityIcons name="close" size={20} color={THEME.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: height * 0.5 }}>
              {['low', 'medium', 'high', 'urgent'].map(level => (
                <TouchableOpacity
                  key={level}
                  style={styles.checkboxItem}
                  onPress={() => toggleTempLevelOption(level)}
                >
                  <View style={[styles.checkbox, tempLevelSelection.includes(level) && styles.checkboxChecked]}>
                    {tempLevelSelection.includes(level) && (
                      <MaterialCommunityIcons name="check" size={14} color="#FFF" />
                    )}
                  </View>
                  <Text style={styles.checkboxLabel}>
                    {level.charAt(0).toUpperCase() + level.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.multiSelectFooter}>
              <TouchableOpacity style={styles.clearSelectionBtn} onPress={() => setTempLevelSelection([])}>
                <Text style={styles.clearSelectionText}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyBtn} onPress={applyLevelFilters}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.primary },
  screenWrap: { flex: 1, backgroundColor: THEME.bg },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: THEME.muted },

  headerWrap: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 14,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  addButton: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', paddingHorizontal: 12, height: 34, borderRadius: 17,
  },
  addButtonText: { color: THEME.primary, fontSize: 13, fontWeight: '700' },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFF', borderRadius: 10, paddingHorizontal: 12, height: 38, marginTop: 12,
  },
  searchInput: { flex: 1, fontSize: 13, color: THEME.text },

  filterStrip: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, backgroundColor: THEME.bg },
  filterRow: { gap: 8, paddingRight: 10, alignItems: 'center' },
  filterPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FFF', borderRadius: 999, paddingHorizontal: 12, height: 32,
    borderWidth: 1, borderColor: THEME.border,
  },
  filterPillActive: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  filterPillText: { fontSize: 12, fontWeight: '700', color: THEME.primary },
  filterPillTextActive: { color: '#FFF' },
  clearFiltersBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: THEME.dangerLt, paddingHorizontal: 10, height: 32,
    borderRadius: 999, borderWidth: 1, borderColor: THEME.danger + '30',
  },
  clearFiltersText: { fontSize: 11, color: THEME.danger, fontWeight: '700' },

  listContent: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 22 },

  card: {
    backgroundColor: '#FFF', borderRadius: 14, marginBottom: 10, padding: 12,
    borderWidth: 1, borderColor: THEME.borderLight,
    shadowColor: '#0F172A', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 14, fontWeight: '800' },
  cardMiddle: { flex: 1 },
  nameText: { fontSize: 15, fontWeight: '700', color: THEME.text },
  metaText: { fontSize: 12, color: THEME.muted, marginTop: 2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  chipText: { fontSize: 10, fontWeight: '700' },
  middleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8 },
  statusTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  statusTagText: { fontSize: 10, fontWeight: '700' },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  complaintText: { flex: 1, fontSize: 12, color: THEME.textSecondary },
  cardFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 8, justifyContent: 'space-between' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontSize: 11, fontWeight: '600', color: THEME.textSecondary },
  footerTextMuted: { fontStyle: 'italic', color: THEME.mutedLight },

  // Detail Modal Styles
  fullModalRoot: { flex: 1, justifyContent: 'flex-end' },
  detailSheet: {
    backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28,
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
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  qualityBadgeLargeText: { fontSize: 11, fontWeight: '800' },
  sheetBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  sheetBadgeText: { fontSize: 11, fontWeight: '800' },
  sheetClose: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center',
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

  // Multi‑select modal styles
  centerModalRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalBackdropFull: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.62)' },
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

  // Delete modal styles
  delRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 32 },
  delBox: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
  },
  delIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: THEME.dangerLt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  delTitle: { fontSize: 18, fontWeight: '800', color: THEME.text, marginBottom: 8 },
  delSub: { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  delBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  delCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: THEME.border, alignItems: 'center', backgroundColor: '#FFF' },
  delCancelText: { fontSize: 14, fontWeight: '700', color: THEME.textSub },
  delConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME.danger, alignItems: 'center' },
  delConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  emptyWrap: { alignItems: 'center', paddingVertical: 60, gap: 10 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: THEME.text },
  emptySub: { fontSize: 13, color: THEME.muted },
  emptyAddBtn: { backgroundColor: THEME.primary, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 30, marginTop: 8 },
  emptyAddText: { color: '#FFF', fontWeight: '700' },

  footerLoader: { paddingVertical: 20, alignItems: 'center', flexDirection: 'row', gap: 8 },
  footerLoaderText: { fontSize: 13, color: THEME.muted },

  toastContainer: {
    position: 'absolute', top: 16, left: 20, right: 20,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 14, elevation: 8, zIndex: 9999,
  },
  toastText: { color: '#FFF', fontSize: 14, fontWeight: '600', flex: 1 },
});