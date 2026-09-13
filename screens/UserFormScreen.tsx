import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Switch,
  StyleSheet, Animated, ActivityIndicator, Keyboard, Platform, Modal,
  Dimensions, KeyboardAvoidingView, StatusBar,        // ✅ added StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE_URL } from '../config';
import { useAuthApi } from '../hooks/useAuthApi';

const { width } = Dimensions.get('window');

// ─── THEME (matches LeadsScreen) ───────────────────────────────────────────────
export const THEME = {
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

// ─── Constants ────────────────────────────────────────────────────────────────
type ProjectAccess = 'full' | 'view' | 'none';

const getProjectAccess = (perms: string[]): ProjectAccess => {
  if (perms.includes('project')) return 'full';
  if (perms.includes('project_view')) return 'view';
  return 'none';
};

const setProjectAccess = (perms: string[], access: ProjectAccess): string[] => {
  const base = perms.filter(p => p !== 'project' && p !== 'project_view');
  if (access === 'full') return [...base, 'project'];
  if (access === 'view') return [...base, 'project_view'];
  return base;
};

const BLANK_FORM = {
  first_name: '', last_name: '', email: '', username: '',
  password: '', confirm_password: '',
  is_active: true, is_staff: false, is_head: false, is_technician: false,
  app_permissions: [] as string[],
  milestone_perms: [] as number[],
};

type FormData = typeof BLANK_FORM;
type Errors = Partial<Record<keyof FormData | 'general', string>>;
type UniqueStatus = 'idle' | 'checking' | 'ok' | 'taken';

// ─── FeedbackModal ────────────────────────────────────────────────────────────
const FM_CFG = {
  success: { bg: '#059669', tint: '#ECFDF5', icon: 'check-bold',  btn: 'Done'   },
  error:   { bg: '#DC2626', tint: '#FEF2F2', icon: 'close-thick', btn: 'Got it' },
  info:    { bg: '#2563EB', tint: '#EFF6FF', icon: 'information', btn: 'OK'     },
} as const;

interface FeedbackModalProps {
  visible: boolean;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose: () => void;
  autoDismiss?: boolean;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, type, title, message, onClose, autoDismiss = false }) => {
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
      if (autoDismiss) {
        const t = setTimeout(onClose, 1000);
        return () => clearTimeout(t);
      }
    } else {
      anim.setValue(0);
    }
  }, [visible]);

  const cfg = FM_CFG[type];
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
          <Animated.View style={[fmStyles.textZone, { opacity: ctOpacity, transform: [{ translateY: ctY }] }]}>
            <Text style={fmStyles.title}>{title}</Text>
            <Text style={fmStyles.message}>{message}</Text>
          </Animated.View>
          <View style={fmStyles.sep} />
          <Animated.View style={{ width: '100%', opacity: ctOpacity }}>
            <TouchableOpacity style={fmStyles.btn} onPress={onClose} activeOpacity={0.75}>
              <Text style={[fmStyles.btnText, { color: cfg.bg }]}>{cfg.btn}</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const fmStyles = StyleSheet.create({
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

// ─── Form Field ───────────────────────────────────────────────────────────────
const Field = ({
  label, value, onChangeText, placeholder, icon, error, required,
  secureTextEntry, keyboardType, autoCapitalize, rightElement, editable = true,
  fieldKey, onFieldLayout,
}: any) => {
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(borderAnim, { toValue: focused ? 1 : 0, duration: 180, useNativeDriver: false }).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? THEME.danger : THEME.border, error ? THEME.danger : THEME.primary],
  });

  return (
    <View
      style={fieldStyles.wrapper}
      onLayout={e => {
        if (fieldKey && onFieldLayout) {
          onFieldLayout(fieldKey, e.nativeEvent.layout.y);
        }
      }}
    >
      <Text style={fieldStyles.label}>
        {label}{required && <Text style={{ color: THEME.danger }}> *</Text>}
      </Text>
      <Animated.View style={[
        fieldStyles.box,
        { borderColor },
        focused && fieldStyles.boxFocused,
        error && fieldStyles.boxError,
        !editable && fieldStyles.boxDisabled,
      ]}>
        <MaterialCommunityIcons
          name={icon} size={17}
          color={error ? THEME.danger : focused ? THEME.primary : THEME.muted}
          style={fieldStyles.icon}
        />
        <TextInput
          style={fieldStyles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={THEME.muted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          editable={editable}
        />
        {rightElement}
      </Animated.View>
      {error && (
        <View style={fieldStyles.errorRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={12} color={THEME.danger} />
          <Text style={fieldStyles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
};

const fieldStyles = StyleSheet.create({
  wrapper: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: THEME.textSecondary, marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' },
  box: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 10, backgroundColor: '#FAFBFC', minHeight: 46 },
  boxFocused: { backgroundColor: '#FEFEFE' },
  boxError: { backgroundColor: THEME.dangerLight },
  boxDisabled: { backgroundColor: '#F8FAFC', opacity: 0.65 },
  icon: { marginLeft: 12, marginRight: 2 },
  input: { flex: 1, fontSize: 14, color: THEME.text, paddingVertical: 11, paddingHorizontal: 10, paddingRight: 12 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  errorText: { fontSize: 11, color: THEME.danger },
});

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionLabel = ({ icon, title }: any) => (
  <View style={sectionStyles.row}>
    <View style={sectionStyles.iconBox}>
      <MaterialCommunityIcons name={icon} size={14} color={THEME.primary} />
    </View>
    <Text style={sectionStyles.title}>{title}</Text>
    <View style={sectionStyles.line} />
  </View>
);

const sectionStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, marginTop: 4 },
  iconBox: { width: 26, height: 26, borderRadius: 8, backgroundColor: THEME.primaryLight, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 12, fontWeight: '700', color: THEME.primary, letterSpacing: 0.2 },
  line: { flex: 1, height: 1, backgroundColor: THEME.primaryLight },
});

// ─── Toggle Row ───────────────────────────────────────────────────────────────
const ToggleItem = ({ icon, iconColor, iconBg, label, desc, value, onValueChange }: any) => (
  <View style={toggleStyles.row}>
    <View style={[toggleStyles.iconBox, { backgroundColor: iconBg }]}>
      <MaterialCommunityIcons name={icon} size={14} color={iconColor} />
    </View>
    <View style={toggleStyles.text}>
      <Text style={toggleStyles.label}>{label}</Text>
      {desc && <Text style={toggleStyles.desc}>{desc}</Text>}
    </View>
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: THEME.border, true: iconColor + '60' }}
      thumbColor={value ? iconColor : '#CBD5E1'}
      ios_backgroundColor={THEME.border}
    />
  </View>
);

const toggleStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: THEME.text },
  desc: { fontSize: 10, color: THEME.muted, marginTop: 1 },
});

