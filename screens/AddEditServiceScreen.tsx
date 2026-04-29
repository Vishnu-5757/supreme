// AddEditServiceScreen.tsx
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
  Keyboard,
  Alert,
  FlatList,
  Dimensions,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
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

// ─── FeedbackModal ───────────────────────────────────────────────────
interface FeedbackModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  autoDismiss?: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  type,
  title,
  message,
  onClose,
  autoDismiss = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.82)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();

      if (autoDismiss) {
        const t = setTimeout(onClose, 2200);
        return () => clearTimeout(t);
      }
    } else {
      scaleAnim.setValue(0.82);
      opacityAnim.setValue(0);
    }
  }, [visible, autoDismiss, onClose, opacityAnim, scaleAnim]);

  const cfg = {
    success: {
      iconBg: THEME.successLt,
      iconColor: THEME.success,
      icon: 'check-circle',
      btnColor: THEME.success,
      bar: THEME.success,
    },
    error: {
      iconBg: THEME.dangerLt,
      iconColor: THEME.danger,
      icon: 'close-circle',
      btnColor: THEME.danger,
      bar: THEME.danger,
    },
    info: {
      iconBg: THEME.infoLt,
      iconColor: THEME.info,
      icon: 'information',
      btnColor: THEME.info,
      bar: THEME.info,
    },
  }[type];

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={fmStyles.overlay}>
        <Animated.View
          style={[
            fmStyles.card,
            { opacity: opacityAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={[fmStyles.bar, { backgroundColor: cfg.bar }]} />
          <View style={[fmStyles.iconBubble, { backgroundColor: cfg.iconBg }]}>
            <MaterialCommunityIcons
              name={cfg.icon as any}
              size={44}
              color={cfg.iconColor}
            />
          </View>
          <Text style={fmStyles.title}>{title}</Text>
          <Text style={fmStyles.message}>{message}</Text>

          {!autoDismiss ? (
            <TouchableOpacity
              style={[fmStyles.btn, { backgroundColor: cfg.btnColor }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
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
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 36, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    alignItems: 'center',
    paddingBottom: 28,
    paddingHorizontal: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 14 },
    elevation: 20,
  },
  bar: { width: '100%', height: 5, marginBottom: 28 },
  iconBubble: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
  },
  btn: {
    width: '100%',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
  dismissRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  dismissText: { fontSize: 14, fontWeight: '600' },
});

// ─── Helpers ─────────────────────────────────────────────────────────
const formatDate = (date: Date | null) => {
  if (!date) return '';
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatTime = (date: Date | null) => {
  if (!date) return '';
  return date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

const serviceLevelOptions = [
  { value: 'low', label: 'Low', color: '#6c757d', icon: 'signal-cellular-1' },
  { value: 'medium', label: 'Medium', color: '#0dcaf0', icon: 'signal-cellular-2' },
  { value: 'high', label: 'High', color: '#ffc107', icon: 'signal-cellular-3' },
  { value: 'urgent', label: 'Urgent', color: '#dc3545', icon: 'alert-circle' },
];

// ─── FieldWrap, StyledInput, SectionHeader ───────────────────────────
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

const StyledInput = ({
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  numberOfLines,
  error,
}: any) => {
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

const SectionHeader = ({ icon, label }: { icon: string; label: string }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionLeft}>
      <View style={styles.sectionIconBox}>
        <MaterialCommunityIcons name={icon as any} size={14} color={THEME.primary} />
      </View>
      <Text style={styles.sectionTitle}>{label}</Text>
    </View>
    <View style={styles.sectionLine} />
  </View>
);

// ─── PickerModal (same as leads screen, adapted) ──────────────────
interface ManageItem {
  id: number | string;
  name: string;
}

const PickerModal = ({
  visible,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: ManageItem[];
  selectedId: any;
  onSelect: (item: ManageItem) => void;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0.95,
          useNativeDriver: true,
          tension: 65,
          friction: 9,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      setSearch('');
    }
  }, [visible, scaleAnim, opacityAnim]);

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const LIST_HEIGHT = SCREEN_HEIGHT * 0.34;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(10,18,36,0.62)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20,
        }}
        onPress={onClose}
      >
        <Animated.View
          style={{
            width: '100%',
            backgroundColor: '#FFF',
            borderRadius: 22,
            overflow: 'hidden',
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
            elevation: 28,
            shadowColor: '#000',
            shadowOpacity: 0.22,
            shadowRadius: 28,
            shadowOffset: { width: 0, height: 10 },
          }}
        >
          <Pressable onPress={e => e.stopPropagation()}>
            {/* Header */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 18,
                paddingTop: 18,
                paddingBottom: 14,
                borderBottomWidth: 1,
                borderBottomColor: THEME.border,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: THEME.text }}>
                  {title}
                </Text>
                <Text style={{ fontSize: 11, color: THEME.muted, marginTop: 2 }}>
                  {items.length} option{items.length !== 1 ? 's' : ''} available
                </Text>
              </View>

              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: THEME.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: THEME.border,
                }}
                activeOpacity={0.75}
              >
                <MaterialCommunityIcons name="close" size={18} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: THEME.bg,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: THEME.border,
                  paddingHorizontal: 12,
                  height: 42,
                }}
              >
                <MaterialCommunityIcons name="magnify" size={16} color={THEME.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search..."
                  placeholderTextColor={THEME.mutedLt}
                  style={{ flex: 1, fontSize: 14, color: THEME.text, paddingVertical: 0 }}
                  autoCorrect={false}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={16}
                      color={THEME.mutedLt}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={{ height: 1, backgroundColor: THEME.border }} />

            {/* List */}
            <View style={{ height: LIST_HEIGHT }}>
              <FlatList
                data={filtered}
                keyExtractor={i => String(i.id)}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  padding: 10,
                  flexGrow: 1,
                }}
                style={{ flex: 1 }}
                ListEmptyComponent={
                  <View
                    style={{
                      flex: 1,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingVertical: 40,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={search ? 'magnify-close' : 'inbox-outline'}
                      size={34}
                      color={THEME.mutedLt}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: THEME.muted,
                        marginTop: 10,
                        fontWeight: '700',
                      }}
                    >
                      {search ? 'No results found' : 'No items yet'}
                    </Text>
                    <Text style={{ fontSize: 12, color: THEME.mutedLt, marginTop: 4 }}>
                      {search ? 'Try a different keyword' : ''}
                    </Text>
                  </View>
                }
                renderItem={({ item }) => {
                  const isSelected = String(item.id) === String(selectedId);
                  return (
                    <TouchableOpacity
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: 13,
                        paddingVertical: 13,
                        borderRadius: 10,
                        marginBottom: 5,
                        backgroundColor: isSelected ? THEME.primaryLight : THEME.bg,
                        borderWidth: isSelected ? 1.5 : 0.5,
                        borderColor: isSelected ? THEME.primary + '55' : THEME.border,
                      }}
                      onPress={() => {
                        onSelect(item);
                        onClose();
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={{
                          flex: 1,
                          fontSize: 14,
                          fontWeight: isSelected ? '700' : '500',
                          color: isSelected ? THEME.primary : THEME.text,
                        }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={THEME.primary}
                        />
                      ) : (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 1.5,
                            borderColor: THEME.border,
                          }}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>

            {/* Footer */}
            <View
              style={{
                paddingVertical: 12,
                alignItems: 'center',
                borderTopWidth: 1,
                borderTopColor: THEME.border,
              }}
            >
              <Text style={{ fontSize: 11, color: THEME.mutedLt }}>
                Tap outside to dismiss
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────
interface Props {
  navigation: any;
  route: { params?: { service?: any; onSuccess?: () => void } };
}

export default function AddEditServiceScreen({ navigation, route }: Props) {
  const { apiRequest } = useAuthApi();
  const insets = useSafeAreaInsets();

  const existingService = route?.params?.service;
  const isEdit = !!existingService;
  const serviceId = existingService?.id;

  const [loadingData, setLoadingData] = useState(isEdit);

  const [customerName, setCustomerName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [complaints, setComplaints] = useState('');
  const [serviceCharge, setServiceCharge] = useState('');
  const [serviceLevel, setServiceLevel] = useState('low');
  const [assignedTechnician, setAssignedTechnician] = useState<ManageItem | null>(null);
  const [finishedDateTime, setFinishedDateTime] = useState<Date | null>(null);

  const [technicians, setTechnicians] = useState<ManageItem[]>([]);
  const [showTechnicianPicker, setShowTechnicianPicker] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

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

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
    return () => navigation.setOptions({ gestureEnabled: true });
  }, [navigation]);

  // ✅ Fixed: fetch assignable users only ONCE on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await apiRequest(`${API_BASE_URL}/service/api/assignable-users/`);
        if (res.ok) {
          const data = await res.json();
          // The endpoint returns a plain array, but we also handle if it's wrapped
          const users: ManageItem[] = (Array.isArray(data) ? data : (data.results || [])).map(
            (u: any) => ({
              id: u.id,
              name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
            })
          );
          setTechnicians(users);
        }
      } catch (e) {
        console.warn('Could not fetch assignable users', e);
      }
    })();
  }, []); // ← empty dependency – runs once on mount

  useEffect(() => {
    if (isEdit && serviceId) {
      (async () => {
        try {
          const res = await apiRequest(`${API_BASE_URL}/service/api/services/${serviceId}/`);
          if (res.ok) {
            const data = await res.json();
            setCustomerName(data.customer_name || '');
            setMobile(data.mobile || '');
            setAddress(data.address || '');
            setComplaints(data.complaints || '');
            setServiceCharge(data.service_charge ? String(data.service_charge) : '');
            setServiceLevel(data.service_level || 'low');
            if (data.assigned_technician) {
              setAssignedTechnician({
                id: data.assigned_technician.id,
                name:
                  `${data.assigned_technician.first_name || ''} ${data.assigned_technician.last_name || ''}`.trim() ||
                  data.assigned_technician.username,
              });
            }
            if (data.finished_at) {
              setFinishedDateTime(new Date(data.finished_at));
            }
          } else {
            Alert.alert('Error', 'Could not load service details');
            navigation.goBack();
          }
        } catch {
          Alert.alert('Error', 'Failed to load service');
          navigation.goBack();
        } finally {
          setLoadingData(false);
        }
      })();
    } else {
      setLoadingData(false);
    }
  }, [isEdit, serviceId, apiRequest, navigation]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!customerName.trim()) e.customerName = 'Customer name is required';
    if (!mobile.trim()) e.mobile = 'Mobile number is required';
    else if (!/^\+?[\d\s\-]{7,15}$/.test(mobile.trim())) e.mobile = 'Enter a valid mobile number';
    if (!complaints.trim()) e.complaints = 'Complaints are required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

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
      const payload: any = {
        customer_name: customerName.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        complaints: complaints.trim(),
        service_charge: serviceCharge,
        service_level: serviceLevel,
        assigned_technician: assignedTechnician?.id || null,
      };

      if (finishedDateTime) {
        payload.finished_at = finishedDateTime.toISOString();
      }

      const url = isEdit
        ? `${API_BASE_URL}/service/api/services/${serviceId}/`
        : `${API_BASE_URL}/service/api/services/`;
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        route?.params?.onSuccess?.();
        setFeedbackModal({
          visible: true,
          type: 'success',
          title: isEdit ? 'Service Updated!' : 'Service Created!',
          message: isEdit
            ? 'The service record has been updated successfully.'
            : 'The new service record has been created successfully.',
          autoDismiss: true,
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error && typeof errData.error === 'object') {
          setErrors(errData.error);
          setFeedbackModal({
            visible: true,
            type: 'error',
            title: 'Validation Error',
            message: 'Please fix the highlighted fields.',
            autoDismiss: false,
          });
        } else {
          setFeedbackModal({
            visible: true,
            type: 'error',
            title: 'Error',
            message: errData.error || 'Could not save service',
            autoDismiss: false,
          });
        }
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

  const avatarLetter = isEdit ? (customerName?.[0] || 'S').toUpperCase() : 'S';

  if (loadingData && isEdit) {
    return (
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={THEME.primary} />
          <Text style={styles.loaderText}>Loading service…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <FeedbackModal
        visible={feedbackModal.visible}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        autoDismiss={feedbackModal.autoDismiss}
        onClose={closeFeedback}
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
            <Text style={styles.topTitle}>{isEdit ? 'Edit Service' : 'New Service'}</Text>
            <Text style={styles.topSub}>
              {isEdit ? `Editing: ${existingService?.customer_name || ''}` : 'Fill in the details below'}
            </Text>
          </View>

          <View style={{ width: 34 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* Basic Information */}
              <View style={styles.card}>
                <SectionHeader icon="account-outline" label="Basic Information" />

                <FieldWrap label="Customer Name" required error={errors.customerName}>
                  <StyledInput
                    value={customerName}
                    onChangeText={(v: string) => {
                      setCustomerName(v);
                      if (errors.customerName) setErrors(e => ({ ...e, customerName: '' }));
                    }}
                    placeholder="e.g. John Doe"
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

                <FieldWrap label="Address">
                  <StyledInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder="Street, City, State, ZIP"
                    multiline
                    numberOfLines={2}
                  />
                </FieldWrap>
              </View>

              {/* Service Details */}
              <View style={styles.card}>
                <SectionHeader icon="wrench-outline" label="Service Details" />

                <FieldWrap label="Complaints / Description" required error={errors.complaints}>
                  <StyledInput
                    value={complaints}
                    onChangeText={(v: string) => {
                      setComplaints(v);
                      if (errors.complaints) setErrors(e => ({ ...e, complaints: '' }));
                    }}
                    placeholder="Describe the issue..."
                    multiline
                    numberOfLines={4}
                    error={errors.complaints}
                  />
                </FieldWrap>

                <FieldWrap label="Service Charge (₹)">
                  <StyledInput
                    value={serviceCharge}
                    onChangeText={setServiceCharge}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </FieldWrap>
              </View>

              {/* Assignment & Priority */}
              <View style={styles.card}>
                <SectionHeader icon="account-hard-hat" label="Assignment & Priority" />

                <FieldWrap label="Assign Technician">
                  <TouchableOpacity
                    style={styles.selectorBtn}
                    onPress={() => setShowTechnicianPicker(true)}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name="account-outline"
                      size={16}
                      color={assignedTechnician ? THEME.primary : THEME.mutedLt}
                    />
                    <Text
                      style={[
                        styles.selectorText,
                        !assignedTechnician && styles.selectorPlaceholder,
                      ]}
                      numberOfLines={1}
                    >
                      {assignedTechnician ? assignedTechnician.name : 'Unassigned'}
                    </Text>
                    <MaterialCommunityIcons name="chevron-down" size={18} color={THEME.muted} />
                  </TouchableOpacity>
                </FieldWrap>

                <FieldWrap label="Service Priority">
                  <View style={styles.levelRow}>
                    {serviceLevelOptions.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.levelItem,
                          serviceLevel === opt.value && {
                            borderColor: opt.color,
                            backgroundColor: opt.color + '18',
                          },
                        ]}
                        onPress={() => setServiceLevel(opt.value)}
                      >
                        <MaterialCommunityIcons
                          name={opt.icon as any}
                          size={20}
                          color={serviceLevel === opt.value ? opt.color : THEME.mutedLt}
                        />
                        <Text
                          style={[
                            styles.levelText,
                            serviceLevel === opt.value && { color: opt.color, fontWeight: '700' },
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </FieldWrap>
              </View>

              {/* Completion Date/Time */}
              <View style={styles.card}>
                <SectionHeader icon="calendar-check-outline" label="Completion Date/Time" />

                <FieldWrap label="Finished At">
                  <TouchableOpacity
                    style={[
                      styles.dateTimeBtn,
                      finishedDateTime && styles.dateTimeBtnActive,
                    ]}
                    onPress={() => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(true);
                      } else {
                        if (!finishedDateTime) setFinishedDateTime(new Date());
                        setShowDatePicker(true);
                      }
                    }}
                  >
                    <MaterialCommunityIcons
                      name="calendar-clock"
                      size={18}
                      color={finishedDateTime ? THEME.primary : THEME.mutedLt}
                    />
                    <Text
                      style={[
                        styles.dateTimeText,
                        !finishedDateTime && { color: THEME.mutedLt },
                      ]}
                    >
                      {finishedDateTime
                        ? `${formatDate(finishedDateTime)} ${formatTime(finishedDateTime)}`
                        : 'Select date & time'}
                    </Text>

                    {finishedDateTime && (
                      <TouchableOpacity
                        onPress={() => setFinishedDateTime(null)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <MaterialCommunityIcons name="close-circle" size={18} color={THEME.muted} />
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                </FieldWrap>

                {Platform.OS === 'ios' && showDatePicker && (
                  <View style={styles.iosPickerWrap}>
                    <View style={styles.iosPickerHeader}>
                      <Text style={styles.iosPickerLabel}>Select Date</Text>
                      <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                        <Text style={styles.iosPickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={finishedDateTime || new Date()}
                      mode="date"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          const base = finishedDateTime || new Date();
                          const merged = new Date(selectedDate);
                          merged.setHours(base.getHours(), base.getMinutes());
                          setFinishedDateTime(merged);
                        }
                        if (event.type === 'dismissed') setShowDatePicker(false);
                      }}
                    />
                  </View>
                )}

                {Platform.OS === 'ios' && showTimePicker && (
                  <View style={styles.iosPickerWrap}>
                    <View style={styles.iosPickerHeader}>
                      <Text style={styles.iosPickerLabel}>Select Time</Text>
                      <TouchableOpacity onPress={() => setShowTimePicker(false)}>
                        <Text style={styles.iosPickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={finishedDateTime || new Date()}
                      mode="time"
                      display="spinner"
                      onChange={(event, selectedDate) => {
                        if (selectedDate) {
                          const base = finishedDateTime || new Date();
                          const merged = new Date(base);
                          merged.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                          setFinishedDateTime(merged);
                        }
                        if (event.type === 'dismissed') setShowTimePicker(false);
                      }}
                    />
                  </View>
                )}

                {Platform.OS === 'android' && showDatePicker && (
                  <DateTimePicker
                    value={finishedDateTime || new Date()}
                    mode="date"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        setPendingDate(selectedDate);
                        setShowTimePicker(true);
                      }
                    }}
                  />
                )}

                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker
                    value={pendingDate || finishedDateTime || new Date()}
                    mode="time"
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowTimePicker(false);
                      if (selectedDate && pendingDate) {
                        const merged = new Date(pendingDate);
                        merged.setHours(selectedDate.getHours(), selectedDate.getMinutes());
                        setFinishedDateTime(merged);
                        setPendingDate(null);
                      }
                    }}
                  />
                )}
              </View>
            </Animated.View>
          </ScrollView>

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
                      name={isEdit ? 'content-save-outline' : 'plus-circle-outline'}
                      size={16}
                      color="#FFF"
                    />
                    <Text style={styles.submitText}>
                      {isEdit ? 'Save Changes' : 'Create Service'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Technician Picker */}
      <PickerModal
        visible={showTechnicianPicker}
        onClose={() => setShowTechnicianPicker(false)}
        title="Assign Technician"
        items={technicians}
        selectedId={assignedTechnician?.id}
        onSelect={tech => setAssignedTechnician(tech)}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: THEME.bg },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loaderText: { fontSize: 14, color: THEME.muted },
  topBar: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarCenter: { flex: 1, alignItems: 'center', gap: 4 },
  topAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  topAvatarText: { fontSize: 20, fontWeight: '800', color: THEME.primary },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  keyboardWrap: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
  },
  sectionLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: THEME.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: THEME.primary, letterSpacing: 0.2 },
  sectionLine: { flex: 1, height: 1, backgroundColor: THEME.primaryLight },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: THEME.textSub,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  errorText: { fontSize: 11, color: THEME.danger, marginTop: 4, fontWeight: '600' },
  input: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: THEME.bg,
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderRadius: 10,
    fontWeight: '500',
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
  inputFocused: { backgroundColor: THEME.primarySoft, borderColor: THEME.primary },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderRadius: 10,
    backgroundColor: THEME.bg,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  selectorText: {
    flex: 1,
    fontSize: 14,
    color: THEME.text,
    fontWeight: '600',
    marginLeft: 8,
  },
  selectorPlaceholder: { color: THEME.mutedLt, fontWeight: '500' },
  levelRow: { flexDirection: 'column', gap: 10 },
  levelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: THEME.border,
    backgroundColor: '#FFF',
  },
  levelText: { fontSize: 14, fontWeight: '600', marginLeft: 12, color: THEME.textSub },
  dateTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: THEME.border,
    borderRadius: 10,
    backgroundColor: THEME.bg,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  dateTimeBtnActive: { borderColor: THEME.primary, backgroundColor: THEME.primarySoft },
  dateTimeText: { flex: 1, fontSize: 14, color: THEME.text, fontWeight: '500' },
  iosPickerWrap: {
    backgroundColor: THEME.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: THEME.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  iosPickerLabel: { fontSize: 14, fontWeight: '700', color: THEME.text },
  iosPickerDone: { fontSize: 14, fontWeight: '700', color: THEME.primary },
  fixedFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: THEME.bg,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLt,
  },
  submitRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: THEME.border,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: THEME.textSub },
  submitBtn: {
    flex: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: THEME.primary,
    elevation: 3,
    shadowColor: THEME.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});