import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Pressable,
  StatusBar,
  Dimensions,
  Keyboard,
  FlatList,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const T = {
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

// ─── FeedbackModal ─────────────────────────────────────────────────
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
      iconBg: T.successLt,
      iconColor: T.success,
      icon: 'check-circle',
      btnColor: T.success,
      bar: T.success,
    },
    error: {
      iconBg: T.dangerLt,
      iconColor: T.danger,
      icon: 'close-circle',
      btnColor: T.danger,
      bar: T.danger,
    },
    info: {
      iconBg: T.infoLt,
      iconColor: T.info,
      icon: 'information',
      btnColor: T.info,
      bar: T.info,
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
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
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
  btnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dismissRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  dismissText: { fontSize: 14, fontWeight: '600' },
});

// ─── Types ─────────────────────────────────────────────────────────
interface ManageItem {
  id: number | string;
  name: string;
  icon?: string;
  color?: string;
  description?: string; // kept for future use but not displayed
}

interface Props {
  navigation: any;
  route: { params?: { lead?: any; onSuccess?: () => void } };
}
interface Errors {
  customerName?: string;
  mobile?: string;
  product?: string;
  leadSource?: string;
  quality?: string;
  status?: string;
  general?: string;
}

// ─── Helper for dynamic quality styling ────────────────────────────
const DEFAULT_QUALITY_COLOR = '#6B7280';
const DEFAULT_QUALITY_ICON = 'label-outline';

const getDynamicStyle = (item?: ManageItem | null) => {
  const color = item?.color || DEFAULT_QUALITY_COLOR;
  const icon = item?.icon || DEFAULT_QUALITY_ICON;
  const bg = color + '1A'; // 10% opacity hex
  return { color, icon, bg };
};

// ─── FieldWrap (supports onLayout for scroll-to-error) ─────────────
const FieldWrap = ({ label, required, children, onLayout }: any) => (
  <View style={fs.fieldWrap} onLayout={onLayout}>
    <Text style={fs.fieldLabel}>
      {label}
      {required && <Text style={{ color: T.danger }}> *</Text>}
    </Text>
    {children}
  </View>
);

// ─── StyledInput (now supports error highlighting) ─────────────────
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
      placeholderTextColor={T.mutedLt}
      keyboardType={keyboardType}
      multiline={multiline}
      numberOfLines={numberOfLines}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={[
        fs.input,
        multiline && fs.inputMulti,
        focused && !error && fs.inputFocused,
        error && { borderColor: T.danger, backgroundColor: T.dangerLt },
      ]}
    />
  );
};

// ─── SelectorBtn (now supports error highlighting) ─────────────────
const SelectorBtn = ({
  value,
  onPress,
  icon,
  placeholder,
  error,
}: {
  value?: string;
  onPress: () => void;
  icon?: string;
  placeholder: string;
  error?: boolean;
}) => (
  <TouchableOpacity
    style={[fs.selectorBtn, error && { borderColor: T.danger, backgroundColor: T.dangerLt }]}
    onPress={onPress}
    activeOpacity={0.75}
  >
    <View style={fs.selectorLeft}>
      {icon ? (
        <MaterialCommunityIcons
          name={icon as any}
          size={16}
          color={value ? T.primary : T.mutedLt}
        />
      ) : null}
      <Text
        style={[fs.selectorText, !value && fs.selectorPlaceholder]}
        numberOfLines={1}
      >
        {value || placeholder}
      </Text>
    </View>
    <MaterialCommunityIcons name="chevron-down" size={18} color={T.muted} />
  </TouchableOpacity>
);

// ─── SectionHeader ─────────────────────────────────────────────────
const SectionHeader = ({ icon, label }: { icon: string; label: string }) => (
  <View style={fs.sectionHeader}>
    <View style={fs.sectionLeft}>
      <View style={fs.sectionIconBox}>
        <MaterialCommunityIcons name={icon as any} size={14} color={T.primary} />
      </View>
      <Text style={fs.sectionTitle}>{label}</Text>
    </View>
    <View style={fs.sectionLine} />
  </View>
);

// ─── Toast ─────────────────────────────────────────────────────────
const Toast = ({ msg, type }: { msg: string; type: 'success' | 'error' }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.delay(2000),
      Animated.timing(anim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[
        mms.toast,
        type === 'success' ? mms.toastSuccess : mms.toastError,
        {
          opacity: anim,
          transform: [
            {
              scale: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.85, 1],
              }),
            },
          ],
        },
      ]}
    >
      <View
        style={[
          mms.toastIconBox,
          type === 'success' ? mms.toastIconSuccess : mms.toastIconError,
        ]}
      >
        <MaterialCommunityIcons
          name={type === 'success' ? 'check' : 'close'}
          size={13}
          color="#FFF"
        />
      </View>
      <Text style={[mms.toastText, type === 'error' && { color: '#B91C1C' }]}>
        {msg}
      </Text>
    </Animated.View>
  );
};

// ─── DeleteConfirmModal ────────────────────────────────────────────
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
    <View style={mms.delRoot}>
      <View style={mms.delBox}>
        <View style={mms.delIconWrap}>
          <MaterialCommunityIcons
            name="trash-can-outline"
            size={28}
            color={T.danger}
          />
        </View>
        <Text style={mms.delTitle}>Delete Item?</Text>
        <Text style={mms.delSub}>
          <Text style={{ fontWeight: '700', color: T.text }}>"{itemName}"</Text>{' '}
          will be permanently removed.
        </Text>
        <View style={mms.delBtns}>
          <TouchableOpacity
            style={mms.delCancelBtn}
            onPress={onCancel}
            activeOpacity={0.8}
          >
            <Text style={mms.delCancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[mms.delConfirmBtn, loading && { opacity: 0.6 }]}
            onPress={onConfirm}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={mms.delConfirmText}>Yes, Delete</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// ─── PickerModal ────────────────────────────────────────────────────