// ─── Unified App Access Modal (centered dialog — all apps together) ────────────
const TOGGLE_APPS = [
  { id: 'service',   label: 'Service',   icon: 'toolbox-outline',        color: THEME.info,    bg: THEME.infoLight    },
  { id: 'lead',      label: 'Leads',     icon: 'account-group-outline',  color: '#7C3AED',     bg: '#F5F3FF'          },
  { id: 'dashboard', label: 'Dashboard', icon: 'view-dashboard-outline', color: THEME.primary, bg: THEME.primaryLight },
];

// ─── AppCard (simple toggle — Service / Leads / Dashboard) ───────────────────
const AppCard = ({ app, selected, onPress }: any) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    style={[acStyles.card, selected && { borderColor: app.color, backgroundColor: app.bg }]}>
    <View style={[acStyles.iconBox, { backgroundColor: selected ? app.color + '25' : '#F1F5F9' }]}>
      <MaterialCommunityIcons name={app.icon as any} size={16} color={selected ? app.color : THEME.muted} />
    </View>
    <Text style={[acStyles.label, selected && { color: app.color, fontWeight: '700' }]}>{app.label}</Text>
    <View style={[acStyles.check, selected && { backgroundColor: app.color }]}>
      {selected && <MaterialCommunityIcons name="check" size={9} color="#FFF" />}
    </View>
  </TouchableOpacity>
);

