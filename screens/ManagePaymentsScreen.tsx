// ManagePaymentsScreen.tsx – add/edit/delete payments for a project directly,
// without going through the full Edit-project form. Reuses the same
// PaymentTerm shape and PATCH endpoint AddEditProjectScreen already saves
// payments through — that endpoint leaves every other project field
// untouched when omitted, so this screen only ever sends `{ payments: [...] }`.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Easing,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';

const THEME = {
  primary: '#8E1C1C',
  primaryLight: '#FCE9E9',
  primarySoft: '#FFF5F5',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  text: '#0F172A',
  textSub: '#475569',
  muted: '#64748B',
  mutedLt: '#94A3B8',
  border: '#E2E8F0',
  success: '#16A34A',
  successLt: '#ECFDF5',
  danger: '#DC2626',
  dangerLt: '#FEF2F2',
};

interface Payment {
  id?: number;
  amount_paid: string | number;
  paid_date: string;
  notes: string;
}

const formatCurrency = (amount: number | string) => {
  const num = Number(amount);
  if (isNaN(num)) return '₹0';
  return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDate = (date: Date | null) => {
  if (!date) return '';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── FeedbackModal ─────────────────────────────────────────────────────
const FM_CFG = {
  success: { bg: '#059669', tint: '#ECFDF5', icon: 'check-bold', btn: 'Done' },
  error: { bg: '#DC2626', tint: '#FEF2F2', icon: 'close-thick', btn: 'Got it' },
} as const;

const FeedbackModal = ({
  visible, type, title, message, onClose,
}: {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}) => {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, tension: 70, friction: 11, useNativeDriver: true }).start();
    }
  }, [visible]);

  const cfg = FM_CFG[type];
  const cardScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1] });
  const cardOpacity = anim.interpolate({ inputRange: [0, 0.4], outputRange: [0, 1], extrapolate: 'clamp' });
  const iconScale = anim.interpolate({ inputRange: [0, 0.6, 0.82, 1], outputRange: [0, 1.15, 0.95, 1] });

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <View style={fmStyles.overlay}>
        <Animated.View style={[fmStyles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
          <View style={fmStyles.iconZone}>
            <Animated.View style={[fmStyles.iconBg, { backgroundColor: cfg.tint, transform: [{ scale: iconScale }] }]}>
              <MaterialCommunityIcons name={cfg.icon as any} size={34} color={cfg.bg} />
            </Animated.View>
          </View>
          <View style={fmStyles.textZone}>
            <Text style={fmStyles.fmTitle}>{title}</Text>
            <Text style={fmStyles.fmMessage}>{message}</Text>
          </View>
          <View style={fmStyles.sep} />
          <TouchableOpacity style={fmStyles.btn} onPress={onClose} activeOpacity={0.75}>
            <Text style={[fmStyles.btnText, { color: cfg.bg }]}>{cfg.btn}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const fmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(10,18,36,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  card: { width: '100%', backgroundColor: '#FFF', borderRadius: 24, alignItems: 'center', overflow: 'hidden', elevation: 18 },
  iconZone: { paddingTop: 32, paddingBottom: 16, alignItems: 'center' },
  iconBg: { width: 74, height: 74, borderRadius: 37, alignItems: 'center', justifyContent: 'center' },
  textZone: { alignItems: 'center', paddingHorizontal: 24, paddingBottom: 20 },
  fmTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 6 },
  fmMessage: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20 },
  sep: { width: '100%', height: 1, backgroundColor: '#F1F5F9' },
  btn: { width: '100%', paddingVertical: 17, alignItems: 'center', backgroundColor: '#FFF' },
  btnText: { fontSize: 15, fontWeight: '700' },
});