const PickerModal = ({
  visible,
  onClose,
  title,
  items,
  selectedId,
  onSelect,
  onManage,
  manageLabel,
  onRefresh,
  refreshing,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  items: ManageItem[];
  selectedId: any;
  onSelect: (item: ManageItem) => void;
  onManage?: () => void;
  manageLabel?: string;
  onRefresh?: () => void;
  refreshing?: boolean;
}) => {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
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

  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [refreshing, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
                borderBottomColor: T.border,
              }}
            >
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: T.text }}>
                  {title}
                </Text>
                <Text style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
                  {items.length} option{items.length !== 1 ? 's' : ''} available
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {onManage && (
                  <TouchableOpacity
                    onPress={onManage}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: T.primaryLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: T.primary + '22',
                    }}
                    activeOpacity={0.75}
                  >
                    <MaterialCommunityIcons
                      name="cog-outline"
                      size={17}
                      color={T.primary}
                    />
                  </TouchableOpacity>
                )}

                {onRefresh && (
                  <TouchableOpacity
                    onPress={onRefresh}
                    disabled={refreshing}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: T.primaryLight,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                    activeOpacity={0.75}
                  >
                    <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <MaterialCommunityIcons
                        name="refresh"
                        size={16}
                        color={refreshing ? T.mutedLt : T.primary}
                      />
                    </Animated.View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={onClose}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: T.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: 1,
                    borderColor: T.border,
                  }}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons name="close" size={18} color={T.muted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Search */}
            <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 8,
                  backgroundColor: T.bg,
                  borderRadius: 10,
                  borderWidth: 1.5,
                  borderColor: T.border,
                  paddingHorizontal: 12,
                  height: 42,
                }}
              >
                <MaterialCommunityIcons name="magnify" size={16} color={T.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder="Search..."
                  placeholderTextColor={T.mutedLt}
                  style={{ flex: 1, fontSize: 14, color: T.text, paddingVertical: 0 }}
                  autoCorrect={false}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch('')} activeOpacity={0.7}>
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={16}
                      color={T.mutedLt}
                    />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Refreshing banner */}
            {refreshing && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 6 }}>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    paddingHorizontal: 12,
                    paddingVertical: 7,
                    backgroundColor: T.primarySoft,
                    borderRadius: 8,
                  }}
                >
                  <ActivityIndicator size="small" color={T.primary} />
                  <Text style={{ fontSize: 12, color: T.primary, fontWeight: '600' }}>
                    Refreshing list…
                  </Text>
                </View>
              </View>
            )}

            <View style={{ height: 1, backgroundColor: T.border }} />

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
                      color={T.mutedLt}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: T.muted,
                        marginTop: 10,
                        fontWeight: '700',
                      }}
                    >
                      {search ? 'No results found' : 'No items yet'}
                    </Text>
                    <Text style={{ fontSize: 12, color: T.mutedLt, marginTop: 4 }}>
                      {search ? 'Try a different keyword' : onManage ? 'Add one using the gear icon above' : ''}
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
                        backgroundColor: isSelected ? T.primaryLight : T.bg,
                        borderWidth: isSelected ? 1.5 : 0.5,
                        borderColor: isSelected ? T.primary + '55' : T.border,
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
                          color: isSelected ? T.primary : T.text,
                        }}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      {isSelected ? (
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={20}
                          color={T.primary}
                        />
                      ) : (
                        <View
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            borderWidth: 1.5,
                            borderColor: T.border,
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
                borderTopColor: T.border,
              }}
            >
              <Text style={{ fontSize: 11, color: T.mutedLt }}>
                Tap outside to dismiss
              </Text>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