const acStyles = StyleSheet.create({
  card: { width: '48.5%', flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11, borderRadius: 12, borderWidth: 1.5, borderColor: THEME.border, backgroundColor: '#FAFBFC' },
  iconBox: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 12, fontWeight: '600', color: THEME.textSecondary },
  check: { width: 14, height: 14, borderRadius: 7, backgroundColor: THEME.border, alignItems: 'center', justifyContent: 'center' },
});

// ─── Milestone Access (only shown when Project access = Full) ────────────────
interface MilestoneDef { id: number; name: string; }

const MilestoneChip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8}
    style={[msStyles.chip, selected && { borderColor: THEME.primary, backgroundColor: THEME.primaryLight }]}>
    <View style={[msStyles.check, selected && { backgroundColor: THEME.primary, borderColor: THEME.primary }]}>
      {selected && <MaterialCommunityIcons name="check" size={10} color="#FFF" />}
    </View>
    <Text style={[msStyles.chipLabel, selected && { color: THEME.primary, fontWeight: '700' }]} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

const msStyles = StyleSheet.create({
  card: { backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1, borderColor: THEME.border, padding: 12, marginBottom: 18 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  headerText: { fontSize: 11, fontWeight: '700', color: THEME.textSecondary, textTransform: 'uppercase', letterSpacing: 0.3 },
  quickLink: { fontSize: 11, fontWeight: '700', color: THEME.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 20, borderWidth: 1.5, borderColor: THEME.border, backgroundColor: '#FAFBFC', maxWidth: '100%' },
  check: { width: 16, height: 16, borderRadius: 8, borderWidth: 1.5, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center' },
  chipLabel: { fontSize: 12, color: THEME.textSecondary },
});

// ─── ProjectCard (shows access level, opens picker on tap) ───────────────────
const PROJECT_CFG: Record<ProjectAccess, { color: string; bg: string; label: string }> = {
  full: { color: THEME.success, bg: THEME.successLight, label: 'Full' },
  view: { color: THEME.info,    bg: THEME.infoLight,    label: 'View Only' },
  none: { color: THEME.muted,   bg: '#F1F5F9',          label: 'No Access' },
};

const ProjectCard = ({ access, onPress }: { access: ProjectAccess; onPress: () => void }) => {
  const cfg = PROJECT_CFG[access];
  const active = access !== 'none';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}
      style={[acStyles.card, active && { borderColor: cfg.color, backgroundColor: cfg.bg }]}>
      <View style={[acStyles.iconBox, { backgroundColor: active ? cfg.color + '25' : '#F1F5F9' }]}>
        <MaterialCommunityIcons name="briefcase-outline" size={16} color={active ? cfg.color : THEME.muted} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 12, fontWeight: active ? '700' : '600', color: active ? cfg.color : THEME.textSecondary }}>Projects</Text>
        {active && <Text style={{ fontSize: 9, color: cfg.color, fontWeight: '600', marginTop: 1 }}>{cfg.label}</Text>}
      </View>
      <MaterialCommunityIcons name="chevron-down" size={12} color={active ? cfg.color : THEME.border} />
    </TouchableOpacity>
  );
};

// ─── ProjectPickerModal (small center dialog) ─────────────────────────────────
const PPM_OPTS = [
  { key: 'full' as ProjectAccess, label: 'Full Access', desc: 'Can view & manage all projects', icon: 'briefcase-check-outline', color: THEME.success, bg: THEME.successLight },
  { key: 'view' as ProjectAccess, label: 'View Only',   desc: 'Can view but not edit',          icon: 'eye-outline',            color: THEME.info,    bg: THEME.infoLight    },
  { key: 'none' as ProjectAccess, label: 'No Access',   desc: 'No access to projects',          icon: 'briefcase-off-outline',  color: THEME.muted,   bg: '#F1F5F9'          },
];

