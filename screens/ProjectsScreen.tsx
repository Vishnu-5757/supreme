// ProjectsScreen.tsx
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
  Pressable,
  PanResponder,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';
import { useFocusEffect } from '@react-navigation/native';
import { userCache } from '../hooks/userCache';
import { usePermissionContext } from '../hooks/PermissionContext';

const { height } = Dimensions.get('window');

const THEME = {
  primary: '#8E1C1C',
  primaryDark: '#6F1515',
  primaryLight: '#FCE9E9',
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

// Helpers
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const getPaymentTypeStyle = (type: string) => {
  if (type === 'loan') return { bg: '#FEF2F2', text: '#991B1B', icon: 'bank-outline' };
  return { bg: '#ECFDF5', text: '#065F46', icon: 'cash' };
};

const getStatusColor = (total_paid: number, total_amount: number) => {
  if (total_paid >= total_amount) return THEME.success;
  if (total_paid > 0) return THEME.warning;
  return THEME.muted;
};

const getStatusMeta = (total_paid: number, total_amount: number) => {
  if (total_paid >= total_amount) {
    return { label: 'Completed', bg: THEME.successLight, text: THEME.success, icon: 'check-circle-outline' };
  }
  if (total_paid > 0) {
    return { label: 'Partial', bg: THEME.warningLight, text: THEME.warning, icon: 'progress-clock' };
  }
  return { label: 'Pending', bg: THEME.primaryLight, text: THEME.primary, icon: 'clock-outline' };
};

export const getInitials = (name: string) => {
  if (!name) return 'P';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
};
// Milestone steps (mirrors backend STEP_ORDER / FIELD_MAP)
const MILESTONE_STEPS = [
  { key: 'subsidy', label: 'Subsidy Registration', doneField: 'subsidy_registration_done', residentialOnly: true },
  { key: 'loan', label: 'Loan Paperwork', doneField: 'loan_paperwork_done' },
  { key: 'kseb_feasibility', label: 'KSEB Feasibility', doneField: 'kseb_feasibility_done' },
  { key: 'material_delivery', label: 'Material Delivery', doneField: 'material_delivery_done' },
  { key: 'work_started', label: 'Work Started', doneField: 'work_started_done' },
  { key: 'work_completed', label: 'Work Completed', doneField: 'work_completed_done' },
  { key: 'kseb_completion_report', label: 'KSEB Completion Report', doneField: 'kseb_completion_report_done' },
  { key: 'completion_approved', label: 'Completion Approved', doneField: 'completion_approved_done' },
  { key: 'plant_commissioned', label: 'Plant Commissioned', doneField: 'plant_commissioned_done' },
];
// Toast
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
  const bgColor = type === 'success' ? THEME.success : type === 'error' ? THEME.danger : '#2563EB';
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'information';

  return (
    <Animated.View style={[styles.toastContainer, { transform: [{ translateY }], opacity, backgroundColor: bgColor }]}>
      <MaterialCommunityIcons name={icon} size={20} color="#FFF" />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

// ─── ProjectFeedbackModal ─────────────────────────────────────────────
const PFM_CFG = {
  success: { bg: '#059669', tint: '#ECFDF5', icon: 'check-bold',  btn: 'Done'   },
  error:   { bg: '#DC2626', tint: '#FEF2F2', icon: 'close-thick', btn: 'Got it' },
  info:    { bg: '#2563EB', tint: '#EFF6FF', icon: 'information', btn: 'OK'     },
} as const;

const ProjectFeedbackModal = ({ visible, type, title, message, onClose, autoDismiss = false }: {
  visible: boolean; type: 'success' | 'error' | 'info'; title: string; message: string; onClose: () => void; autoDismiss?: boolean;
}) => {
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

  const cfg = PFM_CFG[type];
  const cardScale   = anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const cardOpacity = anim.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' });
  const iconScale   = anim.interpolate({ inputRange: [0, 0.6, 0.82, 1], outputRange: [0, 1.15, 0.95, 1] });
  const ctOpacity   = anim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0, 1], extrapolate: 'clamp' });
  const ctY         = anim.interpolate({ inputRange: [0.4, 1], outputRange: [10, 0], extrapolate: 'clamp' });

  if (!visible) return null;
  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={pfmStyles.overlay}>
        <Animated.View style={[pfmStyles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <View style={pfmStyles.iconZone}>
            <Animated.View style={[pfmStyles.iconBg, { backgroundColor: cfg.tint, transform: [{ scale: iconScale }] }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={36} color={cfg.bg} />
            </Animated.View>
          </View>
          <Animated.View style={[pfmStyles.textZone, { opacity: ctOpacity, transform: [{ translateY: ctY }] }]}>
            <Text style={pfmStyles.fmTitle}>{title}</Text>
            <Text style={pfmStyles.fmMessage}>{message}</Text>
          </Animated.View>
          <View style={pfmStyles.sep} />
          {autoDismiss && type === 'success' ? (
            <View style={pfmStyles.btn}>
              <ActivityIndicator size="small" color={cfg.bg} />
              <Text style={[pfmStyles.btnText, { color: cfg.bg, marginLeft: 8 }]}>Please wait…</Text>
            </View>
          ) : !autoDismiss ? (
            <TouchableOpacity style={pfmStyles.btn} onPress={onClose} activeOpacity={0.75}>
              <Text style={[pfmStyles.btnText, { color: cfg.bg }]}>{cfg.btn}</Text>
            </TouchableOpacity>
          ) : null}
        </Animated.View>
      </View>
    </Modal>
  );
};

const pfmStyles = StyleSheet.create({
  overlay:  { flex: 1, backgroundColor: 'rgba(10,18,36,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card:     { width: '100%', backgroundColor: '#FFF', borderRadius: 24, alignItems: 'center', overflow: 'hidden', elevation: 18, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
  iconZone: { paddingTop: 32, paddingBottom: 16, alignItems: 'center' },
  iconBg:   { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  textZone: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  fmTitle:  { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 6 },
  fmMessage:{ fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  sep:      { width: '100%', height: 1, backgroundColor: '#F1F5F9' },
  btn:      { width: '100%', paddingVertical: 17, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', backgroundColor: '#FFF' },
  btnText:  { fontSize: 15, fontWeight: '700' },
});

// ─── ProjectDeleteConfirmModal ────────────────────────────────────────
const ProjectDeleteConfirmModal = ({ visible, projectName, onCancel, onConfirm, loading }: {
  visible: boolean; projectName: string; onCancel: () => void; onConfirm: () => void; loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
    <View style={pdcStyles.root}>
      <View style={pdcStyles.box}>
        <View style={pdcStyles.iconWrap}>
          <MaterialCommunityIcons name="trash-can-outline" size={28} color={THEME.danger} />
        </View>
        <Text style={pdcStyles.title}>Delete Project?</Text>
        <Text style={pdcStyles.sub}>
          <Text style={{ fontWeight: '700', color: THEME.text }}>"{projectName}"</Text>
          {' '}will be permanently removed.
        </Text>
        <View style={pdcStyles.btns}>
          <TouchableOpacity style={pdcStyles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Text style={pdcStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[pdcStyles.confirmBtn, loading && { opacity: 0.6 }]} onPress={onConfirm} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={pdcStyles.confirmText}>Yes, Delete</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

const pdcStyles = StyleSheet.create({
  root:       { flex: 1, backgroundColor: 'rgba(10,18,36,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  box:        { width: '100%', backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', elevation: 16, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  iconWrap:   { width: 56, height: 56, borderRadius: 28, backgroundColor: THEME.dangerLight, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  title:      { fontSize: 18, fontWeight: '800', color: THEME.text, marginBottom: 8 },
  sub:        { fontSize: 13, color: THEME.muted, textAlign: 'center', lineHeight: 20, marginBottom: 22 },
  btns:       { flexDirection: 'row', gap: 10, width: '100%' },
  cancelBtn:  { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: THEME.text },
  confirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME.danger, alignItems: 'center' },
  confirmText:{ fontWeight: '800', color: '#FFF' },
});

// Detail Modal (simmilar to LeadDetailModal)
const ProjectDetailModal = ({ project, visible, onClose, onEdit, onDelete, onCall, onTrack, canEdit, canDelete, canTrack }: any) => {
  const slideAnim = useRef(new Animated.Value(height)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const { apiRequest } = useAuthApi();

  const [trackingFields, setTrackingFields] = useState<Record<string, any>>({});
  const [trackingCategory, setTrackingCategory] = useState('RES');
  const [trackingLoading, setTrackingLoading] = useState(false);

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

  useEffect(() => {
    if (!visible || !project?.id || !canTrack) return;
    let cancelled = false;
    setTrackingLoading(true);
    apiRequest(`${API_BASE_URL}/project/${project.id}/tracking-api/`)
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (cancelled || !json) return;
        setTrackingFields(json.fields || {});
        setTrackingCategory(json.category || 'RES');
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setTrackingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, project?.id]);

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

  if (!project) return null;

  const total_amount = Number(project.total_amount);
  const total_paid = Number(project.total_paid) || 0;
  const remaining = total_amount - total_paid;
  const payStyle = getPaymentTypeStyle(project.payment_type);
  const statusMeta = getStatusMeta(total_paid, total_amount);

  const pendingMilestones = MILESTONE_STEPS.filter(step => {
    if (trackingCategory === 'COM' && step.residentialOnly) return false;
    if (project.payment_type === 'cash' && step.key === 'loan') return false;
    return !trackingFields[step.doneField];
  });

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
            <View style={[styles.sheetAvatar, { backgroundColor: THEME.primaryLight }]}>
              <Text style={[styles.sheetAvatarText, { color: THEME.primary }]}>{getInitials(project.customer_name)}</Text>
            </View>
            <View style={styles.sheetHeaderInfo}>
              <Text style={styles.sheetName}>{project.customer_name}</Text>
              <Text style={styles.sheetMobile}>{project.mobile}</Text>
              <View style={styles.sheetBadgeRow}>
                <View style={[styles.qualityBadgeLarge, { backgroundColor: statusMeta.bg }]}>
                  <MaterialCommunityIcons name={statusMeta.icon as any} size={13} color={statusMeta.text} />
                  <Text style={[styles.qualityBadgeLargeText, { color: statusMeta.text }]}>{statusMeta.label}</Text>
                </View>
                <View style={[styles.sheetBadge, { backgroundColor: payStyle.bg }]}>
                  <MaterialCommunityIcons name={payStyle.icon} size={13} color={payStyle.text} />
                  <Text style={[styles.sheetBadgeText, { color: payStyle.text }]}>
                    {project.payment_type === 'loan' ? 'Loan' : 'Cash'}
                  </Text>
                </View>
              </View>
            </View>
            <TouchableOpacity style={styles.sheetClose} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={20} color={THEME.muted} />
            </TouchableOpacity>
          </View>

          <View style={styles.quickActions}>
  <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.successLight }]} onPress={() => onCall(project.mobile)}>
    <MaterialCommunityIcons name="phone" size={20} color={THEME.success} />
    <Text style={[styles.quickBtnText, { color: THEME.success }]}>Call</Text>
  </TouchableOpacity>

  {canEdit && (
    <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.infoLight }]} onPress={() => onEdit(project)}>
      <MaterialCommunityIcons name="pencil-outline" size={20} color={THEME.info} />
      <Text style={[styles.quickBtnText, { color: THEME.info }]}>Edit</Text>
    </TouchableOpacity>
  )}

  {canTrack && (
    <TouchableOpacity style={[styles.quickBtn, { backgroundColor: '#E8F5E9' }]} onPress={() => onTrack(project)}>
      <MaterialCommunityIcons name="map-marker-path" size={20} color={THEME.success} />
      <Text style={[styles.quickBtnText, { color: THEME.success }]}>Track</Text>
    </TouchableOpacity>
  )}

  {canDelete && (
    <TouchableOpacity style={[styles.quickBtn, { backgroundColor: THEME.dangerLight }]} onPress={() => onDelete(project)}>
      <MaterialCommunityIcons name="trash-can-outline" size={20} color={THEME.danger} />
      <Text style={[styles.quickBtnText, { color: THEME.danger }]}>Delete</Text>
    </TouchableOpacity>
  )}
</View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.sheetScroll}>
            <Text style={styles.sectionLabel}>PROJECT DETAILS</Text>
            <View style={styles.detailCard}>
              <DetailRow icon="format-list-numbered" label="Total Amount" value={formatCurrency(total_amount)} />
              <DetailRow icon="cash-check" label="Paid Amount" value={formatCurrency(total_paid)} color={THEME.success} />
              <DetailRow icon="cash-remove" label="Balance Due" value={formatCurrency(remaining)} color={remaining > 0 ? THEME.danger : THEME.success} />
              <DetailRow icon="information-outline" label="Payment Type" value={project.payment_type === 'loan' ? 'Loan' : 'Cash'} />
              {project.address ? <DetailRow icon="map-marker-outline" label="Address" value={project.address} /> : null}
              {project.remarks ? <DetailRow icon="note-text-outline" label="Remarks" value={project.remarks} /> : null}
            </View>

            <Text style={styles.sectionLabel}>ADDITIONAL INFORMATION</Text>
            <View style={styles.detailCard}>
              <DetailRow icon="calendar-month" label="Created" value={formatDate(project.created_at)} />
              {project.created_by ? (
                <DetailRow
                  icon="account-outline"
                  label="Created By"
                  value={`${project.created_by.first_name || ''} ${project.created_by.last_name || ''}`.trim() || project.created_by.username}
                />
              ) : null}
            </View>

            <Text style={styles.sectionLabel}>PENDING MILESTONES</Text>
            <View style={styles.detailCard}>
              {trackingLoading ? (
                <View style={{ padding: 16, alignItems: 'center' }}>
                  <ActivityIndicator size="small" color={THEME.primary} />
                </View>
              ) : pendingMilestones.length === 0 ? (
                <View style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <MaterialCommunityIcons name="check-circle" size={18} color={THEME.success} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: THEME.success }}>
                    All milestones completed
                  </Text>
                </View>
              ) : (
                pendingMilestones.map(step => (
                  <DetailRow
                    key={step.key}
                    icon="progress-clock"
                    label={step.label}
                    value="Pending"
                    color={THEME.warning}
                  />
                ))
              )}
            </View>

            <View style={{ height: 36 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
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

// Project Card – status tag removed, footer shows only a right arrow
const ProjectCard = React.memo(({ project, index, onPress }: any) => {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, delay: index * 18, duration: 200, useNativeDriver: true }),
      Animated.spring(translateAnim, { toValue: 0, delay: index * 18, useNativeDriver: true, tension: 80, friction: 10 }),
    ]).start();
  }, [index]);

  const total_amount = Number(project.total_amount);
  const total_paid = Number(project.total_paid) || 0;
  const remaining = total_amount - total_paid;
  const payStyle = getPaymentTypeStyle(project.payment_type);
  const progress = total_amount > 0 ? total_paid / total_amount : 0;

  const followUpDate =
    project.follow_up_date ||
    project.followup_date ||
    project.followUpDate ||
    '';

  return (
    <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: translateAnim }] }}>
      <TouchableOpacity activeOpacity={0.86} onPress={onPress} style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View style={[styles.avatar, { backgroundColor: THEME.primaryLight }]}>
            <Text style={styles.avatarText}>{project.customer_name?.[0]?.toUpperCase() || 'P'}</Text>
          </View>
          <View style={styles.headerMiddle}>
            <View style={styles.nameLine}>
              <Text style={styles.nameText} numberOfLines={1}>{project.customer_name}</Text>
            </View>
            <Text style={styles.mobileText} numberOfLines={1}>{project.mobile}</Text>
            {!!followUpDate && (
              <View style={styles.followRow}>
                <MaterialCommunityIcons name="calendar-outline" size={12} color={THEME.muted} />
                <Text style={styles.followText} numberOfLines={1}>Follow-up: {formatDate(followUpDate)}</Text>
              </View>
            )}
          </View>
          <View style={[styles.paymentTag, { backgroundColor: payStyle.bg }]}>
            <MaterialCommunityIcons name={payStyle.icon} size={13} color={payStyle.text} />
            <Text style={[styles.paymentTagText, { color: payStyle.text }]}>
              {project.payment_type === 'loan' ? 'Loan' : 'Cash'}
            </Text>
          </View>
        </View>

        <View style={styles.amountGrid}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Total</Text>
            <Text style={styles.amountValue}>{formatCurrency(total_amount)}</Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Paid</Text>
            <Text style={[styles.amountValue, { color: getStatusColor(total_paid, total_amount) }]}>
              {formatCurrency(total_paid)}
            </Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Balance</Text>
            <Text style={[styles.amountValue, { color: remaining > 0 ? THEME.danger : THEME.success }]}>
              {formatCurrency(remaining)}
            </Text>
          </View>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${Math.min(100, progress * 100)}%`, backgroundColor: getStatusColor(total_paid, total_amount) }]} />
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={THEME.mutedLight} />
            <Text style={styles.dateText}>{formatDate(project.created_at)}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={18} color={THEME.mutedLight} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

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
            <MaterialCommunityIcons name="briefcase-outline" size={30} color="#FFF" />
          </Animated.View>
        </View>
        <Text style={loadStyles.title}>Loading Projects</Text>
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


export default function ProjectsScreen({ navigation }: any) {
  const { apiRequest } = useAuthApi();
  const { isSuperuser, hasPermission } = usePermissionContext();
  const canAdd    = isSuperuser || hasPermission('project.add_project');
  const canEdit   = isSuperuser || hasPermission('project.change_project');
  const canDelete = isSuperuser || hasPermission('project.delete_project');
  const canTrack  = isSuperuser || hasPermission('project.change_project');

  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });

  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteFeedback, setDeleteFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const isFetching = useRef(false);
  const mountFetchDone = useRef(false);

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  }, []);

  const fetchProjects = useCallback(
    async (page: number, shouldAppend: boolean, search: string, payment: string) => {
      if (isFetching.current) return;
      isFetching.current = true;

      if (!shouldAppend) setLoading(true);
      else setLoadingMore(true);

      try {
        const params = new URLSearchParams();
        if (search) params.append('q', search);
        if (payment) params.append('payment_type', payment);
        params.append('page', page.toString());
        params.append('page_size', '20');

        const url = `${API_BASE_URL}/project/api/projects/?${params.toString()}`;
        const res = await apiRequest(url);
        if (!res.ok) throw new Error('Failed to fetch projects');
        const data = await res.json();

        if (shouldAppend) {
          setProjects(prev => [...prev, ...(data.results || [])]);
        } else {
          setProjects(data.results || []);
        }

        setTotalCount(data.count || 0);
        setHasNextPage(!!data.next);
        setCurrentPage(page);
      } catch (err: any) {
        if (err.message !== 'SESSION_EXPIRED') {
          showToast('Could not load projects', 'error');
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
    fetchProjects(1, false, searchQuery, paymentFilter);
  }, [searchQuery, paymentFilter]);

  useFocusEffect(
    useCallback(() => {
      if (!mountFetchDone.current) {
        mountFetchDone.current = true;
        return;
      }
      fetchProjects(1, false, searchQuery, paymentFilter);
    }, []),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchProjects(1, false, searchQuery, paymentFilter);
  }, [fetchProjects, searchQuery, paymentFilter]);

  const loadMore = useCallback(() => {
    if (hasNextPage && !loadingMore && !loading && !refreshing) {
      fetchProjects(currentPage + 1, true, searchQuery, paymentFilter);
    }
  }, [hasNextPage, loadingMore, loading, refreshing, currentPage, fetchProjects, searchQuery, paymentFilter]);

  const navigateToAddProject = () => {
    navigation.navigate('AddEditProject', {
      onSuccess: () => fetchProjects(1, false, searchQuery, paymentFilter),
    });
  };

  const handleDeleteProject = (project: any) => {
    setShowDetailModal(false);
    setTimeout(() => setDeleteTarget(project), 150);
  };

  const confirmDeleteProject = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/project/api/projects/${deleteTarget.id}/`, { method: 'DELETE' });
      setDeleteTarget(null);
      setDeleteLoading(false);
      if (res.ok) {
        setProjects(prev => prev.filter(p => p.id !== deleteTarget.id));
        setTotalCount(c => c - 1);
        setDeleteFeedback({ visible: true, type: 'success', title: 'Deleted!', message: 'The project has been deleted successfully.' });
      } else {
        setDeleteFeedback({ visible: true, type: 'error', title: 'Failed', message: 'Could not delete the project. Please try again.' });
      }
    } catch {
      setDeleteTarget(null);
      setDeleteLoading(false);
      setDeleteFeedback({ visible: true, type: 'error', title: 'Error', message: 'Something went wrong. Please try again.' });
    }
  };

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

  const openDetail = (project: any) => {
    setSelectedProject(project);
    setShowDetailModal(true);
  };

  const handleEdit = (project: any) => {
    setShowDetailModal(false);
    navigation.navigate('AddEditProject', {
      project,
      onSuccess: () => fetchProjects(1, false, searchQuery, paymentFilter),
    });
  };
  const handleTrackProject = (project: any) => {
  setShowDetailModal(false);
  navigation.navigate('ProjectTrackingScreen', {
    projectId: project.id,
    project,
  });
};

  const cardPress = (project: any) => {
    openDetail(project);
  };

  if (loading && !refreshing && projects.length === 0) {
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
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(t => ({ ...t, visible: false }))}
      />

      <ProjectDeleteConfirmModal
        visible={!!deleteTarget}
        projectName={deleteTarget?.customer_name || ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteProject}
        loading={deleteLoading}
      />

      <ProjectFeedbackModal
        visible={deleteFeedback.visible}
        type={deleteFeedback.type}
        title={deleteFeedback.title}
        message={deleteFeedback.message}
        onClose={() => setDeleteFeedback(f => ({ ...f, visible: false }))}
        autoDismiss={false}
      />

      <Animated.View style={[styles.screenWrap, { opacity: fadeAnim }]}>
        <View style={styles.headerWrap}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>Projects</Text>
              <Text style={styles.headerSubtitle}>{totalCount} total</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.iconBtn} onPress={onRefresh}>
                <MaterialCommunityIcons name="refresh" size={18} color="#FFF" />
              </TouchableOpacity>
              {canAdd && (
                <TouchableOpacity style={styles.addButton} onPress={navigateToAddProject}>
                  <MaterialCommunityIcons name="plus" size={18} color={THEME.primary} />
                  <Text style={styles.addButtonText}>New</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={16} color={THEME.muted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name, mobile, address..."
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
              style={[styles.filterPill, paymentFilter === 'cash' && styles.filterPillActive]}
              onPress={() => setPaymentFilter(paymentFilter === 'cash' ? '' : 'cash')}
            >
              <MaterialCommunityIcons name="cash" size={13} color={paymentFilter === 'cash' ? '#FFF' : THEME.success} />
              <Text style={[styles.filterPillText, paymentFilter === 'cash' && styles.filterPillTextActive]}>Cash</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterPill, paymentFilter === 'loan' && styles.filterPillActive]}
              onPress={() => setPaymentFilter(paymentFilter === 'loan' ? '' : 'loan')}
            >
              <MaterialCommunityIcons name="bank-outline" size={13} color={paymentFilter === 'loan' ? '#FFF' : THEME.danger} />
              <Text style={[styles.filterPillText, paymentFilter === 'loan' && styles.filterPillTextActive]}>Loan</Text>
            </TouchableOpacity>
            {paymentFilter !== '' && (
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={() => setPaymentFilter('')}>
                <MaterialCommunityIcons name="filter-off-outline" size={13} color={THEME.danger} />
                <Text style={styles.clearFiltersText}>Clear</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>

        <FlatList
          data={projects}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item, index }) => <ProjectCard project={item} index={index} onPress={() => cardPress(item)} />}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} colors={[THEME.primary]} />
          }
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="briefcase-outline" size={44} color={THEME.muted} />
                <Text style={styles.emptyTitle}>No projects found</Text>
                <Text style={styles.emptySub}>{canAdd ? 'Tap + to add a new project' : 'No projects to display'}</Text>
                {canAdd && (
                  <TouchableOpacity style={styles.emptyAddBtn} onPress={navigateToAddProject}>
                    <Text style={styles.emptyAddText}>Add Project</Text>
                  </TouchableOpacity>
                )}
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

        <ProjectDetailModal
  project={selectedProject}
  visible={showDetailModal}
  onClose={() => setShowDetailModal(false)}
  onEdit={handleEdit}
  onDelete={handleDeleteProject}
  onCall={handleCall}
  onTrack={handleTrackProject}
  canEdit={canEdit}
  canDelete={canDelete}
  canTrack={canTrack}