// ─── QualityPickerModal (dynamic, no description) ──────────────────
const QualityPickerModal = ({
  visible,
  onClose,
  items,
  selectedId,
  onSelect,
  onManage,
  onRefresh,
  refreshing,
}: {
  visible: boolean;
  onClose: () => void;
  items: ManageItem[];
  selectedId: any;
  onSelect: (item: ManageItem) => void;
  onManage?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 60,
        friction: 12,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 240,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  useEffect(() => {
    if (refreshing) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [refreshing, spinAnim]);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'flex-end',
          backgroundColor: 'rgba(0,0,0,0.5)',
        }}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <Animated.View
          style={{
            backgroundColor: '#FFF',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            paddingBottom: 28,
            maxHeight: SCREEN_HEIGHT * 0.78,
            transform: [{ translateY: slideAnim }],
          }}
        >
          {/* Handle */}
          <View
            style={{
              width: 38,
              height: 4,
              borderRadius: 2,
              backgroundColor: '#E2E8F0',
              alignSelf: 'center',
              marginTop: 12,
            }}
          />

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 18,
              paddingTop: 14,
              paddingBottom: 10,
              borderBottomWidth: 1,
              borderBottomColor: T.border,
            }}
          >
            <View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: T.text }}>
                Lead quality
              </Text>
              <Text style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>
                How promising is this lead?
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {onRefresh && (
                <TouchableOpacity
                  onPress={onRefresh}
                  disabled={refreshing}
                  style={{
                    backgroundColor: T.primaryLight,
                    padding: 7,
                    borderRadius: 20,
                  }}
                >
                  <Animated.View style={{ transform: [{ rotate: spin }] }}>
                    <MaterialCommunityIcons
                      name="refresh"
                      size={14}
                      color={refreshing ? T.mutedLt : T.primary}
                    />
                  </Animated.View>
                </TouchableOpacity>
              )}
              {onManage && (
                <TouchableOpacity
                  onPress={onManage}
                  style={{
                    backgroundColor: T.primaryLight,
                    paddingHorizontal: 11,
                    paddingVertical: 6,
                    borderRadius: 20,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <MaterialCommunityIcons
                    name="cog-outline"
                    size={13}
                    color={T.primary}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: '700',
                      color: T.primary,
                    }}
                  >
                    Manage
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  backgroundColor: T.bg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={18}
                  color={T.muted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {refreshing && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingHorizontal: 18,
                paddingVertical: 8,
                backgroundColor: T.primarySoft,
              }}
            >
              <ActivityIndicator size="small" color={T.primary} />
              <Text
                style={{ fontSize: 12, color: T.primary, fontWeight: '600' }}
              >
                Refreshing list…
              </Text>
            </View>
          )}

          {/* List */}
          <ScrollView
            style={{ paddingHorizontal: 14, paddingTop: 10 }}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {items.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                <MaterialCommunityIcons
                  name="inbox-outline"
                  size={36}
                  color={T.mutedLt}
                />
                <Text style={{ fontSize: 14, color: T.muted, marginTop: 8 }}>
                  No quality options yet
                </Text>
                <Text style={{ fontSize: 12, color: T.mutedLt, marginTop: 4 }}>
                  Add one using Manage above
                </Text>
              </View>
            ) : (
              items.map((item) => {
                const isSelected = String(item.id) === String(selectedId);
                const { color, icon, bg } = getDynamicStyle(item);
                return (
                  <TouchableOpacity
                    key={String(item.id)}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 12,
                      padding: 13,
                      borderRadius: 12,
                      marginBottom: 8,
                      backgroundColor: isSelected ? bg : '#FFF',
                      borderWidth: isSelected ? 1.5 : 0.5,
                      borderColor: isSelected ? color + '66' : T.border,
                    }}
                  >
                    {/* Icon box */}
                    <View
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 11,
                        backgroundColor: isSelected ? color + '22' : bg,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MaterialCommunityIcons
                        name={icon as any}
                        size={18}
                        color={isSelected ? color : color}
                      />
                    </View>

                    {/* Text – no description */}
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: isSelected ? color : T.text,
                        }}
                      >
                        {item.name}
                      </Text>
                    </View>

                    {/* Radio */}
                    <View
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 10,
                        backgroundColor: isSelected ? color : 'transparent',
                        borderWidth: isSelected ? 0 : 1.5,
                        borderColor: T.border,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isSelected && (
                        <MaterialCommunityIcons
                          name="check"
                          size={12}
                          color="#FFF"
                        />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
            <View style={{ height: 12 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── ManageModal (unchanged) ──────────────────────────────────────
// ─── ManageModal (centered dialog, icon-only edit/delete) ─────────
const ManageModal = ({
  visible,
  onClose,
  title,
  configType,
  selectedId,
  onItemDeleted,
  onItemUpdated,
  onListChanged,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  configType: 'product' | 'source' | 'status' | 'quality';
  selectedId?: any;
  onItemDeleted?: (id: any) => void;
  onItemUpdated?: (id: any, newName: string) => void;
  onListChanged?: () => void;
}) => {
  const { apiRequest } = useAuthApi();
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  const [items, setItems] = useState<ManageItem[]>([]);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState<any>(null);
  const [editName, setEditName] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManageItem | null>(null);
  const [toast, setToast] = useState<{
    msg: string;
    type: 'success' | 'error';
    key: number;
  } | null>(null);

  const getUrlSegment = (): string => {
    switch (configType) {
      case 'product': return 'products';
      case 'source': return 'sources';
      case 'status': return 'status';
      case 'quality': return 'qualities';
      default: return '';
    }
  };

  const baseUrl = `${API_BASE_URL}/lead/api/config/${getUrlSegment()}`;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 65,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
      fetchItems();
    } else {
      setNewName('');
      setEditId(null);
      setEditName('');
      setToast(null);
      setDeleteTarget(null);
    }
  }, [visible]);

  const fetchItems = async () => {
    try {
      const res = await apiRequest(`${baseUrl}/`);
      if (res.ok) {
        const d = await res.json();
        setItems(d.items || []);
      }
    } catch {}
  };

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type, key: Date.now() });
    setTimeout(() => setToast(null), 2800);
  };

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    setAddLoading(true);
    try {
      const res = await apiRequest(`${baseUrl}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const d = await res.json();
      if (res.ok || res.status === 201) {
        setItems(prev => [...prev, d]);
        setNewName('');
        showToast('Added successfully');
        onListChanged?.();
      } else {
        showToast(d.error || 'Failed to add', 'error');
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleEdit = async (item: ManageItem) => {
    const name = editName.trim();
    if (!name) return;
    setEditLoading(true);
    try {
      const res = await apiRequest(`${baseUrl}/${item.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const d = await res.json();
      if (res.ok) {
        setItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, name: d.name } : i)),
        );
        setEditId(null);
        setEditName('');
        showToast('Updated successfully');
        onItemUpdated?.(item.id, d.name);
        onListChanged?.();
      } else {
        showToast(d.error || 'Failed to update', 'error');
      }
    } catch {
      showToast('Something went wrong', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await apiRequest(`${baseUrl}/${deleteTarget.id}/`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        setItems(prev => prev.filter(i => i.id !== deleteTarget.id));
        onItemDeleted?.(deleteTarget.id);
        setDeleteTarget(null);
        showToast('Deleted successfully');
        onListChanged?.();
      } else {
        const d = await res.json().catch(() => ({}));
        setDeleteTarget(null);
        showToast(d.error || 'Failed to delete', 'error');
      }
    } catch {
      setDeleteTarget(null);
      showToast('Something went wrong', 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
  <>
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={mms.overlay}>
        {/* Backdrop pressable – positioned absolutely so it always covers the screen */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        {/* Dialog as a sibling, not a child of the pressable */}
        <Animated.View
          style={[
            mms.dialog,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Header */}
          <View style={mms.header}>
            <View style={mms.headerLeft}>
              <View style={mms.headerIconBox}>
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={14}
                  color={T.primary}
                />
              </View>
              <Text style={mms.headerTitle}>{title}</Text>
            </View>
            <TouchableOpacity style={mms.closeBtn} onPress={onClose} activeOpacity={0.75}>
              <MaterialCommunityIcons name="close" size={16} color={T.muted} />
            </TouchableOpacity>
          </View>

          {/* Toast */}
          {toast && <Toast key={toast.key} msg={toast.msg} type={toast.type} />}

          {/* Add row */}
          <View style={mms.addRow}>
            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder={`Add new ${configType}…`}
              placeholderTextColor={T.mutedLt}
              style={mms.addInput}
              returnKeyType="done"
              onSubmitEditing={handleAdd}
            />
            <TouchableOpacity
              style={[mms.addBtn, (!newName.trim() || addLoading) && mms.addBtnDisabled]}
              onPress={handleAdd}
              disabled={!newName.trim() || addLoading}
              activeOpacity={0.85}
            >
              {addLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <MaterialCommunityIcons name="plus" size={18} color="#FFF" />
              )}
            </TouchableOpacity>
          </View>

          <View style={{ height: 1, backgroundColor: T.border }} />

          {/* List */}
          <View style={{ height: SCREEN_HEIGHT * 0.38 }}>
            <FlatList
              data={items}
              keyExtractor={i => String(i.id)}
              style={{ flex: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              bounces={false}
              contentContainerStyle={mms.listContent}
              ListEmptyComponent={
                <View style={mms.emptyWrap}>
                  <MaterialCommunityIcons name="inbox-outline" size={32} color={T.mutedLt} />
                  <Text style={mms.emptyText}>No items yet</Text>
                  <Text style={mms.emptySubText}>Add one above to get started</Text>
                </View>
              }
              renderItem={({ item, index }) => {
                const isEditing = editId === item.id;
                return (
                  <View
                    style={[mms.itemRow, index > 0 && { marginTop: 6 }, isEditing && mms.itemRowEditing]}
                  >
                    {isEditing ? (
                      <View style={{ flex: 1, gap: 8 }}>
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 10,
                          backgroundColor: '#F8FAFC',
                          borderWidth: 1.5,
                          borderColor: T.border,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 2,
                        }}>
                          <MaterialCommunityIcons name="pencil-outline" size={16} color={T.muted} />
                          <TextInput
                            value={editName}
                            onChangeText={setEditName}
                            style={{
                              flex: 1,
                              fontSize: 14,
                              fontWeight: '600',
                              color: T.text,
                              paddingVertical: 10,
                            }}
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={() => handleEdit(item)}
                            placeholderTextColor={T.mutedLt}
                            placeholder="Enter name…"
                          />
                          {editName.trim().length > 0 && (
                            <TouchableOpacity onPress={() => setEditName('')} activeOpacity={0.7}>
                              <MaterialCommunityIcons name="close-circle" size={16} color={T.mutedLt} />
                            </TouchableOpacity>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <TouchableOpacity
                            onPress={() => { setEditId(null); setEditName(''); }}
                            activeOpacity={0.8}
                            style={{
                              flex: 1,
                              paddingVertical: 9,
                              borderRadius: 8,
                              backgroundColor: '#F1F5F9',
                              alignItems: 'center',
                              borderWidth: 1,
                              borderColor: T.border,
                            }}
                          >
                            <Text style={{ fontSize: 13, fontWeight: '600', color: T.textSub }}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => handleEdit(item)}
                            disabled={editLoading}
                            activeOpacity={0.85}
                            style={{
                              flex: 2,
                              paddingVertical: 9,
                              borderRadius: 8,
                              backgroundColor: T.primary,
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexDirection: 'row',
                              gap: 6,
                              opacity: editLoading ? 0.65 : 1,
                            }}
                          >
                            {editLoading ? (
                              <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                              <>
                                <MaterialCommunityIcons name="check" size={15} color="#FFF" />
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFF' }}>
                                  Save
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <>
                        <View style={mms.itemDot} />
                        <Text style={mms.itemName} numberOfLines={1}>{item.name}</Text>
                        <TouchableOpacity
                          style={mms.editIconBtn}
                          onPress={() => { setEditId(item.id); setEditName(item.name); }}
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons name="pencil-outline" size={16} color={T.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={mms.deleteIconBtn}
                          onPress={() => setDeleteTarget(item)}
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color={T.danger} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Footer hint */}
          <View style={mms.footer}>
            <Text style={mms.footerText}>Tap outside to dismiss</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>

    <DeleteConfirmModal
      visible={!!deleteTarget}
      itemName={deleteTarget?.name || ''}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={handleDelete}
      loading={deleteLoading}
    />
  </>
);
};

// ─── Main Screen ───────────────────────────────────────────────────
export default function AddEditLeadScreen({ navigation, route }: Props) {
  const { apiRequest } = useAuthApi();
  const insets = useSafeAreaInsets();
  const existingLead = route?.params?.lead;
  const isEdit = !!existingLead;

  const [customerName, setCustomerName] = useState(
    existingLead?.customer_name || '',
  );
  const [mobile, setMobile] = useState(existingLead?.mobile || '');
  const [place, setPlace] = useState(existingLead?.place || '');
  const [notes, setNotes] = useState(existingLead?.notes || '');

  const [followUpDate, setFollowUpDate] = useState<Date | null>(
    existingLead?.follow_up_date
      ? new Date(existingLead.follow_up_date)
      : null,
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState<Date | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<ManageItem | null>(
    existingLead?.product || null,
  );
  const [selectedSource, setSelectedSource] = useState<ManageItem | null>(
    existingLead?.lead_source || null,
  );
  const [selectedQuality, setSelectedQuality] = useState<ManageItem | null>(
    existingLead?.quality_fk || null,
  );
  const [selectedStatus, setSelectedStatus] = useState<ManageItem | null>(
    existingLead?.status_fk || null,
  );
  const [selectedAssignee, setSelectedAssignee] = useState<ManageItem | null>(
    existingLead?.assigned_to
      ? {
          id: existingLead.assigned_to.id,
          name:
            `${existingLead.assigned_to.first_name || ''} ${existingLead.assigned_to.last_name || ''}`.trim() ||
            existingLead.assigned_to.username,
        }
      : null,
  );

  const [products, setProducts] = useState<ManageItem[]>([]);
  const [sources, setSources] = useState<ManageItem[]>([]);
  const [qualities, setQualities] = useState<ManageItem[]>([]);
  const [statuses, setStatuses] = useState<ManageItem[]>([]);
  const [assignees, setAssignees] = useState<ManageItem[]>([]);

  const [refreshingProducts, setRefreshingProducts] = useState(false);
  const [refreshingSources, setRefreshingSources] = useState(false);
  const [refreshingQualities, setRefreshingQualities] = useState(false);
  const [refreshingStatuses, setRefreshingStatuses] = useState(false);

  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [showQualityPicker, setShowQualityPicker] = useState(false);
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [showAssigneePicker, setShowAssigneePicker] = useState(false);

  const [showManageProducts, setShowManageProducts] = useState(false);
  const [showManageSources, setShowManageSources] = useState(false);
  const [showManageStatus, setShowManageStatus] = useState(false);
  const [showManageQuality, setShowManageQuality] = useState(false);

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef<ScrollView>(null);

  // Store Y positions of fields for scroll-to-error
  const fieldPositions = useRef<{ [key: string]: number }>({});

  const handleFieldLayout = (fieldName: string, event: any) => {
    fieldPositions.current[fieldName] = event.nativeEvent.layout.y;
  };

  const [feedbackModal, setFeedbackModal] = useState<{
    visible: boolean;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
    autoDismiss: boolean;
  }>({ visible: false, type: 'error', title: '', message: '', autoDismiss: false });

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    fetchAll();
  }, []);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: false });
  }, [navigation]);

  const refreshProducts = useCallback(async () => {
    setRefreshingProducts(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/lead/api/config/products/`);
      if (res.ok) {
        const d = await res.json();
        setProducts(d.items || []);
      }
    } catch {} finally {
      setRefreshingProducts(false);
    }
  }, [apiRequest]);

  const refreshSources = useCallback(async () => {
    setRefreshingSources(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/lead/api/config/sources/`);
      if (res.ok) {
        const d = await res.json();
        setSources(d.items || []);
      }
    } catch {} finally {
      setRefreshingSources(false);
    }
  }, [apiRequest]);

  const refreshQualities = useCallback(async () => {
    setRefreshingQualities(true);
    try {
      const res = await apiRequest(
        `${API_BASE_URL}/lead/api/config/qualities/`,
      );
      if (res.ok) {
        const d = await res.json();
        setQualities(d.items || []);
      }
    } catch {} finally {
      setRefreshingQualities(false);
    }
  }, [apiRequest]);

  const refreshStatuses = useCallback(async () => {
    setRefreshingStatuses(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/lead/api/config/status/`);
      if (res.ok) {
        const d = await res.json();
        setStatuses(d.items || []);
      }
    } catch {} finally {
      setRefreshingStatuses(false);
    }
  }, [apiRequest]);

  const fetchAll = async () => {
    try {
      const [pRes, sRes, qRes, stRes, uRes] = await Promise.all([
        apiRequest(`${API_BASE_URL}/lead/api/config/products/`),
        apiRequest(`${API_BASE_URL}/lead/api/config/sources/`),
        apiRequest(`${API_BASE_URL}/lead/api/config/qualities/`),
        apiRequest(`${API_BASE_URL}/lead/api/config/status/`),
        apiRequest(`${API_BASE_URL}/lead/api/assignable-users/`),
      ]);
      if (pRes.ok) {
        const d = await pRes.json();
        setProducts(d.items || []);
      }
      if (sRes.ok) {
        const d = await sRes.json();
        setSources(d.items || []);
      }
      if (qRes.ok) {
        const d = await qRes.json();
        setQualities(d.items || []);
      }
      if (stRes.ok) {
        const d = await stRes.json();
        setStatuses(d.items || []);
      }
      if (uRes.ok) {
  const d = await uRes.json();
  // d is already an array, fallback handles any wrapping
  const users = (d.results || d.data || d);
  setAssignees(
    users.map((u: any) => ({
      id: u.id,
      name: u.name || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username,
    })),
  );
}
    } catch (e) {
      console.warn('fetchAll error', e);
    }
  };

  const formatDisplayDate = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };
  const formatDisplayTime = (date: Date | null) => {
    if (!date) return '';
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };
  const formatForAPI = (date: Date | null) => {
    if (!date) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const handleDateChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
      if (selected) {
        setPendingDate(selected);
        setShowTimePicker(true);
      }
    } else {
      if (selected) {
        const base = followUpDate || new Date();
        const merged = new Date(selected);
        merged.setHours(base.getHours(), base.getMinutes());
        setFollowUpDate(merged);
      }
    }
  };
  const handleTimeChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
      if (selected && pendingDate) {
        const merged = new Date(pendingDate);
        merged.setHours(selected.getHours(), selected.getMinutes());
        setFollowUpDate(merged);
        setPendingDate(null);
      }
    } else {
      if (selected) {
        const base = followUpDate || new Date();
        const merged = new Date(base);
        merged.setHours(selected.getHours(), selected.getMinutes());
        setFollowUpDate(merged);
      }
    }
  };
  const clearFollowUp = () => {
    setFollowUpDate(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
    setPendingDate(null);
  };

  const validate = () => {
    const e: Errors = {};
    if (!customerName.trim()) e.customerName = 'Customer name is required';
    if (!mobile.trim()) e.mobile = 'Mobile number is required';
    else if (!/^\+?[\d\s\-]{7,15}$/.test(mobile.trim()))
      e.mobile = 'Enter a valid mobile number';
    if (!selectedProduct) e.product = 'Product is required';
    if (!selectedSource) e.leadSource = 'Lead source is required';
    if (!selectedQuality) e.quality = 'Lead quality is required';
    if (!selectedStatus) e.status = 'Status is required';
    setErrors(e);

    const firstError = Object.keys(e)[0] as keyof Errors | undefined;
    if (firstError && fieldPositions.current[firstError] !== undefined) {
      scrollRef.current?.scrollTo({
        y: fieldPositions.current[firstError] - 20,
        animated: true,
      });
    }

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
      const payload = {
        customer_name: customerName.trim(),
        mobile: mobile.trim(),
        place: place.trim() || undefined,
        notes: notes.trim() || undefined,
        product: selectedProduct!.id,
        lead_source: selectedSource!.id,
        quality_fk: selectedQuality!.id,
        status_fk: selectedStatus!.id,
        assigned_to: selectedAssignee?.id || undefined,
        follow_up_date: followUpDate ? formatForAPI(followUpDate) : undefined,
      };
      const url = isEdit
        ? `${API_BASE_URL}/lead/api/leads_update/${existingLead.id}/`
        : `${API_BASE_URL}/lead/api/leads_create/`;
      const res = await apiRequest(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        route?.params?.onSuccess?.();
        setFeedbackModal({
          visible: true,
          type: 'success',
          title: isEdit ? 'Lead Updated!' : 'Lead Created!',
          message: isEdit
            ? 'The lead has been updated successfully.'
            : 'The new lead has been created successfully.',
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
            message: errData.error || 'Could not save lead',
            autoDismiss: false,
          });
        }
      }
    } catch {
      setFeedbackModal({
        visible: true,
        type: 'error',
        title: 'Unexpected Error',
        message: 'Something went wrong. Please try again.',
        autoDismiss: false,
      });
    } finally {
      setSaving(false);
    }
  };

  const closeFeedbackModal = () => {
    setFeedbackModal(prev => ({ ...prev, visible: false }));
    if (feedbackModal.type === 'success' && feedbackModal.autoDismiss) {
      route?.params?.onSuccess?.();
      navigation.goBack();
    }
  };
  const handleSuccessAutoClose = () => {
    setFeedbackModal(prev => ({ ...prev, visible: false }));
    route?.params?.onSuccess?.();
    navigation.goBack();
  };

  const selectedQualityStyle = getDynamicStyle(selectedQuality);

  const avatarLetter = isEdit
    ? (existingLead?.customer_name?.[0] || 'L').toUpperCase()
    : 'L';

  return (
    <View style={{ flex: 1 }}>
      <FeedbackModal
        visible={feedbackModal.visible}
        type={feedbackModal.type}
        title={feedbackModal.title}
        message={feedbackModal.message}
        autoDismiss={feedbackModal.autoDismiss}
        onClose={
          feedbackModal.autoDismiss ? handleSuccessAutoClose : closeFeedbackModal
        }
      />

      <SafeAreaView style={fs.root} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={T.primary} />

        <View style={fs.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={fs.backBtn}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={fs.topBarCenter}>
            <View style={fs.topAvatar}>
              <Text style={fs.topAvatarText}>{avatarLetter}</Text>
            </View>
            <Text style={fs.topTitle}>
              {isEdit ? 'Edit Lead' : 'New Lead'}
            </Text>
            <Text style={fs.topSub}>
              {isEdit
                ? `Editing: ${existingLead?.customer_name || 'Lead'}`
                : 'Fill in the details below'}
            </Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        {errors.general ? (
          <View style={fs.errorBanner}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={14}
              color={T.danger}
            />
            <Text style={fs.errorBannerText}>{errors.general}</Text>
          </View>
        ) : null}

        <KeyboardAvoidingView
          style={fs.keyboardWrap}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            ref={scrollRef}
            style={fs.scroll}
            contentContainerStyle={[
              fs.scrollContent,
              { paddingBottom: 80 + insets.bottom }, // extra space for fixed footer + safe area
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            bounces={false}
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              {/* ── Basic Information ── */}
              <View style={fs.card}>
                <SectionHeader icon="account-outline" label="Basic Information" />
                <FieldWrap
                  label="Customer Name"
                  required
                  onLayout={(e: any) => handleFieldLayout('customerName', e)}
                >
                  <StyledInput
                    value={customerName}
                    onChangeText={(v: string) => {
                      setCustomerName(v);
                      if (errors.customerName)
                        setErrors(e => ({ ...e, customerName: undefined }));
                    }}
                    placeholder="e.g. Vishnu K"
                    error={errors.customerName}
                  />
                  {errors.customerName ? (
                    <Text style={fs.errorText}>{errors.customerName}</Text>
                  ) : null}
                </FieldWrap>
                <FieldWrap
                  label="Mobile Number"
                  required
                  onLayout={(e: any) => handleFieldLayout('mobile', e)}
                >
                  <StyledInput
                    value={mobile}
                    onChangeText={(v: string) => {
                      setMobile(v);
                      if (errors.mobile)
                        setErrors(e => ({ ...e, mobile: undefined }));
                    }}
                    placeholder="+91 98765 43210"
                    keyboardType="phone-pad"
                    error={errors.mobile}
                  />
                  {errors.mobile ? (
                    <Text style={fs.errorText}>{errors.mobile}</Text>
                  ) : null}
                </FieldWrap>
                <FieldWrap label="Location / Place">
                  <StyledInput
                    value={place}
                    onChangeText={setPlace}
                    placeholder="City, Area, or Address"
                  />
                </FieldWrap>
              </View>

              {/* ── Product, Source & Quality ── */}
              <View style={fs.card}>
                <SectionHeader
                  icon="cube-outline"
                  label="Product, Source & Quality"
                />
                <FieldWrap
                  label="Interested Product"
                  required
                  onLayout={(e: any) => handleFieldLayout('product', e)}
                >
                  <SelectorBtn
                    value={selectedProduct?.name}
                    placeholder="Select Product"
                    icon="package-variant"
                    onPress={() => setShowProductPicker(true)}
                    error={!!errors.product}
                  />
                  {errors.product ? (
                    <Text style={fs.errorText}>{errors.product}</Text>
                  ) : null}
                </FieldWrap>
                <FieldWrap
                  label="Lead Source"
                  required
                  onLayout={(e: any) => handleFieldLayout('leadSource', e)}
                >
                  <SelectorBtn
                    value={selectedSource?.name}
                    placeholder="Select Source"
                    icon="source-branch"
                    onPress={() => setShowSourcePicker(true)}
                    error={!!errors.leadSource}
                  />
                  {errors.leadSource ? (
                    <Text style={fs.errorText}>{errors.leadSource}</Text>
                  ) : null}
                </FieldWrap>
                <FieldWrap
                  label="Lead Quality"
                  required
                  onLayout={(e: any) => handleFieldLayout('quality', e)}
                >
                  <TouchableOpacity
                    style={[
                      fs.qualitySelector,
                      selectedQuality && {
                        borderColor: selectedQualityStyle.color + '66',
                      },
                      errors.quality && { borderColor: T.danger, backgroundColor: T.dangerLt },
                    ]}
                    activeOpacity={0.75}
                    onPress={() => setShowQualityPicker(true)}
                  >
                    <View style={fs.qualitySelectorLeft}>
                      <View
                        style={[
                          fs.qualitySelectorIcon,
                          {
                            backgroundColor: selectedQuality
                              ? selectedQualityStyle.bg
                              : T.primaryLight,
                          },
                        ]}
                      >
                        <MaterialCommunityIcons
                          name={
                            (selectedQualityStyle.icon || 'label-outline') as any
                          }
                          size={15}
                          color={
                            selectedQuality
                              ? selectedQualityStyle.color
                              : T.primary
                          }
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            fs.qualitySelectorText,
                            !selectedQuality && fs.qualitySelectorPlaceholder,
                          ]}
                          numberOfLines={1}
                        >
                          {selectedQuality?.name || 'Select Quality'}
                        </Text>
                        {/* No description here */}
                      </View>
                    </View>
                    <MaterialCommunityIcons
                      name="chevron-down"
                      size={18}
                      color={T.muted}
                    />
                  </TouchableOpacity>
                  {errors.quality ? (
                    <Text style={fs.errorText}>{errors.quality}</Text>
                  ) : null}
                  {selectedQuality?.name && (
                    <View
                      style={[
                        fs.selectedQualitySummary,
                        { borderLeftColor: selectedQualityStyle.color },
                      ]}
                    >
                      <View
                        style={[
                          fs.selectedQualityDot,
                          { backgroundColor: selectedQualityStyle.color },
                        ]}
                      />
                      <Text
                        style={[
                          fs.selectedQualitySummaryText,
                          { color: selectedQualityStyle.color },
                        ]}
                      >
                        Selected: {selectedQuality.name}
                      </Text>
                    </View>
                  )}
                </FieldWrap>
              </View>

              {/* ── Status, Assignment & Follow-up ── */}
              <View style={fs.card}>
                <SectionHeader
                  icon="clipboard-check-outline"
                  label="Status, Assignment & Follow-up"
                />
                <FieldWrap
                  label="Initial Status"
                  required
                  onLayout={(e: any) => handleFieldLayout('status', e)}
                >
                  <SelectorBtn
                    value={selectedStatus?.name}
                    placeholder="Select Status"
                    icon="clipboard-check-outline"
                    onPress={() => setShowStatusPicker(true)}
                    error={!!errors.status}
                  />
                  {errors.status ? (
                    <Text style={fs.errorText}>{errors.status}</Text>
                  ) : null}
                </FieldWrap>
                <FieldWrap label="Assign To">
                  <SelectorBtn
                    value={selectedAssignee?.name}
                    placeholder="Unassigned"
                    icon="account-outline"
                    onPress={() => setShowAssigneePicker(true)}
                  />
                </FieldWrap>
                <FieldWrap label="Follow-up Date & Time">
                  <TouchableOpacity
                    style={[
                      fs.followUpField,
                      followUpDate && fs.followUpFieldActive,
                    ]}
                    onPress={() => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(true);
                      } else {
                        if (!followUpDate) setFollowUpDate(new Date());
                        setShowDatePicker(true);
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={fs.followUpLeft}>
                      <MaterialCommunityIcons
                        name="calendar-clock"
                        size={18}
                        color={followUpDate ? T.primary : T.mutedLt}
                      />
                      <View style={fs.followUpTextWrap}>
                        <Text
                          style={[
                            fs.followUpMainText,
                            !followUpDate && fs.followUpPlaceholder,
                          ]}
                        >
                          {followUpDate
                            ? formatDisplayDate(followUpDate)
                            : 'Select date and time'}
                        </Text>
                        <Text style={fs.followUpSubText}>
                          {followUpDate
                            ? formatDisplayTime(followUpDate)
                            : 'Tap to schedule follow-up'}
                        </Text>
                      </View>
                    </View>
                    <View style={fs.followUpRight}>
                      {followUpDate && (
                        <TouchableOpacity
                          onPress={clearFollowUp}
                          style={fs.clearDateBtn}
                          activeOpacity={0.75}
                        >
                          <MaterialCommunityIcons
                            name="close-circle"
                            size={18}
                            color={T.mutedLt}
                          />
                        </TouchableOpacity>
                      )}
                      <MaterialCommunityIcons
                        name="chevron-down"
                        size={18}
                        color={T.muted}
                      />
                    </View>
                  </TouchableOpacity>
                  {followUpDate && (
                    <View style={fs.dateTimeSummary}>
                      <MaterialCommunityIcons
                        name="check-circle-outline"
                        size={13}
                        color={T.primary}
                      />
                      <Text style={fs.dateTimeSummaryText}>
                        {formatDisplayDate(followUpDate)} at{' '}
                        {formatDisplayTime(followUpDate)}
                      </Text>
                    </View>
                  )}
                </FieldWrap>

                {Platform.OS === 'ios' && showDatePicker && (
                  <View style={fs.iosPickerWrap}>
                    <View style={fs.iosPickerHeader}>
                      <Text style={fs.iosPickerLabel}>Select Date</Text>
                      <TouchableOpacity
                        onPress={() => setShowDatePicker(false)}
                      >
                        <Text style={fs.iosPickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={followUpDate || new Date()}
                      mode="date"
                      display="spinner"
                      minimumDate={new Date()}
                      onChange={handleDateChange}
                      style={{ height: 180 }}
                    />
                  </View>
                )}
                {Platform.OS === 'ios' && showTimePicker && (
                  <View style={fs.iosPickerWrap}>
                    <View style={fs.iosPickerHeader}>
                      <Text style={fs.iosPickerLabel}>Select Time</Text>
                      <TouchableOpacity
                        onPress={() => setShowTimePicker(false)}
                      >
                        <Text style={fs.iosPickerDone}>Done</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={followUpDate || new Date()}
                      mode="time"
                      display="spinner"
                      onChange={handleTimeChange}
                      style={{ height: 180 }}
                    />
                  </View>
                )}
                {Platform.OS === 'android' && showDatePicker && (
                  <DateTimePicker
                    value={followUpDate || new Date()}
                    mode="date"
                    display="default"
                    minimumDate={new Date()}
                    onChange={handleDateChange}
                  />
                )}
                {Platform.OS === 'android' && showTimePicker && (
                  <DateTimePicker
                    value={pendingDate || followUpDate || new Date()}
                    mode="time"
                    display="default"
                    onChange={handleTimeChange}
                  />
                )}
              </View>

              {/* ── Notes ── */}
              <View style={fs.card}>
                <SectionHeader
                  icon="note-text-outline"
                  label="Notes / Requirements"
                />
                <StyledInput
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Enter specific client requirements or conversation details..."
                  multiline
                  numberOfLines={4}
                />
              </View>
            </Animated.View>
          </ScrollView>

          {/* Fixed footer with safe area padding */}
          <View style={[fs.fixedFooter, { paddingBottom: insets.bottom }]}>
            <View style={fs.submitRow}>
              <TouchableOpacity
                style={fs.cancelBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Text style={fs.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[fs.submitBtn, saving && fs.submitBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <MaterialCommunityIcons
                      name={
                        isEdit
                          ? 'content-save-outline'
                          : 'account-plus-outline'
                      }
                      size={16}
                      color="#FFF"
                    />
                    <Text style={fs.submitText}>
                      {isEdit ? 'Save Changes' : 'Create Lead'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>

        {/* ── Picker Modals ── */}
        <PickerModal
          visible={showProductPicker}
          onClose={() => setShowProductPicker(false)}
          title="Select Product"
          items={products}
          selectedId={selectedProduct?.id}
          onSelect={(item) => {
            setSelectedProduct(item);
            if (errors.product)
              setErrors(e => ({ ...e, product: undefined }));
          }}
          onManage={() => {
            setShowProductPicker(false);
            setShowManageProducts(true);
          }}
          manageLabel="Manage"
          onRefresh={refreshProducts}
          refreshing={refreshingProducts}
        />

        <PickerModal
          visible={showSourcePicker}
          onClose={() => setShowSourcePicker(false)}
          title="Select Lead Source"
          items={sources}
          selectedId={selectedSource?.id}
          onSelect={(item) => {
            setSelectedSource(item);
            if (errors.leadSource)
              setErrors(e => ({ ...e, leadSource: undefined }));
          }}
          onManage={() => {
            setShowSourcePicker(false);
            setShowManageSources(true);
          }}
          manageLabel="Manage"
          onRefresh={refreshSources}
          refreshing={refreshingSources}
        />

        <PickerModal
  visible={showQualityPicker}
  onClose={() => setShowQualityPicker(false)}
  title="Select Lead Quality"
  items={qualities}
  selectedId={selectedQuality?.id}
  onSelect={(item) => {
    setSelectedQuality(item);
    if (errors.quality)
      setErrors(e => ({ ...e, quality: undefined }));
  }}
  onManage={() => {
    setShowQualityPicker(false);
    setShowManageQuality(true);
  }}
  manageLabel="Manage"
  onRefresh={refreshQualities}
  refreshing={refreshingQualities}
/>

        <PickerModal
          visible={showStatusPicker}
          onClose={() => setShowStatusPicker(false)}
          title="Select Status"
          items={statuses}
          selectedId={selectedStatus?.id}
          onSelect={(item) => {
            setSelectedStatus(item);
            if (errors.status)
              setErrors(e => ({ ...e, status: undefined }));
          }}
          onManage={() => {
            setShowStatusPicker(false);
            setShowManageStatus(true);
          }}
          manageLabel="Manage"
          onRefresh={refreshStatuses}
          refreshing={refreshingStatuses}
        />

        <PickerModal
          visible={showAssigneePicker}
          onClose={() => setShowAssigneePicker(false)}
          title="Assign To"
          items={assignees}
          selectedId={selectedAssignee?.id}
          onSelect={setSelectedAssignee}
        />

        {/* ── Manage Modals ── */}
        <ManageModal
          visible={showManageProducts}
          onClose={() => setShowManageProducts(false)}
          title="Manage Products"
          configType="product"
          selectedId={selectedProduct?.id}
          onItemDeleted={(id) => {
            if (selectedProduct?.id === id) setSelectedProduct(null);
          }}
          onItemUpdated={(id, name) => {
            if (selectedProduct?.id === id)
              setSelectedProduct(prev =>
                prev ? { ...prev, name } : prev,
              );
          }}
          onListChanged={refreshProducts}
        />

        <ManageModal
          visible={showManageSources}
          onClose={() => setShowManageSources(false)}
          title="Manage Lead Sources"
          configType="source"
          selectedId={selectedSource?.id}
          onItemDeleted={(id) => {
            if (selectedSource?.id === id) setSelectedSource(null);
          }}
          onItemUpdated={(id, name) => {
            if (selectedSource?.id === id)
              setSelectedSource(prev =>
                prev ? { ...prev, name } : prev,
              );
          }}
          onListChanged={refreshSources}
        />

        <ManageModal
          visible={showManageQuality}
          onClose={() => setShowManageQuality(false)}
          title="Manage Qualities"
          configType="quality"
          selectedId={selectedQuality?.id}
          onItemDeleted={(id) => {
            if (selectedQuality?.id === id) setSelectedQuality(null);
          }}
          onItemUpdated={(id, name) => {
            if (selectedQuality?.id === id)
              setSelectedQuality(prev =>
                prev ? { ...prev, name } : prev,
              );
          }}
          onListChanged={refreshQualities}
        />

        <ManageModal
          visible={showManageStatus}
          onClose={() => setShowManageStatus(false)}
          title="Manage Statuses"
          configType="status"
          selectedId={selectedStatus?.id}
          onItemDeleted={(id) => {
            if (selectedStatus?.id === id) setSelectedStatus(null);
          }}
          onItemUpdated={(id, name) => {
            if (selectedStatus?.id === id)
              setSelectedStatus(prev =>
                prev ? { ...prev, name } : prev,
              );
          }}
          onListChanged={refreshStatuses}
        />
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const fs = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.bg },
  topBar: {
    backgroundColor: T.primary,
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
  topAvatarText: { fontSize: 20, fontWeight: '800', color: T.primary },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: T.dangerLt,
    borderLeftWidth: 3,
    borderLeftColor: T.danger,
    marginHorizontal: 16,
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
  },
  errorBannerText: { fontSize: 12, color: T.danger, flex: 1 },
  keyboardWrap: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    // paddingBottom is applied dynamically with insets
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
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
    backgroundColor: T.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: T.primary,
    letterSpacing: 0.2,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: T.primaryLight },
  fieldWrap: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: T.textSub,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  errorText: {
    fontSize: 11,
    color: T.danger,
    marginTop: 4,
    fontWeight: '600',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: T.text,
    paddingVertical: 11,
    paddingHorizontal: 13,
    backgroundColor: T.bg,
    minHeight: 46,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    fontWeight: '500',
  },
  inputMulti: { minHeight: 96, textAlignVertical: 'top', paddingTop: 12 },
  inputFocused: { backgroundColor: T.primarySoft, borderColor: T.primary },
  selectorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    backgroundColor: T.bg,
    minHeight: 46,
    paddingHorizontal: 13,
  },
  selectorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectorText: { flex: 1, fontSize: 14, color: T.text, fontWeight: '600' },
  selectorPlaceholder: { color: T.mutedLt, fontWeight: '500' },
  qualitySelector: {
    backgroundColor: T.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  qualitySelectorLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingRight: 10,
  },
  qualitySelectorIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qualitySelectorText: { fontSize: 14, fontWeight: '700', color: T.text },
  qualitySelectorPlaceholder: { color: T.mutedLt },
  selectedQualitySummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 8,
    borderLeftWidth: 3,
  },
  selectedQualityDot: { width: 8, height: 8, borderRadius: 4 },
  selectedQualitySummaryText: { fontSize: 12, fontWeight: '700' },
  followUpField: {
    backgroundColor: T.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  followUpFieldActive: {
    borderColor: T.primary,
    backgroundColor: T.primarySoft,
  },
  followUpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  followUpTextWrap: { flex: 1, gap: 2 },
  followUpMainText: { fontSize: 14, fontWeight: '700', color: T.text },
  followUpPlaceholder: { color: T.mutedLt },
  followUpSubText: { fontSize: 11, fontWeight: '500', color: T.muted },
  followUpRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  clearDateBtn: { padding: 4 },
  dateTimeSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 6,
  },
  dateTimeSummaryText: { fontSize: 12, fontWeight: '700', color: T.primary },
  iosPickerWrap: {
    backgroundColor: T.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
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
    borderBottomColor: T.border,
  },
  iosPickerLabel: { fontSize: 14, fontWeight: '700', color: T.text },
  iosPickerDone: { fontSize: 14, fontWeight: '700', color: T.primary },
  // Fixed footer styles
  fixedFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: T.bg,
    borderTopWidth: 1,
    borderTopColor: T.borderLt,
    // paddingBottom handled dynamically via insets
  },
  submitRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: T.textSub },
  submitBtn: {
    flex: 2.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: T.primary,
    elevation: 3,
    shadowColor: T.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
});

const pm = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: SCREEN_HEIGHT * 0.72,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  title: { fontSize: 17, fontWeight: '800', color: T.text },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refreshBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: T.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  manageBtnText: { fontSize: 11, fontWeight: '700', color: T.primary },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: T.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: T.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: T.text },
  refreshingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: T.primarySoft,
  },
  refreshingText: { fontSize: 12, color: T.primary, fontWeight: '600' },
  listContent: { paddingHorizontal: 12, paddingVertical: 8 },
  emptyWrap: { alignItems: 'center', paddingVertical: 30 },
  emptyText: { fontSize: 13, color: T.mutedLt },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 14,
    borderRadius: 10,
    marginVertical: 2,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: T.borderLt,
  },
  itemSelected: {
    backgroundColor: T.primaryLight,
    borderColor: T.primaryLight,
  },
  itemText: { flex: 1, fontSize: 15, fontWeight: '500', color: T.text },
  itemTextSelected: { color: T.primary, fontWeight: '700' },
});

const mms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 18, 36, 0.62)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
 dialog: {
  width: '100%',
  backgroundColor: '#FFF',
  borderRadius: 22,
  elevation: 28,
  shadowColor: '#000',
  shadowOpacity: 0.22,
  shadowRadius: 28,
  shadowOffset: { width: 0, height: 10 },
},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: T.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: T.text },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: T.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: T.border,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
  },
  toastSuccess: {
    backgroundColor: T.successLt,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  toastError: {
    backgroundColor: T.dangerLt,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  toastIconBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastIconSuccess: { backgroundColor: T.success },
  toastIconError: { backgroundColor: T.danger },
  toastText: { fontSize: 13, fontWeight: '600', color: T.success, flex: 1 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: T.bg,
  },
  addInput: {
    flex: 1,
    height: 40,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: T.text,
    backgroundColor: '#FFF',
    fontWeight: '500',
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },
  listContent: { padding: 12, paddingBottom: 8 },
  emptyWrap: { alignItems: 'center', paddingVertical: 36, gap: 6 },
  emptyText: { fontSize: 14, fontWeight: '700', color: T.text },
  emptySubText: { fontSize: 12, color: T.muted },
itemRow: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 8,
  backgroundColor: T.bg,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: T.border,
  paddingHorizontal: 12,
  paddingVertical: 10,
  minHeight: 44,
},
itemRowEditing: {
  flexDirection: 'column',
  alignItems: 'stretch',
  gap: 8,
  backgroundColor: T.primarySoft,
  borderRadius: 10,
  borderWidth: 1.5,
  borderColor: T.primary + '55',
  paddingHorizontal: 12,
  paddingVertical: 10,
},
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.primary,
    opacity: 0.45,
  },
  itemName: { flex: 1, fontSize: 14, fontWeight: '600', color: T.text },
  // Icon-only action buttons
  editIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.dangerLt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Inline edit row
editWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
editInput: {
  flex: 1,
  fontSize: 14,
  fontWeight: '600',
  color: T.text,
  borderWidth: 1.5,
  borderColor: T.primary,
  borderRadius: 8,
  paddingHorizontal: 10,
  paddingVertical: 8,
  backgroundColor: '#FFF',
  minHeight: 40,
},
  saveIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.bg,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  footerText: { fontSize: 11, color: T.mutedLt },
  // DeleteConfirmModal styles (unchanged)
  delRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 32,
  },
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
    backgroundColor: T.dangerLt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  delTitle: { fontSize: 18, fontWeight: '800', color: T.text, marginBottom: 8 },
  delSub: {
    fontSize: 14,
    color: T.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  delBtns: { flexDirection: 'row', gap: 12, width: '100%' },
  delCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: T.border,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  delCancelText: { fontSize: 14, fontWeight: '700', color: T.textSub },
  delConfirmBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    backgroundColor: T.danger,
    alignItems: 'center',
  },
  delConfirmText: { fontSize: 14, fontWeight: '700', color: '#FFF' },
  // Kept so nothing breaks if referenced elsewhere
  root: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: SCREEN_HEIGHT * 0.75,
    overflow: 'hidden',
  },
});