const ProjectPickerModal = ({ visible, current, onSelect, onClose }: {
  visible: boolean; current: ProjectAccess; onSelect: (v: ProjectAccess) => void; onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
    <TouchableOpacity style={ppmStyles.overlay} activeOpacity={1} onPress={onClose}>
      <TouchableOpacity activeOpacity={1} style={ppmStyles.dialog} onPress={() => {}}>
        <View style={ppmStyles.header}>
          <View style={ppmStyles.hIcon}>
            <MaterialCommunityIcons name="briefcase-outline" size={16} color={THEME.success} />
          </View>
          <Text style={ppmStyles.title}>Project Access</Text>
          <TouchableOpacity style={ppmStyles.closeBtn} onPress={onClose}>
            <MaterialCommunityIcons name="close" size={15} color={THEME.muted} />
          </TouchableOpacity>
        </View>
        <View style={ppmStyles.sep} />
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 10, gap: 8 }}>
          {PPM_OPTS.map(opt => {
            const active = current === opt.key;
            return (
              <TouchableOpacity key={opt.key}
                style={[ppmStyles.option, active && { backgroundColor: opt.bg, borderColor: opt.color }]}
                onPress={() => { onSelect(opt.key); onClose(); }} activeOpacity={0.75}>
                <View style={[ppmStyles.optIcon, { backgroundColor: active ? opt.color + '22' : '#F1F5F9' }]}>
                  <MaterialCommunityIcons name={opt.icon as any} size={18} color={active ? opt.color : THEME.muted} />
                </View>
                <View style={ppmStyles.optText}>
                  <Text style={[ppmStyles.optLabel, active && { color: opt.color }]}>{opt.label}</Text>
                  <Text style={ppmStyles.optDesc}>{opt.desc}</Text>
                </View>
                <View style={[ppmStyles.radio, active && { borderColor: opt.color }]}>
                  {active && <View style={[ppmStyles.radioDot, { backgroundColor: opt.color }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const ppmStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.48)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  dialog: { width: '100%', backgroundColor: '#FFF', borderRadius: 20, overflow: 'hidden', elevation: 24, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  hIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: THEME.successLight, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 15, fontWeight: '800', color: THEME.text },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  sep: { height: 1, backgroundColor: THEME.borderLight },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 12, borderWidth: 1.5, borderColor: THEME.border, backgroundColor: '#FAFBFC' },
  optIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  optText: { flex: 1 },
  optLabel: { fontSize: 13, fontWeight: '700', color: THEME.text, marginBottom: 1 },
  optDesc:  { fontSize: 11, color: THEME.muted },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: THEME.border, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 5 },
});

// ─── Password Strength ────────────────────────────────────────────────────────
const PasswordStrength = ({ password }: { password: string }) => {
  if (!password) return null;
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const levels = [
    { label: 'Weak',   color: THEME.danger  },
    { label: 'Fair',   color: THEME.warning },
    { label: 'Good',   color: '#0EA5E9'      },
    { label: 'Strong', color: THEME.success },
  ];
  const level = levels[score - 1] || levels[0];
  return (
    <View style={pwStyles.wrap}>
      <View style={pwStyles.bars}>
        {[1,2,3,4].map(i => (
          <View key={i} style={[pwStyles.bar, { backgroundColor: i <= score ? level.color : THEME.border }]} />
        ))}
      </View>
      <Text style={[pwStyles.label, { color: level.color }]}>{level.label}</Text>
    </View>
  );
};

const pwStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  bars: { flexDirection: 'row', gap: 4, flex: 1 },
  bar: { flex: 1, height: 3, borderRadius: 2 },
  label: { fontSize: 11, fontWeight: '700', width: 44, textAlign: 'right' },
});

// ─── Unique Status Indicator ──────────────────────────────────────────────────
const UniqueIndicator = ({ status }: { status: UniqueStatus }) => {
  if (status === 'idle') return null;
  if (status === 'checking') return <ActivityIndicator size="small" color={THEME.muted} style={{ marginRight: 10 }} />;
  if (status === 'ok') return <MaterialCommunityIcons name="check-circle" size={16} color={THEME.success} style={{ marginRight: 10 }} />;
  return <MaterialCommunityIcons name="close-circle" size={16} color={THEME.danger} style={{ marginRight: 10 }} />;
};