// ─── PaymentItem ────────────────────────────────────────────────────────
const PaymentItem = ({ item, onEdit, onDelete }: { item: Payment; onEdit: () => void; onDelete: () => void }) => (
  <View style={styles.paymentListItem}>
    <View style={styles.paymentListItemLeft}>
      <View style={styles.paymentListDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.paymentListAmount}>{formatCurrency(item.amount_paid)}</Text>
        <Text style={styles.paymentListDate}>{item.paid_date ? formatDate(new Date(item.paid_date)) : 'No date'}</Text>
        {item.notes ? <Text style={styles.paymentListNotes} numberOfLines={2}>{item.notes}</Text> : null}
      </View>
    </View>
    <View style={styles.paymentListActions}>
      <TouchableOpacity style={styles.paymentListEditBtn} onPress={onEdit}>
        <MaterialCommunityIcons name="pencil-outline" size={18} color={THEME.primary} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.paymentListDeleteBtn} onPress={onDelete}>
        <MaterialCommunityIcons name="trash-can-outline" size={18} color={THEME.danger} />
      </TouchableOpacity>
    </View>
  </View>
);

// ─── PaymentModal (add / edit) ──────────────────────────────────────────
const PaymentModal = ({
  visible, onClose, onSave, initialData, saving, maxAmount,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { amount_paid: string; paid_date: string; notes: string }) => void;
  initialData?: Payment | null;
  saving: boolean;
  maxAmount?: number;
}) => {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);
  const [error, setError] = useState('');

  const scaleAnim = useRef(new Animated.Value(1.08)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setAmount(initialData?.amount_paid != null ? String(initialData.amount_paid) : '');
      setDate(initialData?.paid_date ? new Date(initialData.paid_date) : null);
      setNotes(initialData?.notes || '');
      setError('');
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
    } else {
      scaleAnim.setValue(1.08);
      opacityAnim.setValue(0);
    }
  }, [visible, initialData]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) setDate(selectedDate);
  };

  const handleSave = () => {
    const trimmed = amount.trim();
    const value = parseFloat(trimmed);
    if (!trimmed || isNaN(value) || value <= 0) {
      setError('Enter a valid amount greater than 0');
      return;
    }
    if (maxAmount != null && value > maxAmount + 0.001) {
      setError(`Amount exceeds remaining balance (${formatCurrency(maxAmount)})`);
      return;
    }
    onSave({
      amount_paid: trimmed,
      paid_date: date ? date.toISOString().split('T')[0] : '',
      notes,
    });
  };

  if (!visible) return null;

  const isEdit = !!initialData;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[pmStyles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={pmStyles.centerWrap}>
          <Animated.View style={[pmStyles.card, { transform: [{ scale: scaleAnim }] }]}>
            <View style={pmStyles.header}>
              <View style={pmStyles.headerIcon}>
                <MaterialCommunityIcons name={isEdit ? 'pencil-outline' : 'plus-circle-outline'} size={20} color={THEME.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pmStyles.title}>{isEdit ? 'Edit Payment' : 'Add Payment'}</Text>
                <Text style={pmStyles.subtitle}>{isEdit ? 'Update payment details' : 'Enter payment details'}</Text>
              </View>
              <TouchableOpacity style={pmStyles.closeBtn} onPress={onClose}>
                <MaterialCommunityIcons name="close" size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <View style={pmStyles.divider} />

            <ScrollView contentContainerStyle={pmStyles.body} keyboardShouldPersistTaps="handled">
              <View style={pmStyles.field}>
                <Text style={pmStyles.label}>Amount (₹) *</Text>
                <View style={[pmStyles.inputRow, amountFocused && pmStyles.focus, error && pmStyles.errorRow]}>
                  <MaterialCommunityIcons name="currency-inr" size={18} color={THEME.muted} />
                  <TextInput
                    value={amount}
                    onChangeText={t => { setAmount(t); if (error) setError(''); }}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                    onFocus={() => setAmountFocused(true)}
                    onBlur={() => setAmountFocused(false)}
                    style={pmStyles.input}
                  />
                </View>
                {error ? <Text style={pmStyles.errorText}>{error}</Text> : null}
                {maxAmount != null && !error && (
                  <Text style={pmStyles.hintText}>Remaining balance: {formatCurrency(maxAmount)}</Text>
                )}
              </View>

              <View style={pmStyles.field}>
                <Text style={pmStyles.label}>Payment Date</Text>
                <TouchableOpacity style={[pmStyles.inputRow, date && pmStyles.focus]} onPress={() => setShowDatePicker(true)}>
                  <MaterialCommunityIcons name="calendar" size={18} color={THEME.muted} />
                  <Text style={{ flex: 1, marginLeft: 8 }}>{date ? formatDate(date) : 'Select date'}</Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker value={date || new Date()} mode="date" onChange={onDateChange} />
              )}

              <View style={pmStyles.field}>
                <Text style={pmStyles.label}>Notes</Text>
                <TextInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Optional notes"
                  multiline
                  numberOfLines={3}
                  onFocus={() => setNotesFocused(true)}
                  onBlur={() => setNotesFocused(false)}
                  style={[pmStyles.textarea, notesFocused && pmStyles.focus]}
                />
              </View>
            </ScrollView>

            <View style={pmStyles.footer}>
              <TouchableOpacity style={pmStyles.cancelBtn} onPress={onClose} disabled={saving}>
                <Text style={pmStyles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[pmStyles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={pmStyles.saveText}>{isEdit ? 'Update' : 'Save'}</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
};

const pmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  centerWrap: { width: '100%', alignItems: 'center' },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#FFF', borderRadius: 18, elevation: 10, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 10 },
  headerIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: THEME.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 16, fontWeight: '800', color: THEME.text },
  subtitle: { fontSize: 12, color: THEME.muted },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: THEME.bg, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, backgroundColor: THEME.border },
  body: { padding: 16 },
  field: { marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 6, color: THEME.text },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: THEME.border, borderRadius: 12, paddingHorizontal: 12, minHeight: 44 },
  focus: { borderColor: THEME.primary, backgroundColor: THEME.primarySoft },
  errorRow: { borderColor: THEME.danger, backgroundColor: THEME.dangerLt },
  errorText: { fontSize: 11, color: THEME.danger, marginTop: 4, fontWeight: '600' },
  hintText: { fontSize: 11, color: THEME.muted, marginTop: 4 },
  input: { flex: 1, marginLeft: 6 },
  textarea: { borderWidth: 1, borderColor: THEME.border, borderRadius: 12, padding: 10, minHeight: 70 },
  footer: { flexDirection: 'row', padding: 12, gap: 10 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: THEME.border, alignItems: 'center' },
  cancelText: { fontWeight: '700', color: THEME.text },
  saveBtn: { flex: 1.5, backgroundColor: THEME.primary, padding: 12, borderRadius: 10, alignItems: 'center' },
  saveText: { color: '#FFF', fontWeight: '800' },
});

