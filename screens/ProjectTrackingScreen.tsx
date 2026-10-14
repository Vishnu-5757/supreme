// ProjectTrackingScreen.tsx – Corrected: Subsidy appears ONLY for Residential projects
import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Animated,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useAuthApi } from '../hooks/useAuthApi';
import { usePermissions } from '../hooks/usePermissions';
import { API_BASE_URL } from '../config';

const THEME = {
  primary: '#8E1C1C',
  primaryDark: '#6F1515',
  primaryLight: '#FCE9E9',
  bg: '#F3F4F6',
  card: '#FFFFFF',
  text: '#1F2937',
  textSecondary: '#4B5563',
  muted: '#9CA3AF',
  border: '#E5E7EB',
  success: '#198754',
  successLight: '#D1E7DD',
  warning: '#D97706',
  warningLight: '#FEF3C7',
  danger: '#DC2626',
  dangerLight: '#FEF2F2',
  info: '#2563EB',
  infoLight: '#EFF6FF',
};

interface SubStepDef {
  id: number;
  name: string;
  doneField: string;
  dateField: string;
  editable: boolean;
}

interface StepDef {
  id: number;
  slug: string | null;
  label: string;
  description: string;
  icon: string;
  color: string;
  dateField: string;
  remarksField: string;
  doneField: string;
  skippedField: string;
  editable: boolean;
  subSteps: SubStepDef[];
}

// Server-returned shape of one entry in the `steps` array from
// /project/<id>/tracking-api/ — covers every effective step for this
// project's branch (built-in AND custom), already filtered by
// category/payment/branch-hide and already in the correct order. This
// replaces the old hardcoded 9-step list, so a custom step added from the
// web Milestone Settings screen shows up here automatically.
interface ServerSubStep {
  id: number;
  name: string;
  date: string | null;
  done: boolean;
  editable: boolean;
}

interface ServerStep {
  id: number;
  slug: string | null;
  name: string;
  subtitle: string;
  icon_class: string;
  doc_upload_enabled: boolean;
  date: string | null;
  remarks: string;
  doc_url: string | null;
  done: boolean;
  skipped: boolean;
  editable: boolean;
  sub_steps: ServerSubStep[];
}

// Nicer icon/color/description for the 9 known built-in steps than the
// server's generic icon_class (a web Font Awesome class, not usable here).
// A custom step (slug null, or any future slug not in this map) falls back
// to DEFAULT_PRESENTATION and uses the server's own name/subtitle as-is.
const BUILTIN_PRESENTATION: Record<string, { icon: string; color: string; description: string; label: string }> = {
  subsidy: { icon: 'file-certificate-outline', color: '#7C3AED', label: 'Subsidy Registration', description: 'Government subsidy registration for residential solar projects' },
  loan: { icon: 'bank-outline', color: '#D97706', label: 'Loan Paperwork', description: 'Loan documentation and financial paperwork processing' },
  kseb_feasibility: { icon: 'flash-outline', color: '#2563EB', label: 'KSEB Feasibility', description: 'Grid connection feasibility check by KSEB' },
  material_delivery: { icon: 'truck-delivery-outline', color: '#0891B2', label: 'Material Delivery', description: 'Solar panels and equipment delivery to site' },
  work_started: { icon: 'hammer-wrench', color: '#EA580C', label: 'Work Started', description: 'Installation work has commenced at site' },
  work_completed: { icon: 'check-decagram-outline', color: '#16A34A', label: 'Work Completed', description: 'Physical structure and panel installation finished' },
  kseb_completion_report: { icon: 'file-chart-outline', color: '#2563EB', label: 'KSEB Report', description: 'Completion report submitted to KSEB' },
  completion_approved: { icon: 'shield-check-outline', color: '#7C3AED', label: 'Approved', description: 'Project completion officially approved' },
  plant_commissioned: { icon: 'solar-power', color: '#16A34A', label: 'Commissioned', description: 'Solar plant is live and generating power' },
};
const DEFAULT_PRESENTATION = { icon: 'clipboard-check-outline', color: '#4B5563' };

const buildStepDef = (s: ServerStep): StepDef => {
  const preset = s.slug ? BUILTIN_PRESENTATION[s.slug] : undefined;
  return {
    id: s.id,
    slug: s.slug,
    label: preset?.label || s.name,
    description: preset?.description || s.subtitle || '',
    icon: preset?.icon || DEFAULT_PRESENTATION.icon,
    color: preset?.color || DEFAULT_PRESENTATION.color,
    dateField: `entry_${s.id}_date`,
    remarksField: `entry_${s.id}_remarks`,
    doneField: `entry_${s.id}_done`,
    skippedField: `entry_${s.id}_skipped`,
    editable: s.editable,
    subSteps: (s.sub_steps || []).map(sub => ({
      id: sub.id,
      name: sub.name,
      doneField: `subentry_${sub.id}_done`,
      dateField: `subentry_${sub.id}_date`,
      editable: sub.editable,
    })),
  };
};

const buildTrackingDataFromSteps = (stepsArr: ServerStep[]) => {
  const data: Record<string, any> = {};
  stepsArr.forEach(s => {
    data[`entry_${s.id}_date`] = s.date || '';
    data[`entry_${s.id}_remarks`] = s.remarks || '';
    data[`entry_${s.id}_done`] = !!s.done;
    data[`entry_${s.id}_skipped`] = !!s.skipped;
    (s.sub_steps || []).forEach(sub => {
      data[`subentry_${sub.id}_done`] = !!sub.done;
      data[`subentry_${sub.id}_date`] = sub.date || '';
    });
  });
  return data;
};

const formatDateDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const todayISO = () => new Date().toISOString().split('T')[0];

// ─── FeedbackModal ─────────────────────────────────────────────────
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

