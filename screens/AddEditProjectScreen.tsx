// AddEditProjectScreen.tsx – Full updated version with API integration + image fix
import React, { useEffect, useRef, useState } from 'react';
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
    Dimensions,
    Keyboard,
    Alert,
    Easing,
    Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import {
    GestureHandlerRootView,
    NativeViewGestureHandler,
} from 'react-native-gesture-handler';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const THEME = {
    primary: '#8E1C1C',
    primaryDark: '#6F1515',
    primaryLight: '#FCE9E9',
    primarySoft: '#FFF5F5',
    bg: '#F5F6F8',
    card: '#FFFFFF',
    text: '#0F172A',
    textSub: '#475569',
    muted: '#64748B',
    mutedLt: '#94A3B8',
    border: '#E2E8F0',
    borderLt: '#F1F5F9',
    success: '#16A34A',
    successLt: '#ECFDF5',
    warning: '#D97706',
    warningLt: '#FFFBEB',
    danger: '#DC2626',
    dangerLt: '#FEF2F2',
    info: '#2563EB',
    infoLt: '#EFF6FF',
};

// ─── FeedbackModal ────────────────────────────────────────────────────
interface FeedbackModalProps {
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    onClose: () => void;
    autoDismiss?: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
    visible, type, title, message, onClose, autoDismiss = false,
}) => {
    const scaleAnim = useRef(new Animated.Value(0.82)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 65, friction: 7 }),
                Animated.timing(opacityAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
            ]).start();
            if (autoDismiss) {
                const t = setTimeout(onClose, 2200);
                return () => clearTimeout(t);
            }
        } else {
            scaleAnim.setValue(0.82);
            opacityAnim.setValue(0);
        }
    }, [visible]);

    const cfg = {
        success: { iconBg: THEME.successLt, iconColor: THEME.success, icon: 'check-circle', btnColor: THEME.success, bar: THEME.success },
        error: { iconBg: THEME.dangerLt, iconColor: THEME.danger, icon: 'close-circle', btnColor: THEME.danger, bar: THEME.danger },
        info: { iconBg: THEME.infoLt, iconColor: THEME.info, icon: 'information', btnColor: THEME.info, bar: THEME.info },
    }[type];

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <View style={fmStyles.overlay}>
                <Animated.View style={[fmStyles.card, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
                    <View style={[fmStyles.bar, { backgroundColor: cfg.bar }]} />
                    <View style={[fmStyles.iconBubble, { backgroundColor: cfg.iconBg }]}>
                        <MaterialCommunityIcons name={cfg.icon as any} size={44} color={cfg.iconColor} />
                    </View>
                    <Text style={fmStyles.title}>{title}</Text>
                    <Text style={fmStyles.message}>{message}</Text>
                    {!autoDismiss ? (
                        <TouchableOpacity style={[fmStyles.btn, { backgroundColor: cfg.btnColor }]} onPress={onClose} activeOpacity={0.85}>
                            <Text style={fmStyles.btnText}>Got it</Text>
                        </TouchableOpacity>
                    ) : (
                        <View style={fmStyles.dismissRow}>
                            <ActivityIndicator size="small" color={cfg.iconColor} />
                            <Text style={[fmStyles.dismissText, { color: cfg.iconColor }]}>
                                {type === 'success' ? 'Going back…' : 'Please wait…'}
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </View>
        </Modal>
    );
};

const fmStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(10, 18, 36, 0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
    card: { width: '100%', backgroundColor: '#FFFFFF', borderRadius: 28, alignItems: 'center', paddingBottom: 28, paddingHorizontal: 24, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 28, shadowOffset: { width: 0, height: 14 }, elevation: 20 },
    bar: { width: '100%', height: 5, marginBottom: 28 },
    iconBubble: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    title: { fontSize: 21, fontWeight: '800', color: '#0F172A', textAlign: 'center', marginBottom: 10, letterSpacing: 0.2 },
    message: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22, marginBottom: 26 },
    btn: { width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center' },
    btnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
    dismissRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
    dismissText: { fontSize: 14, fontWeight: '600' },
});

// ─── Helpers ─────────────────────────────────────────────────────────
const formatCurrency = (amount: number | string) => {
    const num = Number(amount);
    if (isNaN(num)) return '₹0';
    return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

const formatDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── FieldWrap ────────────────────────────────────────────────────────
const FieldWrap = ({ label, required, children, onLayout, error }: any) => (
    <View style={styles.fieldWrap} onLayout={onLayout}>
        <Text style={styles.fieldLabel}>
            {label}
            {required && <Text style={{ color: THEME.danger }}> *</Text>}
        </Text>
        {children}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
);

// ─── StyledInput ───────────────────────────────────────────────────────
const StyledInput = ({ value, onChangeText, placeholder, keyboardType, multiline, numberOfLines, error }: any) => {
    const [focused, setFocused] = useState(false);
    return (
        <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={THEME.mutedLt}
            keyboardType={keyboardType}
            multiline={multiline}
            numberOfLines={numberOfLines}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={[
                styles.input,
                multiline && styles.inputMulti,
                focused && !error && styles.inputFocused,
                error && { borderColor: THEME.danger, backgroundColor: THEME.dangerLt },
            ]}
        />
    );
};

// ─── SectionHeader ────────────────────────────────────────────────────
const SectionHeader = ({
    icon,
    label,
    onActionPress,
    actionLabel = 'Add',
    actionIcon = 'plus',
}: {
    icon: string;
    label: string;
    onActionPress?: () => void;
    actionLabel?: string;
    actionIcon?: string;
}) => (
    <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
            <View style={styles.sectionIconBox}>
                <MaterialCommunityIcons name={icon as any} size={14} color={THEME.primary} />
            </View>
            <Text style={styles.sectionTitle}>{label}</Text>
        </View>

        <View style={styles.sectionRight}>
            <View style={styles.sectionLine} />
            {onActionPress && (
                <TouchableOpacity
                    style={styles.sectionAddBtn}
                    onPress={onActionPress}
                    activeOpacity={0.8}
                >
                    <Text style={styles.sectionAddText}>{actionLabel}</Text>
                    <MaterialCommunityIcons name={actionIcon as any} size={16} color={THEME.primary} />
                </TouchableOpacity>
            )}
        </View>
    </View>
);

// ─── Payment Item ─────────────────────────────────────────────────────
const PaymentItem = ({ item, index, onEdit, onDelete }: any) => (
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
            <TouchableOpacity style={styles.paymentListEditBtn} onPress={() => onEdit(index)}>
                <MaterialCommunityIcons name="pencil-outline" size={18} color={THEME.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.paymentListDeleteBtn} onPress={() => onDelete(index)}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color={THEME.danger} />
            </TouchableOpacity>
        </View>
    </View>
);

// ─── Delete Confirm Modal ─────────────────────────────────────────────
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
                        {loading
                            ? <ActivityIndicator size="small" color="#FFF" />
                            : <Text style={styles.delConfirmText}>Yes, Delete</Text>
                        }
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    </Modal>
);

// ─── Payment Modal ────────────────────────────────────────────────────
// ─── Payment Modal (CENTERED STANDARD MODAL) ─────────────────────────
// ─── Payment Modal (FINAL – CENTERED + ZOOM EFFECT) ───────────────────
const PaymentModal = ({
    visible, onClose, onSave, initialData,
}: {
    visible: boolean;
    onClose: () => void;
    onSave: (data: { amount_paid: string; paid_date: string; notes: string }) => void;
    initialData?: { amount_paid: string; paid_date: string; notes: string };
}) => {
    const [amount, setAmount] = useState(initialData?.amount_paid || '');
    const [date, setDate] = useState<Date | null>(
        initialData?.paid_date ? new Date(initialData.paid_date) : null
    );
    const [notes, setNotes] = useState(initialData?.notes || '');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [amountFocused, setAmountFocused] = useState(false);
    const [notesFocused, setNotesFocused] = useState(false);

    const scaleAnim = useRef(new Animated.Value(1.08)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setAmount(initialData?.amount_paid || '');
            setDate(initialData?.paid_date ? new Date(initialData.paid_date) : null);
            setNotes(initialData?.notes || '');

            Animated.parallel([
                Animated.timing(opacityAnim, {
                    toValue: 1,
                    duration: 160,
                    useNativeDriver: true,
                }),
                Animated.timing(scaleAnim, {
                    toValue: 1,
                    duration: 180,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
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
        onSave({
            amount_paid: amount,
            paid_date: date ? date.toISOString().split('T')[0] : '',
            notes,
        });
        onClose();
    };

    if (!visible) return null;

    const isEdit = !!initialData;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
            <Animated.View style={[pmStyles.overlay, { opacity: opacityAnim }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    style={pmStyles.centerWrap}
                >
                    <Animated.View style={[pmStyles.card, { transform: [{ scale: scaleAnim }] }]}>

                        {/* Header */}
                        <View style={pmStyles.header}>
                            <View style={pmStyles.headerIcon}>
                                <MaterialCommunityIcons
                                    name={isEdit ? 'pencil-outline' : 'plus-circle-outline'}
                                    size={20}
                                    color={THEME.primary}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={pmStyles.title}>
                                    {isEdit ? 'Edit Payment' : 'Add Payment'}
                                </Text>
                                <Text style={pmStyles.subtitle}>
                                    {isEdit ? 'Update payment details' : 'Enter payment details'}
                                </Text>
                            </View>

                            <TouchableOpacity style={pmStyles.closeBtn} onPress={onClose}>
                                <MaterialCommunityIcons name="close" size={18} color={THEME.muted} />
                            </TouchableOpacity>
                        </View>

                        <View style={pmStyles.divider} />

                        {/* Body */}
                        <ScrollView contentContainerStyle={pmStyles.body} keyboardShouldPersistTaps="handled">

                            {/* Amount */}
                            <View style={pmStyles.field}>
                                <Text style={pmStyles.label}>Amount (₹) *</Text>
                                <View style={[pmStyles.inputRow, amountFocused && pmStyles.focus]}>
                                    <MaterialCommunityIcons name="currency-inr" size={18} color={THEME.muted} />
                                    <TextInput
                                        value={amount}
                                        onChangeText={setAmount}
                                        placeholder="0.00"
                                        keyboardType="decimal-pad"
                                        onFocus={() => setAmountFocused(true)}
                                        onBlur={() => setAmountFocused(false)}
                                        style={pmStyles.input}
                                    />
                                </View>
                            </View>

                            {/* Date */}
                            <View style={pmStyles.field}>
                                <Text style={pmStyles.label}>Payment Date</Text>
                                <TouchableOpacity
                                    style={[pmStyles.inputRow, date && pmStyles.focus]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <MaterialCommunityIcons name="calendar" size={18} color={THEME.muted} />
                                    <Text style={{ flex: 1, marginLeft: 8 }}>
                                        {date ? formatDate(date) : 'Select date'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={date || new Date()}
                                    mode="date"
                                    onChange={onDateChange}
                                />
                            )}

                            {/* Notes */}
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

                        {/* Footer */}
                        <View style={pmStyles.footer}>
                            <TouchableOpacity style={pmStyles.cancelBtn} onPress={onClose}>
                                <Text style={pmStyles.cancelText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={pmStyles.saveBtn} onPress={handleSave}>
                                <Text style={pmStyles.saveText}>
                                    {isEdit ? 'Update' : 'Save'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                    </Animated.View>
                </KeyboardAvoidingView>
            </Animated.View>
        </Modal>
    );
};

// ─── Styles ──────────────────────────────────────────────────────────
const pmStyles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centerWrap: { width: '100%', alignItems: 'center' },
    card: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#FFF',
        borderRadius: 18,
        elevation: 10,
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        gap: 10,
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: THEME.primaryLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: { fontSize: 16, fontWeight: '800', color: THEME.text },
    subtitle: { fontSize: 12, color: THEME.muted },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: THEME.bg,
        alignItems: 'center',
        justifyContent: 'center',
    },
    divider: { height: 1, backgroundColor: THEME.border },
    body: { padding: 16 },
    field: { marginBottom: 14 },
    label: { fontSize: 12, fontWeight: '700', marginBottom: 6 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        minHeight: 44,
    },
    focus: {
        borderColor: THEME.primary,
        backgroundColor: THEME.primarySoft,
    },
    input: { flex: 1, marginLeft: 6 },
    textarea: {
        borderWidth: 1,
        borderColor: THEME.border,
        borderRadius: 12,
        padding: 10,
        minHeight: 70,
    },
    footer: {
        flexDirection: 'row',
        padding: 12,
        gap: 10,
    },
    cancelBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: THEME.border,
        alignItems: 'center',
    },
    cancelText: { fontWeight: '700' },
    saveBtn: {
        flex: 1.5,
        backgroundColor: THEME.primary,
        padding: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    saveText: { color: '#FFF', fontWeight: '800' },
});

// ─── Main Screen ──────────────────────────────────────────────────────
interface Props {
    navigation: any;
    route: { params?: { project?: any; onSuccess?: () => void } };
}

export default function AddEditProjectScreen({ navigation, route }: Props) {
    const { apiRequest } = useAuthApi();
    const insets = useSafeAreaInsets();
    const existingProject = route?.params?.project;
    const isEdit = !!existingProject;
    const projectId = existingProject?.id;

    // Loading state for fetching full project details
    const [loadingProject, setLoadingProject] = useState(isEdit);

    // Form fields
    const [customerName, setCustomerName] = useState('');
    const [mobile, setMobile] = useState('');
    const [address, setAddress] = useState('');
    const [totalAmount, setTotalAmount] = useState('');
    const [paymentType, setPaymentType] = useState<'cash' | 'loan'>('cash');
    const [remarks, setRemarks] = useState('');
    const [payments, setPayments] = useState<any[]>([]);

    // ── Image state (split into existing server images vs new local picks) ──
    const [existingImages, setExistingImages] = useState<{ id: number; uri: string }[]>([]);
    const [removedImageIds, setRemovedImageIds] = useState<number[]>([]);
    const [newImages, setNewImages] = useState<{ uri: string; fileName: string; type: string }[]>([]);

    // Payment modal
    const [paymentModalVisible, setPaymentModalVisible] = useState(false);
    const [editingPaymentIndex, setEditingPaymentIndex] = useState<number | null>(null);

    // Delete confirm
    const [deleteTargetIndex, setDeleteTargetIndex] = useState<number | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scrollRef = useRef<ScrollView>(null);

    const [feedbackModal, setFeedbackModal] = useState({
        visible: false,
        type: 'error' as 'success' | 'error' | 'info',
        title: '',
        message: '',
        autoDismiss: false,
    });

    // ─── Fetch full project details when editing ────────────────────────
    useEffect(() => {
        if (isEdit && projectId) {
            (async () => {
                try {
                    const res = await apiRequest(`${API_BASE_URL}/project/api/projects/${projectId}/`);
                    if (res.ok) {
                        const data = await res.json();
                        setCustomerName(data.customer_name || '');
                        setMobile(data.mobile || '');
                        setAddress(data.address || '');
                        setTotalAmount(data.total_amount ? String(data.total_amount) : '');
                        setPaymentType(data.payment_type || 'cash');
                        setRemarks(data.remarks || '');

                        // Existing images — store id + absolute URL for display only
                        // These are NOT re-uploaded; only their IDs are sent if removed
                        setExistingImages(
                            (data.images || []).map((img: any) => ({
                                id: img.id,
                                uri: img.image.startsWith('http') ? img.image : `${API_BASE_URL}${img.image}`,
                            }))
                        );
                        setRemovedImageIds([]);
                        setNewImages([]);

                        // Map payments
                        setPayments(
                            (data.payments || []).map((p: any) => ({
                                amount_paid: String(p.amount_paid),
                                paid_date: p.paid_date || '',
                                notes: p.notes || '',
                            }))
                        );
                    } else {
                        Alert.alert('Error', 'Could not load project details');
                        navigation.goBack();
                    }
                } catch (err) {
                    Alert.alert('Error', 'Failed to load project');
                    navigation.goBack();
                } finally {
                    setLoadingProject(false);
                }
            })();
        } else {
            setLoadingProject(false);
        }
    }, [isEdit, projectId]);

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        navigation.setOptions({ gestureEnabled: false });
        return () => navigation.setOptions({ gestureEnabled: true });
    }, [navigation]);

    // ─── Image picker ──────────────────────────────────────────────────
    // ─── Image picker ──────────────────────────────────────────────────
    // ─── Image picker ──────────────────────────────────────────────────
    const pickImages = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(
                'Permission Denied',
                'Please grant photo library access in Settings to attach images.',
                [{ text: 'OK' }]
            );
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            selectionLimit: 5,
            quality: 0.8,
        });

        if (!result.canceled && result.assets.length > 0) {
            const picked = result.assets.map(asset => ({
                uri: asset.uri,
                fileName: asset.fileName || `img_${Date.now()}.jpg`,
                type: asset.mimeType || 'image/jpeg',
            }));
            setNewImages(prev => [...prev, ...picked]);
        }
    };

    // Remove an image that already exists on the server
    const removeExistingImage = (id: number) => {
        setExistingImages(prev => prev.filter(img => img.id !== id));
        setRemovedImageIds(prev => [...prev, id]);
    };

    // Remove a newly picked local image (not yet on server)
    const removeNewImage = (index: number) =>
        setNewImages(prev => prev.filter((_, i) => i !== index));

    // ─── Payment handlers ──────────────────────────────────────────────
    const openAddPayment = () => {
        setEditingPaymentIndex(null);
        setPaymentModalVisible(true);
    };

    const openEditPayment = (index: number) => {
        setEditingPaymentIndex(index);
        setPaymentModalVisible(true);
    };

    const handleSavePayment = (data: { amount_paid: string; paid_date: string; notes: string }) => {
        if (editingPaymentIndex !== null) {
            setPayments(prev => prev.map((p, i) => (i === editingPaymentIndex ? data : p)));
        } else {
            setPayments(prev => [...prev, data]);
        }
        setPaymentModalVisible(false);
        setEditingPaymentIndex(null);
    };

    const confirmDeletePayment = (index: number) => setDeleteTargetIndex(index);

    const handleDeletePayment = async () => {
        if (deleteTargetIndex === null) return;
        setDeleteLoading(true);
        await new Promise(resolve => setTimeout(resolve, 300));
        setPayments(prev => prev.filter((_, i) => i !== deleteTargetIndex));
        setDeleteLoading(false);
        setDeleteTargetIndex(null);
    };

    // ─── Validation ────────────────────────────────────────────────────
    const validate = () => {
        const e: Record<string, string> = {};
        if (!customerName.trim()) e.customerName = 'Customer name is required';
        if (!mobile.trim()) e.mobile = 'Mobile number is required';
        else if (!/^\+?[\d\s\-]{7,15}$/.test(mobile.trim())) e.mobile = 'Enter a valid mobile number';
        if (!address.trim()) e.address = 'Address is required';
        if (!totalAmount.trim()) e.totalAmount = 'Total amount is required';
        else if (isNaN(parseFloat(totalAmount)) || parseFloat(totalAmount) < 0) e.totalAmount = 'Invalid amount';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    // ─── Save Project (Create / Update) ────────────────────────────────
    const handleSave = async () => {
        Keyboard.dismiss();
        if (!validate()) {
            setFeedbackModal({
                visible: true,
                type: 'error',
                title: 'Fields Required',
                message: 'Please fill all required fields correctly.',
                autoDismiss: false,
            });
            return;
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('customer_name', customerName.trim());
            formData.append('mobile', mobile.trim());
            formData.append('address', address.trim());
            formData.append('total_amount', totalAmount);
            formData.append('payment_type', paymentType);
            formData.append('remarks', remarks.trim());

            // Only upload newly-picked local images (not existing server images)
            newImages.forEach(img => {
                formData.append('images', {
                    uri: img.uri,
                    name: img.fileName,
                    type: img.type,
                } as any);
            });

            // Tell the server which existing images were removed
            if (isEdit && removedImageIds.length > 0) {
                formData.append('images_removed', JSON.stringify(removedImageIds));
            }

            // Send payments as a JSON string
            formData.append('payments', JSON.stringify(payments));

            const url = isEdit
                ? `${API_BASE_URL}/project/api/projects/${projectId}/`
                : `${API_BASE_URL}/project/api/projects/`;
            const method = isEdit ? 'PATCH' : 'POST';

            const res = await apiRequest(url, {
                method,
                body: formData,
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (res.ok) {
                route?.params?.onSuccess?.();
                setFeedbackModal({
                    visible: true,
                    type: 'success',
                    title: isEdit ? 'Project Updated!' : 'Project Created!',
                    message: isEdit
                        ? 'The project has been updated successfully.'
                        : 'The new project has been created successfully.',
                    autoDismiss: true,
                });
            } else {
                const errData = await res.json().catch(() => ({}));
                setFeedbackModal({
                    visible: true,
                    type: 'error',
                    title: 'Error',
                    message: errData.error || 'Could not save project',
                    autoDismiss: false,
                });
            }
        } catch (error: any) {
            setFeedbackModal({
                visible: true,
                type: 'error',
                title: 'Unexpected Error',
                message: error.message || 'Something went wrong',
                autoDismiss: false,
            });
        } finally {
            setSaving(false);
        }
    };

    const closeFeedback = () => {
        setFeedbackModal(prev => ({ ...prev, visible: false }));
        if (feedbackModal.type === 'success' && feedbackModal.autoDismiss) {
            route?.params?.onSuccess?.();
            navigation.goBack();
        }
    };

    const avatarLetter = isEdit ? (customerName?.[0] || 'P').toUpperCase() : 'P';

    // Show a loading indicator while fetching edit data
    if (loadingProject && isEdit) {
        return (
            <SafeAreaView style={styles.root} edges={['top']}>
                <View style={styles.centerLoader}>
                    <ActivityIndicator size="large" color={THEME.primary} />
                    <Text style={styles.loaderText}>Loading project…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <FeedbackModal
                visible={feedbackModal.visible}
                type={feedbackModal.type}
                title={feedbackModal.title}
                message={feedbackModal.message}
                autoDismiss={feedbackModal.autoDismiss}
                onClose={closeFeedback}
            />

            <PaymentModal
                visible={paymentModalVisible}
                onClose={() => { setPaymentModalVisible(false); setEditingPaymentIndex(null); }}
                onSave={handleSavePayment}
                initialData={editingPaymentIndex !== null ? payments[editingPaymentIndex] : undefined}
            />

            <DeleteConfirmModal
                visible={deleteTargetIndex !== null}
                itemName={deleteTargetIndex !== null ? `Payment #${deleteTargetIndex + 1}` : ''}
                onCancel={() => setDeleteTargetIndex(null)}
                onConfirm={handleDeletePayment}
                loading={deleteLoading}
            />

            <SafeAreaView style={styles.root} edges={['top']}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.topBarCenter}>
                        <View style={styles.topAvatar}>
                            <Text style={styles.topAvatarText}>{avatarLetter}</Text>
                        </View>
                        <Text style={styles.topTitle}>{isEdit ? 'Edit Project' : 'New Project'}</Text>
                        <Text style={styles.topSub}>
                            {isEdit ? `Editing: ${existingProject?.customer_name || ''}` : 'Fill in the details below'}
                        </Text>
                    </View>
                    <View style={{ width: 34 }} />
                </View>

                <KeyboardAvoidingView style={styles.keyboardWrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <NativeViewGestureHandler disallowInterruption={true}>
                        <ScrollView
                            ref={scrollRef}
                            style={styles.scroll}
                            contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="none"
                            showsVerticalScrollIndicator={false}
                        >
                            <Animated.View style={{ opacity: fadeAnim }}>

                                {/* ── Basic Information ── */}
                                <View style={styles.card}>
                                    <SectionHeader icon="account-outline" label="Basic Information" />
                                    <FieldWrap label="Customer Name" required error={errors.customerName}>
                                        <StyledInput
                                            value={customerName}
                                            onChangeText={(v: string) => {
                                                setCustomerName(v);
                                                if (errors.customerName) setErrors(e => ({ ...e, customerName: '' }));
                                            }}
                                            placeholder="e.g. Vishnu K"
                                            error={errors.customerName}
                                        />
                                    </FieldWrap>
                                    <FieldWrap label="Mobile Number" required error={errors.mobile}>
                                        <StyledInput
                                            value={mobile}
                                            onChangeText={(v: string) => {
                                                setMobile(v);
                                                if (errors.mobile) setErrors(e => ({ ...e, mobile: '' }));
                                            }}
                                            placeholder="+91 98765 43210"
                                            keyboardType="phone-pad"
                                            error={errors.mobile}
                                        />
                                    </FieldWrap>
                                    <FieldWrap label="Address" required error={errors.address}>
                                        <StyledInput
                                            value={address}
                                            onChangeText={(v: string) => {
                                                setAddress(v);
                                                if (errors.address) setErrors(e => ({ ...e, address: '' }));
                                            }}
                                            placeholder="Street, City, State, ZIP"
                                            multiline
                                            numberOfLines={2}
                                            error={errors.address}
                                        />
                                    </FieldWrap>
                                </View>

                                {/* ── Financial Details ── */}
                                <View style={styles.card}>
                                    <SectionHeader icon="currency-inr" label="Financial Details" />
                                    <FieldWrap label="Total Amount (₹)" required error={errors.totalAmount}>
                                        <StyledInput
                                            value={totalAmount}
                                            onChangeText={(v: string) => {
                                                setTotalAmount(v);
                                                if (errors.totalAmount) setErrors(e => ({ ...e, totalAmount: '' }));
                                            }}
                                            placeholder="0.00"
                                            keyboardType="decimal-pad"
                                            error={errors.totalAmount}
                                        />
                                    </FieldWrap>
                                    <FieldWrap label="Payment Type">
                                        <View style={styles.paymentTypeRow}>
                                            <TouchableOpacity
                                                style={[styles.paymentTypeBtn, paymentType === 'cash' && styles.paymentTypeBtnActive]}
                                                onPress={() => setPaymentType('cash')}
                                            >
                                                <MaterialCommunityIcons name="cash" size={16} color={paymentType === 'cash' ? THEME.primary : THEME.muted} />
                                                <Text style={[styles.paymentTypeText, paymentType === 'cash' && styles.paymentTypeTextActive]}>Cash</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={[styles.paymentTypeBtn, paymentType === 'loan' && styles.paymentTypeBtnActive]}
                                                onPress={() => setPaymentType('loan')}
                                            >
                                                <MaterialCommunityIcons name="bank-outline" size={16} color={paymentType === 'loan' ? THEME.primary : THEME.muted} />
                                                <Text style={[styles.paymentTypeText, paymentType === 'loan' && styles.paymentTypeTextActive]}>Loan</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </FieldWrap>
                                    <FieldWrap label="Remarks">
                                        <StyledInput
                                            value={remarks}
                                            onChangeText={(v: string) => setRemarks(v)}
                                            placeholder="Optional notes about this project"
                                            multiline
                                            numberOfLines={3}
                                        />
                                    </FieldWrap>
                                </View>

                                {/* ── Photos / Attachments ── */}
                                {/* ── Photos / Attachments ── */}
                                <View style={styles.card}>
                                   <SectionHeader
    icon="image-outline"
    label="Photos / Attachments"
    onActionPress={pickImages}
    actionLabel="Add"
    actionIcon="image-plus"
/>

                                    {(existingImages.length > 0 || newImages.length > 0) && (
                                        <View style={styles.imageThumbs}>
                                            {existingImages.map(img => (
                                                <View key={`existing-${img.id}`} style={styles.thumb}>
                                                    <Image
                                                        source={{ uri: img.uri }}
                                                        style={StyleSheet.absoluteFill}
                                                        resizeMode="cover"
                                                    />
                                                    <View style={styles.thumbBadge}>
                                                        <MaterialCommunityIcons name="cloud-check" size={10} color="#FFF" />
                                                    </View>
                                                    <TouchableOpacity style={styles.removeThumb} onPress={() => removeExistingImage(img.id)}>
                                                        <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                            {newImages.map((img, idx) => (
                                                <View key={`new-${idx}`} style={styles.thumb}>
                                                    <Image
                                                        source={{ uri: img.uri }}
                                                        style={StyleSheet.absoluteFill}
                                                        resizeMode="cover"
                                                    />
                                                    <View style={[styles.thumbBadge, { backgroundColor: THEME.warning }]}>
                                                        <MaterialCommunityIcons name="upload" size={10} color="#FFF" />
                                                    </View>
                                                    <TouchableOpacity style={styles.removeThumb} onPress={() => removeNewImage(idx)}>
                                                        <MaterialCommunityIcons name="close" size={14} color="#FFF" />
                                                    </TouchableOpacity>
                                                </View>
                                            ))}
                                        </View>
                                    )}

                                    {(existingImages.length > 0 || newImages.length > 0) && (
                                        <View style={styles.imageLegend}>
                                            <View style={styles.imageLegendItem}>
                                                <MaterialCommunityIcons name="cloud-check" size={12} color={THEME.success} />
                                                <Text style={styles.imageLegendText}>Saved</Text>
                                            </View>
                                            <View style={styles.imageLegendItem}>
                                                <MaterialCommunityIcons name="upload" size={12} color={THEME.warning} />
                                                <Text style={styles.imageLegendText}>Pending upload</Text>
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* ── Payment Terms ── */}
                                <View style={styles.card}>
                                    <SectionHeader
    icon="credit-card-outline"
    label="Payment Terms"
    onActionPress={openAddPayment}
    actionLabel="Add"
    actionIcon="plus-circle-outline"
/>
                                    {payments.length > 0 ? (
                                        payments.map((item: any, idx: number) => (
                                            <PaymentItem
                                                key={idx}
                                                index={idx}
                                                item={item}
                                                onEdit={openEditPayment}
                                                onDelete={confirmDeletePayment}
                                            />
                                        ))
                                    ) : (
                                        <Text style={styles.emptyPayments}>No payments added yet</Text>
                                    )}
                                    
                                </View>

                            </Animated.View>
                        </ScrollView>
                    </NativeViewGestureHandler>

                    {/* Fixed Footer */}
                    <View style={[styles.fixedFooter, { paddingBottom: insets.bottom }]}>
                        <View style={styles.submitRow}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                                <Text style={styles.cancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
                                onPress={handleSave}
                                disabled={saving}
                            >
                                {saving ? (
                                    <ActivityIndicator color="#FFF" size="small" />
                                ) : (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <MaterialCommunityIcons
                                            name={isEdit ? 'content-save-outline' : 'account-plus-outline'}
                                            size={16}
                                            color="#FFF"
                                        />
                                        <Text style={styles.submitText}>{isEdit ? 'Save Changes' : 'Create Project'}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: THEME.bg },
    centerLoader: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loaderText: { fontSize: 14, color: THEME.muted, marginTop: 12 },
    topBar: { backgroundColor: THEME.primary, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
    backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
    topBarCenter: { flex: 1, alignItems: 'center', gap: 4 },
    topAvatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6 },
    topAvatarText: { fontSize: 20, fontWeight: '800', color: THEME.primary },
    topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
    topSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
    keyboardWrap: { flex: 1 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
    card: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: THEME.border, padding: 14, marginBottom: 14, shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10 },
    sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionIconBox: { width: 26, height: 26, borderRadius: 8, backgroundColor: THEME.primaryLight, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 12, fontWeight: '700', color: THEME.primary, letterSpacing: 0.2 },
    sectionLine: { flex: 1, height: 1, backgroundColor: THEME.primaryLight },
    fieldWrap: { marginBottom: 14 },
    fieldLabel: { fontSize: 11, fontWeight: '700', color: THEME.textSub, marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' },
    errorText: { fontSize: 11, color: THEME.danger, marginTop: 4, fontWeight: '600' },
    input: { flex: 1, fontSize: 14, color: THEME.text, paddingVertical: 11, paddingHorizontal: 13, backgroundColor: THEME.bg, minHeight: 46, borderWidth: 1.5, borderColor: THEME.border, borderRadius: 10, fontWeight: '500' },
    inputMulti: { minHeight: 66, textAlignVertical: 'top', paddingTop: 12 },
    inputFocused: { backgroundColor: THEME.primarySoft, borderColor: THEME.primary },
    paymentTypeRow: { flexDirection: 'row', gap: 10 },
    paymentTypeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: THEME.border, backgroundColor: THEME.bg },
    paymentTypeBtnActive: { borderColor: THEME.primary, backgroundColor: THEME.primaryLight },
    paymentTypeText: { fontSize: 14, fontWeight: '700', color: THEME.muted },
    paymentTypeTextActive: { color: THEME.primary },
    // Image section
    imagePicker: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: THEME.border, borderStyle: 'dashed', borderRadius: 10, padding: 14, justifyContent: 'center' },
    imagePickerText: { fontSize: 14, color: THEME.primary, fontWeight: '600' },
    imageThumbs: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
    thumb: { width: 80, height: 80, borderRadius: 8, overflow: 'hidden', backgroundColor: THEME.border },
    thumbImage: { width: 80, height: 80 },
    thumbBadge: { position: 'absolute', bottom: 4, left: 4, backgroundColor: THEME.success, borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
    removeThumb: { position: 'absolute', top: 4, right: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 12, width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
    imageLegend: { flexDirection: 'row', gap: 14, marginTop: 8, paddingHorizontal: 2 },
    imageLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    imageLegendText: { fontSize: 11, color: THEME.muted, fontWeight: '500' },
    // Payment list
    paymentListItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: THEME.bg, borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: THEME.border },
    paymentListItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
    paymentListDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: THEME.primary, marginRight: 4 },
    paymentListAmount: { fontSize: 14, fontWeight: '700', color: THEME.text },
    paymentListDate: { fontSize: 12, color: THEME.muted, marginTop: 2 },
    paymentListNotes: { fontSize: 11, color: THEME.muted, marginTop: 2 },
    paymentListActions: { flexDirection: 'row', gap: 8 },
    paymentListEditBtn: { padding: 6 },
    paymentListDeleteBtn: { padding: 6 },
    emptyPayments: { fontSize: 13, color: THEME.muted, textAlign: 'center', paddingVertical: 14 },
    addPaymentBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 10, borderWidth: 1, borderColor: THEME.primaryLight, borderRadius: 10, backgroundColor: THEME.primaryLight },
    addPaymentText: { fontSize: 14, color: THEME.primary, fontWeight: '700' },
    // Delete modal
    delRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 32 },
    delBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, shadowOffset: { width: 0, height: 4 } },
    delIconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: THEME.dangerLt, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    delTitle: { fontSize: 18, fontWeight: '800', color: THEME.text, marginBottom: 8 },
    delSub: { fontSize: 14, color: THEME.muted, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
    delBtns: { flexDirection: 'row', gap: 12, width: '100%' },
    delCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: THEME.border, alignItems: 'center', backgroundColor: '#FFF' },
    delCancelText: { fontSize: 14, fontWeight: '700', color: THEME.textSub },
    delConfirmBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME.danger, alignItems: 'center' },
    delConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
    // Footer
    fixedFooter: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: THEME.bg, borderTopWidth: 1, borderTopColor: THEME.borderLt },
    submitRow: { flexDirection: 'row', gap: 12 },
    cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: THEME.border, alignItems: 'center', backgroundColor: '#FFF' },
    cancelText: { fontSize: 14, fontWeight: '700', color: THEME.textSub },
    submitBtn: { flex: 2.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME.primary, elevation: 3, shadowColor: THEME.primary, shadowOpacity: 0.3, shadowRadius: 8 },
    submitBtnDisabled: { opacity: 0.65 },
    submitText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
    sectionRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
},
sectionAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 8,
    backgroundColor: THEME.primaryLight,
},
sectionAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: THEME.primary,
    marginRight: 4,
},
});