/>
      </Animated.View>
    </SafeAreaView>
    </View>
  );
}

// Styles – removed openPill and openText, added plain arrow style
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: THEME.primary },
  screenWrap: { flex: 1, backgroundColor: THEME.bg },
  centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: THEME.muted },

  headerWrap: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 14,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 2 },
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
  searchInput: { flex: 1, fontSize: 13, color: THEME.text },

  filterStrip: { paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, backgroundColor: THEME.bg },
  filterRow: { gap: 8, paddingRight: 10 },
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
    height: 32, borderRadius: 999, borderWidth: 1, borderColor: THEME.danger + '30',
  },
  clearFiltersText: { fontSize: 11, color: THEME.danger, fontWeight: '700' },

  listContent: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 22 },

  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    marginBottom: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: THEME.borderLight,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  avatarText: { fontSize: 14, fontWeight: '800', color: THEME.primary },
  headerMiddle: { flex: 1, paddingRight: 8 },
  nameLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameText: { flex: 1, fontSize: 15, fontWeight: '700', color: THEME.text },
  mobileText: { fontSize: 12, color: THEME.muted, marginTop: 2 },
  followRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  followText: { fontSize: 11.5, color: THEME.muted, flex: 1 },
  paymentTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12,
  },
  paymentTagText: { fontSize: 11, fontWeight: '700' },
  amountGrid: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 12,
  },
  amountItem: { alignItems: 'center', flex: 1 },
  amountDivider: { width: 1, height: 28, backgroundColor: THEME.borderLight, marginHorizontal: 6 },
  amountLabel: { fontSize: 10, color: THEME.muted, fontWeight: '600' },
  amountValue: { fontSize: 14, fontWeight: '800', marginTop: 2 },
  progressBar: { height: 3, backgroundColor: THEME.border, borderRadius: 2, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 },
  dateText: { fontSize: 11, color: THEME.mutedLight, flexShrink: 1 },

  // Detail Modal Styles
  fullModalRoot: { flex: 1, justifyContent: 'flex-end' },
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