// ─── StepEditModal ───────────────────────────────────────────────────
const StepEditModal = ({ visible, step, trackingData, blockerLabel, onClose, onSave, onSkip, onUpdateSub, onShowError, saving }: any) => {
  const dateValue = trackingData[step?.dateField] || '';
  const remarksValue = trackingData[step?.remarksField] || '';
  const isSkipped = !!trackingData[step?.skippedField];
  const isDone = !!trackingData[step?.doneField];
  // Whether THIS user can edit the step's own Date/Remarks/Skip — separate
  // from the checklist, which is gated per sub-item instead. A user scoped
  // to only specific milestones can open a step's modal (canSave is a
  // blanket screen-level gate) without holding access to that particular
  // step; without this, the fields below would stay fully interactive and
  // only fail with a confusing server error on save.
  const parentEditable = !!step?.editable;
  const [date, setDate] = useState(dateValue);
  const [remarks, setRemarks] = useState(remarksValue);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [openSubPickerId, setOpenSubPickerId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setDate(dateValue);
      setRemarks(remarksValue);
      setShowDatePicker(false);
      setShowSkipConfirm(false);
      setOpenSubPickerId(null);
    }
  }, [visible, dateValue, remarksValue]);

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (event.type === 'set' && selectedDate) {
      setDate(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleSave = () => {
    // Marking a milestone Done requires a date — matches the server's own
    // rule. Remarks alone no longer silently ticks it off; use Skip instead
    // when there's nothing to date yet. Both checks run BEFORE calling
    // onSave (same as handleSkip does for the in-order rule) so tapping
    // "Update Milestone" gives an immediate answer instead of silently
    // closing and only failing later when Sync Changes is pressed.
    if (!date?.trim()) {
      onShowError('Date Required', `Please select a date before saving '${step.label}'.`);
      return;
    }
    if (blockerLabel) {
      onShowError('Complete Previous Step', `Complete or skip '${blockerLabel}' before completing '${step.label}'.`);
      return;
    }
    onSave({ date, remarks, autoTick: true });
  };

  // Checklist items go strictly in order, same as the steps themselves: an
  // item can only be ticked once the one before it is, and only unticked once
  // no later item is still ticked. The server re-checks regardless.
  const toggleSubDone = (sub: SubStepDef, idx: number) => {
    const subs: SubStepDef[] = step.subSteps;
    const isOn = !!trackingData[sub.doneField];
    if (!isOn) {
      const prev = subs[idx - 1];
      if (prev && !trackingData[prev.doneField]) {
        onShowError('Complete Previous Item', `Complete '${prev.name}' before completing '${sub.name}'.`);
        return;
      }
    } else {
      const later = subs.slice(idx + 1).find(s => !!trackingData[s.doneField]);
      if (later) {
        onShowError('Item Already Completed', `'${later.name}' is already completed — untick it before unticking '${sub.name}'.`);
        return;
      }
    }
    onUpdateSub(sub, { done: !isOn });
  };

  const handleSkip = () => {
    // Check the in-order rule BEFORE even offering the confirmation — no
    // point asking "are you sure" for a skip the server will reject anyway.
    if (blockerLabel) {
      onShowError('Complete Previous Step', `Complete or skip '${blockerLabel}' before skipping '${step.label}'.`);
      return;
    }
    setShowSkipConfirm(true);
  };

  const confirmSkip = () => {
    setShowSkipConfirm(false);
    onSkip(remarks);
  };

  const subDatePickerValue = (sub: SubStepDef) => trackingData[sub.dateField] || '';

  if (!step) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalKeyboardContext}>
          <View style={styles.modalCard}>
            <View style={styles.modalIndicatorBar} />
            <View style={styles.modalHeaderRow}>
              <View style={[styles.modalIconBox, { backgroundColor: '#F3F4F6' }]}>
                <MaterialCommunityIcons name={step.icon} size={22} color={THEME.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{step.label}</Text>
                <Text style={styles.modalDesc} numberOfLines={1}>{step.description}</Text>
              </View>
            </View>
            {isSkipped && (
              <View style={styles.skippedBanner}>
                <MaterialCommunityIcons name="debug-step-over" size={13} color={THEME.warning} />
                <Text style={styles.skippedBannerText}>This milestone is currently marked as Skipped.</Text>
              </View>
            )}
            <View style={styles.modalFormBody}>
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Date Cleared</Text>
                <TouchableOpacity
                  style={[styles.dateInputWrap, !parentEditable && { opacity: 0.5 }]}
                  onPress={() => parentEditable && setShowDatePicker(true)}
                  disabled={!parentEditable}
                >
                  <MaterialCommunityIcons name="calendar-range" size={18} color={THEME.textSecondary} />
                  <Text style={[styles.dateText, !date && { color: THEME.muted }]}>
                    {date ? formatDateDisplay(date) : 'Choose date'}
                  </Text>
                  {date && parentEditable && (
                    <TouchableOpacity onPress={() => setDate('')} style={{ padding: 2 }}>
                      <MaterialCommunityIcons name="close-circle" size={16} color={THEME.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              </View>
              {showDatePicker && (
                <DateTimePicker value={date ? new Date(date) : new Date()} mode="date" display="default" onChange={onDateChange} />
              )}
              <View style={styles.modalField}>
                <Text style={styles.fieldLabel}>Tracking Remarks / Comments</Text>
                <TextInput
                  style={[styles.remarksInput, !parentEditable && { opacity: 0.5 }]}
                  placeholder="Provide tracking log info here..."
                  placeholderTextColor={THEME.muted}
                  value={remarks}
                  onChangeText={setRemarks}
                  editable={parentEditable}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              {!parentEditable && (
                <View style={styles.viewOnlyNote}>
                  <MaterialCommunityIcons name="eye-outline" size={14} color={THEME.muted} />
                  <Text style={styles.viewOnlyText}>You don't have permission to edit this milestone</Text>
                </View>
              )}
              {step.subSteps.length > 0 && (
                <View style={styles.modalField}>
                  <Text style={styles.fieldLabel}>Checklist</Text>
                  <View style={styles.subStepList}>
                    {step.subSteps.map((sub: SubStepDef, subIdx: number) => {
                      const subDone = !!trackingData[sub.doneField];
                      const subDate = subDatePickerValue(sub);
                      // Gated by the sub-item's OWN permission, not the parent
                      // step's — a user can hold access to one specific
                      // sub-item without holding access to the parent step
                      // itself (and vice versa), same as the server enforces.
                      // Locked either way while the parent is Skipped.
                      const locked = isSkipped || !sub.editable;
                      return (
                        <View key={sub.id} style={[styles.subStepRow, subDone && styles.subStepRowDone, locked && { opacity: 0.5 }]}>
                          <TouchableOpacity
                            style={styles.subStepCheckbox}
                            activeOpacity={locked ? 1 : 0.7}
                            disabled={locked}
                            onPress={() => toggleSubDone(sub, subIdx)}
                          >
                            <MaterialCommunityIcons
                              name={subDone ? 'checkbox-marked' : 'checkbox-blank-outline'}
                              size={22}
                              color={subDone ? THEME.success : THEME.muted}
                            />
                          </TouchableOpacity>

                          <View style={styles.subStepBody}>
                            <Text style={[styles.subStepText, subDone && styles.subStepTextDone]} numberOfLines={1}>
                              {sub.name}
                            </Text>
                            <TouchableOpacity
                              style={styles.subDateRow}
                              activeOpacity={locked ? 1 : 0.6}
                              disabled={locked}
                              onPress={() => setOpenSubPickerId(sub.id)}
                            >
                              <MaterialCommunityIcons name="calendar-range" size={12} color={subDate ? THEME.textSecondary : THEME.muted} />
                              <Text style={[styles.subDateText, !subDate && { color: THEME.muted, fontStyle: 'italic' }]}>
                                {subDate ? formatDateDisplay(subDate) : 'Tap to set a date'}
                              </Text>
                              {subDate && !locked && (
                                <TouchableOpacity
                                  onPress={() => onUpdateSub(sub, { date: '' })}
                                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                                >
                                  <MaterialCommunityIcons name="close-circle" size={14} color={THEME.muted} />
                                </TouchableOpacity>
                              )}
                            </TouchableOpacity>
                          </View>

                          {subDone && (
                            <View style={styles.subDoneChip}>
                              <MaterialCommunityIcons name="check" size={10} color={THEME.success} />
                              <Text style={styles.subDoneChipText}>Done</Text>
                            </View>
                          )}

                          {openSubPickerId === sub.id && (
                            <DateTimePicker
                              value={subDate ? new Date(subDate) : new Date()}
                              mode="date"
                              display="default"
                              onChange={(event: DateTimePickerEvent, selectedDate?: Date) => {
                                if (Platform.OS === 'android') setOpenSubPickerId(null);
                                if (event.type === 'set' && selectedDate) {
                                  onUpdateSub(sub, { date: selectedDate.toISOString().split('T')[0] });
                                }
                              }}
                            />
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
            {!isDone && !isSkipped && parentEditable && (
              <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} disabled={saving} activeOpacity={0.8}>
                <MaterialCommunityIcons name="debug-step-over" size={15} color={THEME.warning} />
                <Text style={styles.skipBtnText}>Skip this milestone</Text>
              </TouchableOpacity>
            )}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Dismiss</Text>
              </TouchableOpacity>
              {parentEditable && (
                <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.saveBtnText}>Update Milestone</Text>}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={showSkipConfirm} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setShowSkipConfirm(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconBg}>
              <MaterialCommunityIcons name="debug-step-over" size={26} color={THEME.warning} />
            </View>
            <Text style={styles.confirmTitle}>Skip '{step.label}'?</Text>
            <Text style={styles.confirmMessage}>
              This marks the step as skipped so you can move on to the next one. You can still come back and
              complete it properly later — but its checklist will be locked while it stays skipped.
            </Text>
            <View style={styles.confirmActionsRow}>
              <TouchableOpacity style={styles.confirmCancelBtn} onPress={() => setShowSkipConfirm(false)}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmSkipBtn} onPress={confirmSkip}>
                <Text style={styles.confirmSkipText}>Yes, Skip</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

// ─── TimelineStepCard ────────────────────────────────────────────────
const TimelineStepCard = ({ step, trackingData, onToggleDone, onPress }: any) => {
  const isDone = !!trackingData[step.doneField];
  const isSkipped = !isDone && !!trackingData[step.skippedField];
  const dateValue = trackingData[step.dateField];
  const remarks = trackingData[step.remarksField] || '';

  const nodeStyle = isDone ? styles.timelineNodeDone : isSkipped ? styles.timelineNodeSkipped : styles.timelineNodePending;
  const lineStyle = isDone ? styles.timelineLineDone : isSkipped ? styles.timelineLineSkipped : null;
  const nodeIcon = isDone ? 'check' : isSkipped ? 'debug-step-over' : step.icon;

  const subTotal = step.subSteps?.length ?? 0;
  const subDoneCount = subTotal ? step.subSteps.filter((s: SubStepDef) => !!trackingData[s.doneField]).length : 0;

  return (
    <View style={styles.timelineRowWrap}>
      <View style={styles.timelineRail}>
        <View style={[styles.timelineLineTop, lineStyle]} />
        <View style={[styles.timelineNode, nodeStyle]}>
          <MaterialCommunityIcons name={nodeIcon} size={11} color={isDone || isSkipped ? '#FFF' : THEME.textSecondary} />
        </View>
        <View style={[styles.timelineLineBottom, lineStyle]} />
      </View>
      <TouchableOpacity activeOpacity={0.9} onPress={() => onPress(step)} style={[styles.timelineCard, isDone && styles.timelineCardDone, isSkipped && styles.timelineCardSkipped]}>
        <View style={styles.timelineCardTop}>
          <View style={styles.timelineTitleBlock}>
            <Text style={[styles.timelineTitle, isDone && styles.timelineTitleDone]} numberOfLines={1}>{step.label}</Text>
            <Text style={styles.timelineDesc} numberOfLines={1}>{remarks || 'No remarks'}</Text>
          </View>
          <TouchableOpacity onPress={() => onToggleDone(step)} activeOpacity={0.75} style={[styles.timelineCheckBtn, isDone && styles.timelineCheckBtnDone]}>
            <MaterialCommunityIcons name={isDone ? 'check' : 'circle-outline'} size={12} color={isDone ? '#FFF' : THEME.muted} />
          </TouchableOpacity>
        </View>
        <View style={styles.timelineMetaRow}>
          <View style={styles.timelineMetaLeft}>
            {isSkipped ? (
              <>
                <MaterialCommunityIcons name="debug-step-over" size={11} color={THEME.warning} />
                <Text style={[styles.timelineMetaText, { color: THEME.warning }]}>Skipped</Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons name={dateValue ? 'calendar-check-outline' : 'calendar-outline'} size={11} color={dateValue ? THEME.textSecondary : THEME.muted} />
                <Text style={[styles.timelineMetaText, dateValue ? styles.timelineMetaTextDark : styles.timelineMetaTextMuted]}>{dateValue ? formatDateDisplay(dateValue) : 'No date'}</Text>
              </>
            )}
          </View>
        </View>

        {subTotal > 0 && (
          <View style={styles.timelineSubSection}>
            <View style={styles.timelineSubHeaderRow}>
              <MaterialCommunityIcons name="format-list-checks" size={12} color={THEME.textSecondary} />
              <Text style={styles.timelineSubHeaderText}>Checklist</Text>
              <Text style={[styles.timelineSubHeaderCount, subDoneCount === subTotal && { color: THEME.success }]}>
                {subDoneCount}/{subTotal}
              </Text>
            </View>
            <View style={styles.timelineSubTrack}>
              <View style={[styles.timelineSubFill, { width: `${(subDoneCount / subTotal) * 100}%` }]} />
            </View>
            <View style={styles.timelineSubList}>
              {step.subSteps.map((sub: SubStepDef) => {
                const subDone = !!trackingData[sub.doneField];
                const subDate = trackingData[sub.dateField];
                return (
                  <View key={sub.id} style={styles.timelineSubRow}>
                    <MaterialCommunityIcons
                      name={subDone ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={14}
                      color={subDone ? THEME.success : THEME.muted}
                    />
                    <Text style={[styles.timelineSubRowText, subDone && styles.timelineSubRowTextDone]} numberOfLines={1}>
                      {sub.name}
                    </Text>
                    {subDate ? (
                      <Text style={styles.timelineSubRowDate}>{formatDateDisplay(subDate)}</Text>
                    ) : (
                      <Text style={styles.timelineSubRowDateMuted}>No date</Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

// ─── TimelineSection (unchanged) ───────────────────────────────────
const TimelineSection = ({ title, steps, trackingData, onToggleDone, onPress }: any) => {
  if (!steps.length) return null;
  const doneCount = steps.filter((s: StepDef) => !!trackingData[s.doneField] || !!trackingData[s.skippedField]).length;
  return (
    <View style={styles.timelineSectionCardShadow}>
      <View style={styles.timelineSectionCard}>
        <View style={styles.timelineSectionHeader}>
          <Text style={styles.timelineSectionTitle}>{title}</Text>
          <Text style={styles.timelineSectionCount}>{doneCount}/{steps.length}</Text>
        </View>
        <View style={styles.timelineSectionList}>
          {steps.map((step: StepDef) => (
            <TimelineStepCard key={step.id} step={step} trackingData={trackingData} onToggleDone={onToggleDone} onPress={onPress} />
          ))}
        </View>
      </View>
    </View>
  );
};

// ─── SectionLabel (unchanged) ──────────────────────────────────────
const SectionLabel = ({ icon, title }: { icon: string; title: string }) => (
  <View style={styles.sectionRow}>
    <View style={styles.sectionIconBox}>
      <MaterialCommunityIcons name={icon} size={13} color={THEME.primary} />
    </View>
    <Text style={styles.sectionTitle}>{title}</Text>
    <View style={styles.sectionLine} />
  </View>
);

// ─── HistoryModal ───────────────────────────────────────────────────
// "Who updated what, and when" — mirrors the web tracking page's Update
// History panel. Same /project/<id>/tracking-api/log/ data shape as web's
// /project/<id>/tracking/log/, so the two stay in sync automatically.
interface HistoryChange { label: string; old: string | null; new: string | null; }
interface HistoryRow {
  id: number;
  step: string | null;
  action: string;
  performed_at: string | null;
  performed_by: string;
  changes: HistoryChange[];
}

function formatHistoryWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const HistoryModal = ({
  visible, onClose, loading, logs,
}: { visible: boolean; onClose: () => void; loading: boolean; logs: HistoryRow[]; }) => (
  <Modal visible={visible} transparent animationType="slide" statusBarTranslucent presentationStyle="overFullScreen" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, styles.historyModalCard]}>
        <View style={styles.modalIndicatorBar} />
        <View style={styles.modalHeaderRow}>
          <View style={[styles.modalIconBox, { backgroundColor: '#F3F4F6' }]}>
            <MaterialCommunityIcons name="history" size={22} color={THEME.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>Update History</Text>
            <Text style={styles.modalDesc} numberOfLines={1}>Who changed what, and when</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
            <MaterialCommunityIcons name="close" size={20} color={THEME.textSecondary} />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <ActivityIndicator size="small" color={THEME.primary} />
          </View>
        ) : logs.length === 0 ? (
          <View style={{ paddingVertical: 30, alignItems: 'center' }}>
            <Text style={{ color: THEME.muted, fontSize: 13 }}>No updates recorded yet.</Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
            {logs.map((row) => (
              <View key={row.id} style={styles.historyRow}>
                <View style={styles.historyRowHead}>
                  <Text style={styles.historyStep} numberOfLines={2}>{row.step || 'Milestone'}</Text>
                  <Text style={styles.historyWhen}>{formatHistoryWhen(row.performed_at)}</Text>
                </View>
                <Text style={styles.historyBy}>by <Text style={{ fontWeight: '700', color: THEME.text }}>{row.performed_by}</Text></Text>
                {row.changes.map((c, i) => (
                  <Text key={i} style={styles.historyChangeLine}>
                    <Text style={{ color: THEME.textSecondary }}>{c.label}: </Text>
                    {c.old != null && c.old !== '' ? (
                      <>
                        <Text style={{ color: THEME.danger, textDecorationLine: 'line-through' }}>{c.old}</Text>
                        <Text> → </Text>
                      </>
                    ) : null}
                    <Text style={{ color: THEME.success, fontWeight: '600' }}>{c.new}</Text>
                  </Text>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  </Modal>
);

// ─── Main Screen ────────────────────────────────────────────────────
export default function ProjectTrackingScreen({ route, navigation }: any) {
  const { project } = route.params;
  const { apiRequest } = useAuthApi();
  const insets = useSafeAreaInsets();
  const { hasPermission, isSuperuser } = usePermissions();
  // Mirrors exactly what the server itself checks before accepting a save
  // (project_tracking_api's POST handler). Previously this was additionally
  // gated on userCache.current.app_permissions, a snapshot taken only at
  // login and never refreshed — a permission change made after the user's
  // last login would silently keep this false (View Only) even though
  // hasPermission() itself had already picked up the change (it polls and
  // refreshes on app foreground). Dropped that stale check entirely.
  const canSave = isSuperuser || hasPermission('project.change_projectmilestone');

  const [trackingData, setTrackingData] = useState<Record<string, any>>({});
  const [category, setCategory] = useState<'RES' | 'COM'>('RES');
  const [visibleSteps, setVisibleSteps] = useState<StepDef[]>([]);
  const [localChanges, setLocalChanges] = useState<Record<string, any>>({});
  // Snapshots of localChanges before each staged edit, so the banner's Undo
  // can step back one edit at a time — only ever holds not-yet-synced state.
  const [changeHistory, setChangeHistory] = useState<Record<string, any>[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editStep, setEditStep] = useState<StepDef | null>(null);

  const [historyVisible, setHistoryVisible] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLogs, setHistoryLogs] = useState<HistoryRow[]>([]);
  const historyLoadedRef = useRef(false);

  const [feedbackModal, setFeedbackModal] = useState({
    visible: false,
    type: 'success' as 'success' | 'error' | 'info',
    title: '',
    message: '',
    autoDismiss: false,
  });

  const didFetchRef = useRef(false);

  const showFeedback = useCallback(
    (type: 'success' | 'error' | 'info', title: string, message: string, autoDismiss = false) => {
      setFeedbackModal({ visible: true, type, title, message, autoDismiss });
    },
    [],
  );

  const closeFeedback = useCallback(() => {
    setFeedbackModal(prev => {
      if (prev.type === 'success' && prev.autoDismiss) {
        route?.params?.onSuccess?.();
        navigation.goBack();
      }
      return { ...prev, visible: false };
    });
  }, [navigation, route]);

  const openHistory = useCallback(async () => {
    setHistoryVisible(true);
    if (historyLoadedRef.current) return;
    setHistoryLoading(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/project/${project.id}/tracking-api/log/`);
      if (!res.ok) throw new Error('Failed to load history');
      const json = await res.json();
      setHistoryLogs(json.logs || []);
      historyLoadedRef.current = true;
    } catch {
      showFeedback('error', 'Error', 'Could not load update history', false);
    } finally {
      setHistoryLoading(false);
    }
  }, [apiRequest, project.id, showFeedback]);

  const fetchTracking = useCallback(async (silent = false) => {
    // `silent` skips the full-screen loading state — used by pull-to-refresh,
    // which shows its own inline spinner instead of replacing the whole screen.
    if (!silent) setLoading(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/project/${project.id}/tracking-api/`);
      if (!res.ok) throw new Error('Failed to load');
      const json = await res.json();
      const stepsArr: ServerStep[] = json.steps || [];
      setVisibleSteps(stepsArr.map(buildStepDef));
      setTrackingData(buildTrackingDataFromSteps(stepsArr));
      setCategory(json.category || 'RES');
      setLocalChanges({});
      setChangeHistory([]);
    } catch {
      showFeedback('error', 'Error', 'Could not load tracking data', false);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [apiRequest, project.id, showFeedback]);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    fetchTracking();
  }, [fetchTracking]);

  const [refreshing, setRefreshing] = useState(false);
  const onPullToRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTracking(true);
    setRefreshing(false);
  }, [fetchTracking]);

  // Step inclusion, order, and category/payment/branch-hide filtering are
  // all resolved server-side (project/milestones.py's get_effective_steps) —
  // visibleSteps is just what the server sent, already correct.

  const effectiveData = useMemo(() => ({ ...trackingData, ...localChanges }), [trackingData, localChanges]);
  const hasLocalChanges = Object.keys(localChanges).length > 0;

  const stageChanges = useCallback(
    (build: (prev: Record<string, any>) => Record<string, any>) => {
      setChangeHistory(h => [...h.slice(-49), localChanges]);
      setLocalChanges(build(localChanges));
    },
    [localChanges],
  );

  const undoLastChange = useCallback(() => {
    if (!changeHistory.length) return;
    setLocalChanges(changeHistory[changeHistory.length - 1]);
    setChangeHistory(changeHistory.slice(0, -1));
  }, [changeHistory]);

  // A step counts as "out of the way" (done OR skipped) for order-checking
  // purposes — mirrors the server's rule, which applies to everyone with no
  // exceptions. Checked client-side for instant feedback; the server always
  // re-checks regardless, so this is a UX nicety, not the source of truth.
  const isStepResolved = useCallback(
    (step: StepDef) => !!effectiveData[step.doneField] || !!effectiveData[step.skippedField],
    [effectiveData],
  );

  const getBlockingStep = useCallback(
    (step: StepDef): StepDef | null => {
      const idx = visibleSteps.findIndex(s => s.id === step.id);
      if (idx <= 0) return null;
      const prev = visibleSteps[idx - 1];
      return isStepResolved(prev) ? null : prev;
    },
    [visibleSteps, isStepResolved],
  );

  const handleSaveAll = async () => {
    // Only the fields the user actually touched — sending every visible
    // step's fields on every sync (the old behavior) would include an empty
    // date/done pair for steps nobody meant to touch, which the backend now
    // correctly rejects (a save must have a date, Skip is the way around
    // that). Queued local edits already carry only their own changed keys.
    if (!hasLocalChanges) return;

    setSaving(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/project/${project.id}/tracking-api/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localChanges),
      });
      const json = await res.json().catch(() => ({} as any));
      if (res.ok) {
        const stepsArr: ServerStep[] = json.steps || [];
        if (stepsArr.length) {
          setVisibleSteps(stepsArr.map(buildStepDef));
          setTrackingData(buildTrackingDataFromSteps(stepsArr));
        }
        setCategory(json.category || category);
        setLocalChanges({});
        setChangeHistory([]);
        showFeedback('success', 'Saved Successfully', 'All workflow updates pushed online', true);
      } else {
        showFeedback('error', 'Error', json.error || 'Unable to store updates', false);
      }
    } catch {
      showFeedback('error', 'Connection Error', 'Connection error encountered', false);
    } finally {
      setSaving(false);
    }
  };

  const toggleDone = (step: StepDef) => {
    const current = !!effectiveData[step.doneField];
    const newDone = !current;

    if (newDone) {
      const blocker = getBlockingStep(step);
      if (blocker) {
        showFeedback('error', 'Complete Previous Step', `Complete or skip '${blocker.label}' before completing '${step.label}'.`, false);
        return;
      }
    }

    const changes: Record<string, any> = { [step.doneField]: newDone };
    if (newDone) {
      if (!effectiveData[step.dateField]) changes[step.dateField] = todayISO();
      changes[step.skippedField] = false;
    }
    stageChanges(prev => ({ ...prev, ...changes }));
  };

  // Sub-step checklist items — queued into the same batched localChanges as
  // everything else on this screen, pushed together on the next Sync.
  // done/date are independent fields, same as the server and web: checking
  // the box never touches the date, and picking a date never touches done.
  const updateSubStep = (sub: SubStepDef, patch: { done?: boolean; date?: string }) => {
    const changes: Record<string, any> = {};
    if (patch.done !== undefined) changes[sub.doneField] = patch.done;
    if (patch.date !== undefined) changes[sub.dateField] = patch.date;
    stageChanges(prev => ({ ...prev, ...changes }));
  };

  const handleModalSave = useCallback(
    ({ date, remarks, autoTick }: { date: string; remarks: string; autoTick: boolean }) => {
      if (!editStep) return;

      if (autoTick) {
        const blocker = getBlockingStep(editStep);
        if (blocker) {
          showFeedback('error', 'Complete Previous Step', `Complete or skip '${blocker.label}' before completing '${editStep.label}'.`, false);
          return;
        }
      }

      const changes: Record<string, any> = {
        [editStep.dateField]: date,
        [editStep.remarksField]: remarks,
        [editStep.doneField]: autoTick ? true : effectiveData[editStep.doneField] || false,
      };
      if (autoTick) changes[editStep.skippedField] = false;
      stageChanges(prev => ({ ...prev, ...changes }));
      setEditStep(null);
    },
    [editStep, effectiveData, getBlockingStep, showFeedback, stageChanges],
  );

  const handleModalSkip = useCallback(
    (remarks: string) => {
      if (!editStep) return;
      // No remarks required to skip anymore (confirmed via dialog instead,
      // in the modal itself) — matches the same change made on web. The
      // in-order check is the modal's job before it even shows that dialog;
      // this is just a defensive backstop, same pattern as handleModalSave.
      const blocker = getBlockingStep(editStep);
      if (blocker) {
        showFeedback('error', 'Complete Previous Step', `Complete or skip '${blocker.label}' before skipping '${editStep.label}'.`, false);
        return;
      }
      const changes: Record<string, any> = {
        [editStep.skippedField]: true,
        [editStep.doneField]: false,
        [editStep.dateField]: '',
        [editStep.remarksField]: remarks,
      };

      let discardedSubEdits = false;
      stageChanges(prev => {
        const next = { ...prev, ...changes };
        // Skipping locks this step's checklist — drop any staged-but-not-
        // yet-synced sub-item edits for it so they can't collide with the
        // skip in the same sync request (the server would reject the whole
        // batch: an edit to a checklist that's simultaneously being locked).
        editStep.subSteps.forEach((sub: SubStepDef) => {
          if (sub.doneField in next || sub.dateField in next) discardedSubEdits = true;
          delete next[sub.doneField];
          delete next[sub.dateField];
        });
        return next;
      });
      setEditStep(null);
      if (discardedSubEdits) {
        showFeedback('info', 'Checklist Locked', `Unsynced checklist changes for '${editStep.label}' were discarded, since its checklist is now locked while skipped.`, false);
      }
    },
    [editStep, getBlockingStep, showFeedback, stageChanges],
  );

  const avatarLetter = project.customer_name?.[0]?.toUpperCase() || 'P';

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: THEME.primary }}>
        <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
        <SafeAreaView style={styles.root} edges={['top']}>
          <View style={styles.topBar}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.topBarCenter}>
              <Text style={styles.topTitle} numberOfLines={1}>Loading Pipeline</Text>
              <Text style={styles.topSub} numberOfLines={1}>Please wait...</Text>
            </View>
            <View style={{ width: 34 }} />
          </View>
          <View style={[styles.bodyWrap, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="small" color={THEME.primary} />
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
      <SafeAreaView style={styles.root} edges={['top']}>
        <FeedbackModal
          visible={feedbackModal.visible}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          autoDismiss={feedbackModal.autoDismiss}
          onClose={closeFeedback}
        />

        <View style={styles.topBar}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <Text style={styles.topTitle} numberOfLines={1}>{project.customer_name}</Text>
            <Text style={styles.topSub} numberOfLines={1}>ID: {project.id} · {project.mobile}</Text>
          </View>
          {isSuperuser && (
            <TouchableOpacity style={styles.backBtn} onPress={openHistory}>
              <MaterialCommunityIcons name="history" size={18} color="#FFF" />
            </TouchableOpacity>
          )}
          {canSave ? (
            <TouchableOpacity
              style={[styles.headerSyncBtn, (!hasLocalChanges || saving) && styles.headerSyncBtnDisabled]}
              onPress={handleSaveAll}
              disabled={!hasLocalChanges || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={hasLocalChanges ? THEME.primary : THEME.muted} />
              ) : (
                <MaterialCommunityIcons name="cloud-sync-outline" size={18} color={hasLocalChanges ? THEME.primary : THEME.muted} />
              )}
            </TouchableOpacity>
          ) : (
            <View style={{ width: 34 }} />
          )}
        </View>

        <HistoryModal
          visible={historyVisible}
          onClose={() => setHistoryVisible(false)}
          loading={historyLoading}
          logs={historyLogs}
        />

        <View style={styles.bodyWrap}>
          {canSave && hasLocalChanges && (
            <View style={styles.alertTape}>
              <View style={styles.alertTapeIconWrap}>
                <MaterialCommunityIcons name="database-edit-outline" size={14} color={THEME.warning} />
              </View>
              <Text style={styles.alertTapeText}>You have unsaved changes — tap sync to push them.</Text>
              {changeHistory.length > 0 && (
                <TouchableOpacity style={styles.alertTapeUndoBtn} onPress={undoLastChange} activeOpacity={0.8} disabled={saving}>
                  <MaterialCommunityIcons name="undo-variant" size={14} color="#78350F" />
                  <Text style={styles.alertTapeUndoText}>Undo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onPullToRefresh}
                colors={[THEME.primary]}
                tintColor={THEME.primary}
              />
            }
          >
            <SectionLabel icon="timeline-outline" title="Project Milestones" />
            <View style={styles.timelineSectionWrap}>
              <TimelineSection
                title="All Milestones"
                steps={visibleSteps}
                trackingData={effectiveData}
                onToggleDone={canSave ? toggleDone : () => {}}
                onPress={canSave ? (s: StepDef) => setEditStep(s) : () => {}}
              />
            </View>
          </ScrollView>

          <View style={[styles.fixedFooter, { paddingBottom: insets.bottom || 12 }]}>
            {canSave ? (
              <TouchableOpacity
                style={[styles.footerSyncBtn, (!hasLocalChanges || saving) && styles.footerSyncBtnDisabled]}
                onPress={handleSaveAll}
                disabled={!hasLocalChanges || saving}
                activeOpacity={0.85}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="cloud-sync" size={16} color={hasLocalChanges ? '#FFF' : THEME.muted} />
                    <Text style={[styles.footerSyncText, !hasLocalChanges && { color: THEME.muted }]}>
                      {hasLocalChanges ? 'Sync Changes' : 'Update'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.viewOnlyNote}>
                <MaterialCommunityIcons name="eye-outline" size={14} color={THEME.muted} />
                <Text style={styles.viewOnlyText}>View only — you don't have permission to edit tracking</Text>
              </View>
            )}
          </View>
        </View>
      </SafeAreaView>

      <StepEditModal
        visible={!!editStep}
        step={editStep}
        trackingData={effectiveData}
        blockerLabel={editStep ? getBlockingStep(editStep)?.label ?? null : null}
        onClose={() => setEditStep(null)}
        onSave={handleModalSave}
        onSkip={handleModalSkip}
        onUpdateSub={updateSubStep}
        onShowError={(title: string, message: string) => showFeedback('error', title, message, false)}
        saving={false}
      />
    </View>
  );
}

// ─── Styles (unchanged) ──────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  topBar: {
    backgroundColor: THEME.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 10,
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 10 },
  topAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
  },
  topAvatarText: { fontSize: 20, fontWeight: '800', color: THEME.primary },
  topIconCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
  },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2, letterSpacing: -0.2 },
  topSub: { fontSize: 11, color: 'rgba(255,255,255,0.65)' },
  headerSyncBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center',
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4,
  },
  headerSyncBtnDisabled: { backgroundColor: 'rgba(53, 17, 17, 0.2)', elevation: 0 },
  bodyWrap: { flex: 1, backgroundColor: THEME.bg, paddingTop: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  alertTape: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: THEME.warningLight,
    borderRadius: 14,
    paddingVertical: 10, paddingHorizontal: 12,
    marginHorizontal: 16,
    marginTop: 2,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(217,119,6,0.18)',
  },
  alertTapeIconWrap: {
    width: 28, height: 28, borderRadius: 9,
    backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(217,119,6,0.25)',
  },
  alertTapeUndoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#FFF', borderRadius: 10,
    paddingVertical: 6, paddingHorizontal: 10,
    borderWidth: 1, borderColor: 'rgba(217,119,6,0.35)',
  },
  alertTapeUndoText: { fontSize: 11.5, fontWeight: '700', color: '#78350F' },
  alertTapeText: { flex: 1, fontSize: 11.5, fontWeight: '600', color: '#78350F', lineHeight: 16 },
  sectionRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 10, marginTop: 2,
  },
  sectionIconBox: {
    width: 24, height: 24, borderRadius: 7,
    backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontSize: 11.5, fontWeight: '700', color: THEME.textSecondary, letterSpacing: 0.15 },
  sectionLine: { flex: 1, height: 1, backgroundColor: '#EAECEF' },
  scrollContent: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 8 },
  timelineSectionWrap: { gap: 12 },
  timelineSectionCardShadow: {
    borderRadius: 14, backgroundColor: 'transparent',
    shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  timelineSectionCard: {
    backgroundColor: '#FFF', borderRadius: 14, padding: 11,
    borderWidth: 1, borderColor: '#E5E7EB', overflow: 'hidden',
  },
  timelineSectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 8,
  },
  timelineSectionTitle: { fontSize: 12.5, fontWeight: '800', color: THEME.text },
  timelineSectionCount: {
    fontSize: 10.5, fontWeight: '700', color: THEME.textSecondary,
    backgroundColor: '#F3F4F6', paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 999,
  },
  timelineSectionList: { gap: 10 },
  timelineRowWrap: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  timelineRail: { width: 20, alignItems: 'center' },
  timelineLineTop: { width: 2, flex: 1, backgroundColor: '#E5E7EB' },
  timelineLineBottom: { width: 2, flex: 1, backgroundColor: '#E5E7EB' },
  timelineLineDone: { backgroundColor: THEME.successLight },
  timelineNode: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFF',
  },
  timelineNodePending: { borderColor: '#D1D5DB' },
  timelineNodeDone: { backgroundColor: THEME.success, borderColor: THEME.success },
  timelineNodeSkipped: { backgroundColor: THEME.warning, borderColor: THEME.warning },
  timelineLineSkipped: { backgroundColor: THEME.warningLight },
  timelineCard: {
    flex: 1, backgroundColor: '#FFF', borderRadius: 12,
    borderWidth: 1, borderColor: '#E5E7EB', padding: 10,
    shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }, elevation: 1, overflow: 'hidden',
  },
  timelineCardDone: { borderColor: THEME.successLight, backgroundColor: '#F9FBF9' },
  timelineCardSkipped: { borderColor: THEME.warningLight, backgroundColor: '#FFFDF7' },
  timelineCardTop: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8,
  },
  timelineTitleBlock: { flex: 1 },
  timelineTitle: { fontSize: 12.5, fontWeight: '700', color: THEME.text, marginBottom: 1 },
  timelineTitleDone: { color: THEME.text },
  timelineDesc: { fontSize: 10.5, color: THEME.textSecondary, lineHeight: 14 },
  timelineCheckBtn: {
    width: 28, height: 28, borderRadius: 9,
    borderWidth: 1, borderColor: '#D1D5DB', backgroundColor: '#FFF',
    alignItems: 'center', justifyContent: 'center',
  },
  timelineCheckBtnDone: { backgroundColor: THEME.primary, borderColor: THEME.primary },
  timelineMetaRow: {
    marginTop: 8, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', gap: 10,
  },
  timelineMetaLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  timelineMetaText: { fontSize: 10.5, fontWeight: '700' },
  timelineMetaTextDark: { color: THEME.textSecondary },
  timelineMetaTextMuted: { color: THEME.muted },
  timelineSubSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F1F3' },
  timelineSubHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  timelineSubHeaderText: { flex: 1, fontSize: 10.5, fontWeight: '800', color: THEME.textSecondary, letterSpacing: 0.2, textTransform: 'uppercase' },
  timelineSubHeaderCount: { fontSize: 10.5, fontWeight: '800', color: THEME.textSecondary },
  timelineSubTrack: { height: 3, borderRadius: 2, backgroundColor: '#EEF0F2', overflow: 'hidden', marginBottom: 8 },
  timelineSubFill: { height: '100%', borderRadius: 2, backgroundColor: THEME.success },
  timelineSubList: { gap: 6 },
  timelineSubRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  timelineSubRowText: { flex: 1, fontSize: 11.5, fontWeight: '600', color: THEME.text, minWidth: 0 },
  timelineSubRowTextDone: { color: THEME.success },
  timelineSubRowDate: { fontSize: 10, fontWeight: '700', color: THEME.textSecondary, flexShrink: 0 },
  timelineSubRowDateMuted: { fontSize: 10, fontWeight: '600', color: THEME.muted, flexShrink: 0 },
  fixedFooter: {
    paddingHorizontal: 16, paddingTop: 8,
    backgroundColor: THEME.bg, borderTopWidth: 1, borderTopColor: '#E9EAEC',
  },
  footerSyncBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 13, borderRadius: 12, backgroundColor: THEME.primary,
    elevation: 3, shadowColor: THEME.primary, shadowOpacity: 0.25, shadowRadius: 8,
  },
  footerSyncBtnDisabled: { backgroundColor: '#E5E7EB', elevation: 0, shadowOpacity: 0 },
  footerSyncText: { fontSize: 14, fontWeight: '800', color: '#FFF' },
  viewOnlyNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13 },
  viewOnlyText: { fontSize: 12, fontWeight: '600', color: THEME.muted, textAlign: 'center' },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  modalKeyboardContext: { width: '100%', maxWidth: 340 },
  modalCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 16, padding: 20, elevation: 8 },
  modalIndicatorBar: {
    width: 36, height: 4, backgroundColor: THEME.border, borderRadius: 2,
    alignSelf: 'center', marginBottom: 14,
  },
  modalHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  modalIconBox: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: THEME.text },
  modalDesc: { fontSize: 12, color: THEME.textSecondary, marginBottom: 16 },
  modalFormBody: { gap: 12 },
  modalField: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: THEME.text },
  dateInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: THEME.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 11, backgroundColor: '#F9FAFB',
  },
  dateText: { flex: 1, fontSize: 13, color: THEME.text, fontWeight: '600' },
  remarksInput: {
    borderWidth: 1, borderColor: THEME.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 13,
    color: THEME.text, backgroundColor: '#F9FAFB', minHeight: 64,
  },
  subStepList: { gap: 8 },
  subStepRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F9FAFB', borderRadius: 10,
    borderWidth: 1, borderColor: '#F0F1F3',
    paddingHorizontal: 12, paddingVertical: 10,
  },
  subStepRowDone: { backgroundColor: THEME.successLight, borderColor: 'rgba(25,135,84,0.18)' },
  subStepCheckbox: { padding: 2 },
  subStepBody: { flex: 1, minWidth: 0, gap: 3 },
  subStepText: { fontSize: 13.5, fontWeight: '700', color: THEME.text },
  subStepTextDone: { color: THEME.success },
  subDateRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  subDateText: { fontSize: 11.5, fontWeight: '600', color: THEME.textSecondary },
  subDoneChip: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#FFF', borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: 'rgba(25,135,84,0.25)',
  },
  subDoneChipText: { fontSize: 10, fontWeight: '800', color: THEME.success },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.62)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28,
  },
  confirmCard: {
    width: '100%', maxWidth: 320, backgroundColor: '#FFF', borderRadius: 18,
    padding: 22, alignItems: 'center', elevation: 10,
  },
  confirmIconBg: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: THEME.warningLight,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  confirmTitle: { fontSize: 16, fontWeight: '800', color: THEME.text, marginBottom: 8, textAlign: 'center' },
  confirmMessage: { fontSize: 12.5, color: THEME.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 20 },
  confirmActionsRow: { flexDirection: 'row', gap: 10, width: '100%' },
  confirmCancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    borderWidth: 1, borderColor: THEME.border, alignItems: 'center',
  },
  confirmCancelText: { fontWeight: '700', color: THEME.textSecondary, fontSize: 13 },
  confirmSkipBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 10,
    backgroundColor: THEME.warning, alignItems: 'center',
  },
  confirmSkipText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  skippedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: THEME.warningLight, borderRadius: 8,
    paddingVertical: 7, paddingHorizontal: 10, marginBottom: 12,
  },
  skippedBannerText: { fontSize: 11, fontWeight: '600', color: '#92400E', flex: 1 },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: THEME.warning, borderRadius: 8,
    paddingVertical: 10, marginTop: 14,
  },
  skipBtnText: { fontSize: 12, fontWeight: '700', color: THEME.warning, textAlign: 'center' },
  modalActionsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: THEME.border, alignItems: 'center',
  },
  cancelBtnText: { fontWeight: '600', color: THEME.textSecondary, fontSize: 13 },
  saveBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 8,
    backgroundColor: THEME.primary, alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // ---- Update History modal ----
  historyModalCard: { maxWidth: 400 },
  historyRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F1F3' },
  historyRowHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 2 },
  historyStep: { flex: 1, fontSize: 13, fontWeight: '700', color: THEME.text },
  historyWhen: { fontSize: 10.5, color: THEME.muted, flexShrink: 0 },
  historyBy: { fontSize: 11.5, color: THEME.textSecondary, marginBottom: 4 },
  historyChangeLine: { fontSize: 12, color: THEME.text, paddingVertical: 1, lineHeight: 17 },
});