// ─── DeleteConfirmModal ─────────────────────────────────────────────────
const DeleteConfirmModal = ({
  visible, itemName, onCancel, onConfirm, loading,
}: {
  visible: boolean;
  itemName: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading: boolean;
}) => (
  <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
    <View style={styles.delRoot}>
      <View style={styles.delBox}>
        <View style={styles.delIconWrap}>
          <MaterialCommunityIcons name="trash-can-outline" size={28} color={THEME.danger} />
        </View>
        <Text style={styles.delTitle}>Delete Payment?</Text>
        <Text style={styles.delSub}>
          <Text style={{ fontWeight: '700', color: THEME.text }}>{itemName}</Text> will be permanently removed.
        </Text>
        <View style={styles.delBtns}>
          <TouchableOpacity style={styles.delCancelBtn} onPress={onCancel} disabled={loading} activeOpacity={0.8}>
            <Text style={styles.delCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.delConfirmBtn, loading && { opacity: 0.6 }]} onPress={onConfirm} disabled={loading} activeOpacity={0.8}>
            {loading ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.delConfirmText}>Yes, Delete</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── Main Screen ────────────────────────────────────────────────────────
export default function ManagePaymentsScreen({ route, navigation }: any) {
  const { project, canEdit = false } = route.params;
  const { apiRequest } = useAuthApi();
  const insets = useSafeAreaInsets();
  const avatarLetter = project.customer_name?.[0]?.toUpperCase() || 'P';

  const [loading, setLoading] = useState(true);
  const [totalAmount, setTotalAmount] = useState(0);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [saving, setSaving] = useState(false);

  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Payment | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [feedback, setFeedback] = useState({ visible: false, type: 'success' as 'success' | 'error', title: '', message: '' });
  const showFeedback = useCallback((type: 'success' | 'error', title: string, message: string) => {
    setFeedback({ visible: true, type, title, message });
  }, []);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await apiRequest(`${API_BASE_URL}/project/api/projects/${project.id}/`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      setTotalAmount(Number(json.total_amount) || 0);
      setPayments(json.payments || []);
    } catch {
      showFeedback('error', 'Error', 'Could not load payment data');
    } finally {
      setLoading(false);
    }
  }, [apiRequest, project.id, showFeedback]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount_paid) || 0), 0);
  const balanceDue = totalAmount - totalPaid;

  // Persists the full desired payments array — the PATCH endpoint replaces
  // all of a project's payments in one call and leaves every other project
  // field untouched when omitted, so this is safe to call standalone here.
  const persistPayments = async (nextPayments: Payment[]) => {
    setSaving(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/project/api/projects/${project.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: nextPayments }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({} as any));
        throw new Error(err.error || 'Save failed');
      }
      await fetchDetail();
      return true;
    } catch (e: any) {
      showFeedback('error', 'Error', e?.message || 'Could not save payment');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openAdd = () => { setEditingPayment(null); setPaymentModalVisible(true); };
  const openEdit = (p: Payment) => { setEditingPayment(p); setPaymentModalVisible(true); };

  const handleSavePayment = async (data: { amount_paid: string; paid_date: string; notes: string }) => {
    const next = editingPayment
      ? payments.map(p => (p === editingPayment ? { ...p, ...data } : p))
      : [...payments, data];
    const ok = await persistPayments(next);
    if (ok) {
      setPaymentModalVisible(false);
      setEditingPayment(null);
      showFeedback('success', editingPayment ? 'Payment Updated' : 'Payment Added', 'Changes saved successfully.');
    }
  };

  const handleDeletePayment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const next = payments.filter(p => p !== deleteTarget);
    const ok = await persistPayments(next);
    setDeleting(false);
    if (ok) {
      setDeleteTarget(null);
      showFeedback('success', 'Payment Deleted', 'The payment entry was removed.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: THEME.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <View style={styles.topAvatar}>
              <Text style={styles.topAvatarText}>{avatarLetter}</Text>
            </View>
            <Text style={styles.topTitle} numberOfLines={1}>Payments</Text>
            <Text style={styles.topSub} numberOfLines={1}>{project.customer_name}</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.bodyWrap}>
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator size="small" color={THEME.primary} />
            </View>
          ) : (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + insets.bottom }]} showsVerticalScrollIndicator={false}>
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Total Amount</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(totalAmount)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Paid Amount</Text>
                  <Text style={[styles.summaryValue, { color: THEME.success }]}>{formatCurrency(totalPaid)}</Text>
                </View>
                <View style={[styles.summaryRow, { marginBottom: 0 }]}>
                  <Text style={styles.summaryLabel}>Balance Due</Text>
                  <Text style={[styles.summaryValue, { color: balanceDue > 0 ? THEME.danger : THEME.success }]}>{formatCurrency(balanceDue)}</Text>
                </View>
              </View>

              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Payment History</Text>
                {canEdit && (
                  <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
                    <MaterialCommunityIcons name="plus" size={16} color={THEME.primary} />
                    <Text style={styles.addBtnText}>Add Payment</Text>
                  </TouchableOpacity>
                )}
              </View>

              {payments.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons name="cash-remove" size={32} color={THEME.mutedLt} />
                  <Text style={styles.emptyText}>No payments recorded yet</Text>
                </View>
              ) : (
                <View style={styles.card}>
                  {payments.map((p, i) => (
                    <PaymentItem
                      key={p.id ?? i}
                      item={p}
                      onEdit={() => openEdit(p)}
                      onDelete={() => setDeleteTarget(p)}
                    />
                  ))}
                </View>
              )}

              {!canEdit && (
                <View style={styles.viewOnlyNote}>
                  <MaterialCommunityIcons name="eye-outline" size={14} color={THEME.muted} />
                  <Text style={styles.viewOnlyText}>View only — you don't have permission to edit payments</Text>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </SafeAreaView>

      <PaymentModal
        visible={paymentModalVisible}
        onClose={() => { setPaymentModalVisible(false); setEditingPayment(null); }}
        onSave={handleSavePayment}
        initialData={editingPayment}
        saving={saving}
        maxAmount={Math.max(0, totalAmount - payments.reduce(
          (sum, p) => (p === editingPayment ? sum : sum + (Number(p.amount_paid) || 0)),
          0,
        ))}
      />

      <DeleteConfirmModal
        visible={!!deleteTarget}
        itemName={deleteTarget ? formatCurrency(deleteTarget.amount_paid) : ''}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeletePayment}
        loading={deleting}
      />

      <FeedbackModal
        visible={feedback.visible}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { backgroundColor: THEME.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 40, gap: 10 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flex: 1, alignItems: 'center', gap: 4 },
  topAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6 },
  topAvatarText: { fontSize: 20, fontWeight: '800', color: THEME.primary },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  bodyWrap: { flex: 1, backgroundColor: THEME.bg, marginTop: -28, paddingTop: 20, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  scrollContent: { padding: 16, paddingBottom: 24 },
  summaryCard: { backgroundColor: '#FFF', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: THEME.border, marginBottom: 18 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 12.5, color: THEME.textSub, fontWeight: '600' },
  summaryValue: { fontSize: 14.5, color: THEME.text, fontWeight: '800' },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: THEME.text },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: THEME.primaryLight, backgroundColor: THEME.primarySoft, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  addBtnText: { fontSize: 12, fontWeight: '700', color: THEME.primary },
  card: { backgroundColor: '#FFF', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: THEME.border },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 12.5, color: THEME.muted, fontWeight: '600' },
  viewOnlyNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 16 },
  viewOnlyText: { fontSize: 12, fontWeight: '600', color: THEME.muted, textAlign: 'center' },
  paymentListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.bg, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: THEME.border },
  paymentListItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  paymentListDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.primary, marginRight: 4 },
  paymentListAmount: { fontSize: 14, fontWeight: '700', color: THEME.text },
  paymentListDate: { fontSize: 12, color: THEME.muted, marginTop: 2 },
  paymentListNotes: { fontSize: 11, color: THEME.muted, marginTop: 2 },
  paymentListActions: { flexDirection: 'row', gap: 8 },
  paymentListEditBtn: { padding: 6 },
  paymentListDeleteBtn: { padding: 6 },
  delRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 32 },
  delBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', elevation: 20 },
  delIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: THEME.dangerLt, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  delTitle: { fontSize: 18, fontWeight: '800', color: THEME.text, marginBottom: 8 },
  delSub: { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  delBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  delCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: THEME.border, alignItems: 'center', backgroundColor: '#FFF' },
  delCancelText: { fontSize: 14, fontWeight: '700', color: THEME.textSub },
  delConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME.danger, alignItems: 'center' },
  delConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
});