// ─── Main Form Screen ─────────────────────────────────────────────────────────
interface UserFormScreenProps {
  navigation: any;
  isEdit?: boolean;
  initialData?: Partial<FormData>;
  userId?: number;
  onSubmit: (formData: FormData) => Promise<{ ok: boolean; errors?: Errors; message?: string }>;
  submitting: boolean;
  pageTitle: string;
  pageSubtitle: string;
  submitLabel: string;
}

const FIELD_ORDER: (keyof Errors)[] = [
  'first_name', 'last_name', 'email', 'username', 'password', 'confirm_password',
];

export default function UserFormScreen({
  navigation,
  isEdit = false,
  initialData,
  userId,
  onSubmit,
  submitting,
  pageTitle,
  pageSubtitle,
  submitLabel,
}: UserFormScreenProps) {
  const { apiRequest } = useAuthApi();
  const insets = useSafeAreaInsets();

  const [form, setForm] = useState<FormData>({ ...BLANK_FORM, ...initialData });
  const [errors, setErrors] = useState<Errors>({});
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showProjectPicker, setShowProjectPicker] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UniqueStatus>('idle');
  const [emailStatus, setEmailStatus] = useState<UniqueStatus>('idle');
  const [milestoneCatalog, setMilestoneCatalog] = useState<MilestoneDef[]>([]);

  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    autoDismiss: boolean;
  }>({ visible: false, type: 'error', title: '', message: '', autoDismiss: false });

  const scrollRef = useRef<ScrollView>(null);
  const fieldYPositions = useRef<Partial<Record<string, number>>>({});

  const handleFieldLayout = useCallback((fieldKey: string, y: number) => {
    fieldYPositions.current[fieldKey] = y;
  }, []);

  const usernameTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emailTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const set = (key: keyof FormData) => (val: any) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const toggleApp = (id: string) =>
    setForm(prev => ({
      ...prev,
      app_permissions: prev.app_permissions.includes(id)
        ? prev.app_permissions.filter(p => p !== id)
        : [...prev.app_permissions, id],
    }));

  const toggleMilestone = (id: number) =>
    setForm(prev => ({
      ...prev,
      milestone_perms: prev.milestone_perms.includes(id)
        ? prev.milestone_perms.filter(p => p !== id)
        : [...prev.milestone_perms, id],
    }));

  // Fetch the milestone catalog once (used to render the checkbox list and
  // to know "all ids" for the All/None quick actions).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest(`${API_BASE_URL}/users/api/milestones/`);
        const data = await res.json();
        if (!cancelled && Array.isArray(data)) setMilestoneCatalog(data);
      } catch {
        // Non-fatal — Project access can still be set to Full without this
        // list; the checkboxes just won't render if it fails to load.
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const showModal = (
    type: 'success' | 'error' | 'info',
    title: string,
    message: string,
    autoDismiss = false,
  ) => setFeedbackModal({ visible: true, type, title, message, autoDismiss });

  const closeModal = () => {
    const wasSuccess = feedbackModal.type === 'success' && feedbackModal.autoDismiss;
    setFeedbackModal(p => ({ ...p, visible: false }));
    if (wasSuccess) navigation.goBack();
  };

  const checkUnique = useCallback(async (field: 'username' | 'email', value: string) => {
    if (!value.trim()) return;
    const setter = field === 'username' ? setUsernameStatus : setEmailStatus;
    setter('checking');
    try {
      const params = new URLSearchParams({ field, value });
      if (userId) params.append('pk', String(userId));
      const res = await apiRequest(`${API_BASE_URL}/users/check-unique/?${params}`);
      const data = await res.json();
      setter(data.available ? 'ok' : 'taken');
      if (!data.available) {
        setErrors(prev => ({ ...prev, [field]: data.message || `${field} already in use` }));
      } else {
        setErrors(prev => {
          const e = { ...prev };
          delete e[field as keyof Errors];
          return e;
        });
      }
    } catch {
      setter('idle');
    }
  }, [userId]);

  const onUsernameChange = (val: string) => {
    set('username')(val);
    setUsernameStatus('idle');
    if (usernameTimer.current) clearTimeout(usernameTimer.current);
    if (val.trim().length >= 3) {
      usernameTimer.current = setTimeout(() => checkUnique('username', val.trim()), 600);
    }
  };

  const onEmailChange = (val: string) => {
    set('email')(val);
    setEmailStatus('idle');
    if (emailTimer.current) clearTimeout(emailTimer.current);
    if (val.includes('@')) {
      emailTimer.current = setTimeout(() => checkUnique('email', val.trim()), 600);
    }
  };

  const validate = (): Errors => {
    const e: Errors = {};
    if (!form.first_name.trim()) e.first_name = 'First name is required';
    if (!form.username.trim()) e.username = 'Username is required';
    else if (form.username.trim().length < 3) e.username = 'Minimum 3 characters';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email';
    if (!isEdit) {
      if (!form.password) e.password = 'Password is required';
      else if (form.password.length < 8) e.password = 'Minimum 8 characters';
    } else if (form.password && form.password.length < 8) {
      e.password = 'Minimum 8 characters';
    }
    if (form.password && form.password !== form.confirm_password) {
      e.confirm_password = 'Passwords do not match';
    }
    if (usernameStatus === 'taken') e.username = 'Username already taken';
    if (emailStatus === 'taken') e.email = 'Email already in use';
    return e;
  };

  const scrollToFirstError = (clientErrors: Errors) => {
    const firstErrorField = FIELD_ORDER.find(f => clientErrors[f]);
    if (!firstErrorField) return;
    const y = fieldYPositions.current[firstErrorField];
    if (y !== undefined) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
      }, 80);
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    const clientErrors = validate();

    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      scrollToFirstError(clientErrors);
      showModal('error', 'Fields Need Attention', 'Some required fields are missing or incorrect. Please fix the highlighted fields and try again.');
      return;
    }

    setErrors({});
    const result = await onSubmit(form);

    if (result.ok) {
      showModal(
        'success',
        isEdit ? 'Changes Saved!' : 'User Created!',
        isEdit
          ? 'The user profile has been updated successfully.'
          : 'The new user account has been set up successfully.',
        true,
      );
    } else {
      if (result.errors) {
        setErrors(result.errors);
        scrollToFirstError(result.errors);
      }
      showModal(
        'error',
        'Submission Failed',
        result.message || 'Something went wrong. Please check the form and try again.',
      );
    }
  };

  const projectAccess = getProjectAccess(form.app_permissions);

  // Switching INTO Full Access defaults every milestone to checked (so a
  // newly full-access user isn't silently restricted by an empty
  // selection) — only on the switch itself, never on initial load, so an
  // existing legacy full-access user with genuinely zero granular grants
  // still shows their real 0/9 state rather than a fake reset.
  const handleProjectAccessChange = (access: ProjectAccess) => {
    const wasFull = projectAccess === 'full';
    setForm(prev => ({
      ...prev,
      app_permissions: setProjectAccess(prev.app_permissions, access),
      milestone_perms: (!wasFull && access === 'full')
        ? milestoneCatalog.map(m => m.id)
        : prev.milestone_perms,
    }));
  };

  const avatarLetter = isEdit
    ? (initialData?.first_name?.[0] || initialData?.username?.[0] || 'U').toUpperCase()
    : null;

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  return (
    <View style={{ flex: 1, backgroundColor: THEME.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />

      <FeedbackModal
        visible={feedbackModal.visible}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        autoDismiss={feedbackModal.autoDismiss}
        onClose={closeModal}
      />
      <ProjectPickerModal
        visible={showProjectPicker}
        current={projectAccess}
        onSelect={handleProjectAccessChange}
        onClose={() => setShowProjectPicker(false)}
      />

      <SafeAreaView style={styles.root} edges={['top']}>
        {/* ── Compact Header ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            {avatarLetter ? (
              <View style={styles.topAvatar}>
                <Text style={styles.topAvatarText}>{avatarLetter}</Text>
              </View>
            ) : (
              <View style={styles.topIconCircle}>
                <MaterialCommunityIcons name="account-plus-outline" size={20} color={THEME.primary} />
              </View>
            )}
            <Text style={styles.topTitle}>{pageTitle}</Text>
            <Text style={styles.topSub}>{pageSubtitle}</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        {errors.general && (
          <View style={styles.errorBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={THEME.danger} />
            <Text style={styles.errorBannerText}>{errors.general}</Text>
          </View>
        )}

        <KeyboardAvoidingView
  style={[styles.keyboardWrap, { backgroundColor: THEME.bg, marginTop: -24 ,paddingTop: 29}]}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: 6 + insets.bottom,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <SectionLabel icon="account-outline" title="Personal Information" />
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Field
                  fieldKey="first_name"
                  onFieldLayout={handleFieldLayout}
                  label="First Name"
                  value={form.first_name}
                  onChangeText={set('first_name')}
                  placeholder="John"
                  icon="account-outline"
                  error={errors.first_name}
                  required
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  fieldKey="last_name"
                  onFieldLayout={handleFieldLayout}
                  label="Last Name"
                  value={form.last_name}
                  onChangeText={set('last_name')}
                  placeholder="Doe"
                  icon="account-outline"
                  error={errors.last_name}
                />
              </View>
            </View>

            <Field
              fieldKey="email"
              onFieldLayout={handleFieldLayout}
              label="Email Address"
              value={form.email}
              onChangeText={onEmailChange}
              placeholder="john@company.com"
              icon="email-outline"
              error={errors.email}
              required
              keyboardType="email-address"
              autoCapitalize="none"
              rightElement={<UniqueIndicator status={emailStatus} />}
            />

            <Field
              fieldKey="username"
              onFieldLayout={handleFieldLayout}
              label="Username"
              value={form.username}
              onChangeText={onUsernameChange}
              placeholder="johndoe"
              icon="at"
              error={errors.username}
              required
              autoCapitalize="none"
              rightElement={<UniqueIndicator status={usernameStatus} />}
            />

            <SectionLabel icon="lock-outline" title={isEdit ? 'Change Password' : 'Security'} />
            {isEdit && (
              <View style={styles.infoNote}>
                <MaterialCommunityIcons name="information-outline" size={13} color={THEME.info} />
                <Text style={styles.infoNoteText}>Leave blank to keep current password</Text>
              </View>
            )}

            <View style={styles.fullWidthField}>
              <Field
                fieldKey="password"
                onFieldLayout={handleFieldLayout}
                label={isEdit ? 'New Password' : 'Password'}
                value={form.password}
                onChangeText={set('password')}
                placeholder="••••••••"
                icon="lock-outline"
                error={errors.password}
                required={!isEdit}
                secureTextEntry={!showPass}
                rightElement={
                  <TouchableOpacity onPress={() => setShowPass(p => !p)} style={{ paddingHorizontal: 10 }}>
                    <MaterialCommunityIcons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={16} color={THEME.muted} />
                  </TouchableOpacity>
                }
              />
              <PasswordStrength password={form.password} />
            </View>

            <View style={styles.fullWidthField}>
              <Field
                fieldKey="confirm_password"
                onFieldLayout={handleFieldLayout}
                label="Confirm Password"
                value={form.confirm_password}
                onChangeText={set('confirm_password')}
                placeholder="••••••••"
                icon="lock-check-outline"
                error={errors.confirm_password}
                required={!isEdit}
                secureTextEntry={!showConfirm}
                rightElement={
                  <TouchableOpacity onPress={() => setShowConfirm(p => !p)} style={{ paddingHorizontal: 10 }}>
                    <MaterialCommunityIcons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={16} color={THEME.muted} />
                  </TouchableOpacity>
                }
              />
            </View>

            <SectionLabel icon="shield-half-full" title="Access & Permissions" />
            <View style={styles.toggleCard}>
              <ToggleItem icon="account-check-outline" iconColor={THEME.success} iconBg={THEME.successLight}
                label="Active Account" desc="User can sign in" value={form.is_active} onValueChange={set('is_active')} />
              <View style={styles.sep} />
              <ToggleItem icon="shield-account-outline" iconColor={THEME.warning} iconBg={THEME.warningLight}
                label="Staff Access" desc="Access to admin features" value={form.is_staff} onValueChange={set('is_staff')} />
              <View style={styles.sep} />
              <ToggleItem icon="office-building-outline" iconColor={THEME.info} iconBg={THEME.infoLight}
                label="Head Office" desc="Head office privileges" value={form.is_head} onValueChange={set('is_head')} />
              <View style={styles.sep} />
              <ToggleItem icon="wrench-outline" iconColor={THEME.primary} iconBg={THEME.primaryLight}
                label="Technician" desc="Assigned to service jobs" value={form.is_technician} onValueChange={set('is_technician')} />
            </View>

            <SectionLabel icon="apps" title="Assign App Access" />
            <View style={styles.appsGrid}>
              {TOGGLE_APPS.map(app => (
                <AppCard
                  key={app.id}
                  app={app}
                  selected={form.app_permissions.includes(app.id)}
                  onPress={() => toggleApp(app.id)}
                />
              ))}
              <ProjectCard
                access={projectAccess}
                onPress={() => setShowProjectPicker(true)}
              />
            </View>

            {projectAccess === 'full' && milestoneCatalog.length > 0 && (
              <>
                <SectionLabel icon="flag-checkered" title="Milestone Access" />
                <View style={msStyles.card}>
                  <View style={msStyles.headerRow}>
                    <Text style={msStyles.headerText}>
                      {form.milestone_perms.length} / {milestoneCatalog.length} editable
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <TouchableOpacity onPress={() => set('milestone_perms')(milestoneCatalog.map(m => m.id))}>
                        <Text style={msStyles.quickLink}>All</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => set('milestone_perms')([])}>
                        <Text style={msStyles.quickLink}>None</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={msStyles.grid}>
                    {milestoneCatalog.map(m => (
                      <MilestoneChip
                        key={m.id}
                        label={m.name}
                        selected={form.milestone_perms.includes(m.id)}
                        onPress={() => toggleMilestone(m.id)}
                      />
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          {/* Fixed Footer (pinned at bottom) */}
          <View style={[styles.fixedFooter, { paddingBottom: insets.bottom }]}>
            <View style={styles.submitRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <MaterialCommunityIcons
                      name={isEdit ? 'content-save-outline' : 'account-plus-outline'}
                      size={16}
                      color="#FFF"
                    />
                    <Text style={styles.submitText}>{submitLabel}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
 root: { flex: 1, backgroundColor: 'transparent' },
 topBar: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 34,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarCenter: { flex: 1, alignItems: 'center', gap: 4 },
  topAvatar: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
  },
  topAvatarText: { fontSize: 20, fontWeight: '800', color: THEME.primary },
  topIconCircle: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6,
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: THEME.dangerLight, borderLeftWidth: 3, borderLeftColor: THEME.danger,
    marginHorizontal: 16, marginTop: 10, padding: 10, borderRadius: 8,
  },
  errorBannerText: { fontSize: 12, color: THEME.danger, flex: 1 },
  keyboardWrap: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 20 },
  row: { flexDirection: 'row', gap: 12 },
  fullWidthField: { marginBottom: 14 },
  infoNote: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: THEME.infoLight, padding: 9, borderRadius: 10, marginBottom: 12,
  },
  infoNoteText: { fontSize: 11, color: THEME.info, flex: 1 },
  toggleCard: {
    backgroundColor: '#FFF', borderRadius: 12, borderWidth: 1,
    borderColor: THEME.border, paddingHorizontal: 12, marginBottom: 18, elevation: 1,
  },
  sep: { height: 1, backgroundColor: THEME.border },
  appsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },

  // Fixed footer
  fixedFooter: {
    paddingHorizontal: 16,
    paddingTop: 6,
    backgroundColor: THEME.bg,
    borderTopWidth: 1,
    borderTopColor: THEME.borderLight,
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
  cancelText: { fontSize: 14, fontWeight: '700', color: THEME.textSecondary },
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