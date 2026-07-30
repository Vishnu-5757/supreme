import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  StatusBar, Animated, ActivityIndicator,
  Platform, KeyboardAvoidingView, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { API_BASE_URL } from '../config';
import { useAuthApi } from '../hooks/useAuthApi';

const P = '#8E1C1C';

// ── Floating label password field ─────────────────────────────────────────────
function FloatPw({ label, value, onChangeText, icon, show, onToggleShow, returnKeyType = 'done', onSubmitEditing, inputRef, hasError }: {
  label: string; value: string; onChangeText: (v: string) => void;
  icon: string; show: boolean; onToggleShow: () => void;
  returnKeyType?: 'done' | 'next'; onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>; hasError?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value.length > 0 ? 1 : 0)).current;
  const active = focused || value.length > 0;

  useEffect(() => {
    Animated.timing(anim, { toValue: active ? 1 : 0, duration: 190, useNativeDriver: false }).start();
  }, [active]);

  const labelH  = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const labelOp = anim.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' });

  const borderColor = hasError ? '#EF4444' : focused ? P : '#E5E7EB';
  const bgColor     = hasError ? '#FFF5F5' : focused ? '#FFFBFB' : '#F9FAFB';
  const iconColor   = hasError ? '#EF4444' : focused ? P : '#9CA3AF';
  const labelColor  = hasError ? '#EF4444' : focused ? P : '#6B7280';

  return (
    <View>
      <Animated.View style={{ height: labelH, opacity: labelOp, justifyContent: 'flex-end', paddingBottom: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: labelColor, letterSpacing: 0.4 }}>
          {label}
        </Text>
      </Animated.View>
      <View style={[fi.row, { borderColor, backgroundColor: bgColor }]}>
        <View style={fi.iconWrap}>
          <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
        </View>
        <TextInput
          ref={inputRef}
          style={fi.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={active ? '' : label}
          placeholderTextColor="#C4C9D4"
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={P}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <TouchableOpacity style={fi.eyeWrap} onPress={onToggleShow} activeOpacity={0.6}>
          <MaterialCommunityIcons name={show ? 'eye-off-outline' : 'eye-outline'} size={19} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const fi = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', height: 54, borderRadius: 12, borderWidth: 1.5 },
  iconWrap:{ width: 44, alignItems: 'center', justifyContent: 'center' },
  eyeWrap: { width: 44, alignItems: 'center', justifyContent: 'center' },
  input:   { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
});

// ── Strength bar ──────────────────────────────────────────────────────────────
function getStrength(pw: string) {
  if (!pw) return { level: 0, label: '', color: '#E5E7EB' };
  let score = 0;
  if (pw.length >= 8)           score++;
  if (/[A-Z]/.test(pw))        score++;
  if (/[0-9]/.test(pw))        score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak',   color: '#EF4444' };
  if (score === 2) return { level: 2, label: 'Fair',   color: '#F97316' };
  if (score === 3) return { level: 3, label: 'Good',   color: '#EAB308' };
  return                   { level: 4, label: 'Strong', color: '#22C55E' };
}

// ── Screen ────────────────────────────────────────────────────────────────────
export default function ChangePasswordScreen({ navigation }: any) {
  const [newPw,    setNewPw]    = useState('');
  const [confPw,   setConfPw]   = useState('');
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const { apiRequest } = useAuthApi();
  const confRef = useRef<TextInput>(null);

  const mismatch = !!(newPw && confPw && newPw !== confPw);
  const strength = getStrength(newPw);

  const handleSave = async () => {
    setError('');
    if (!newPw.trim())    { setError('Please enter a new password.');           return; }
    if (newPw.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPw !== confPw) { setError('Passwords do not match.');                 return; }

    setSaving(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/api/profile/update/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPw }),
      });
      if (res.ok) {
        navigation.goBack();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.detail || err?.error || 'Could not update password.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={P} />
      <SafeAreaView style={{ flex: 1, backgroundColor: P }} edges={['top']}>
        <View style={s.topBar}>
          <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={s.topBarCenter}>
            <View style={s.topIconCircle}>
              <MaterialCommunityIcons name="lock-reset" size={24} color={P} />
            </View>
            <Text style={s.topTitle}>Change Password</Text>
            <Text style={s.topSub}>Choose something strong</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F4F5F7', marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Icon + heading */}
          <View style={s.topSection}>
            <View style={s.lockBadge}>
              <MaterialCommunityIcons name="lock-reset" size={30} color={P} />
            </View>
            <Text style={s.heading}>Set a new password</Text>
            <Text style={s.subheading}>Choose something strong and memorable.</Text>
          </View>

          {/* Form */}
          <View style={s.card}>
            <FloatPw
              label="New Password"
              value={newPw}
              onChangeText={t => { setNewPw(t); setError(''); }}
              icon="lock-outline"
              show={showNew}
              onToggleShow={() => setShowNew(v => !v)}
              returnKeyType="next"
              onSubmitEditing={() => confRef.current?.focus()}
            />

            {/* Strength bar */}
            {newPw.length > 0 && (
              <View style={s.strengthRow}>
                <View style={s.strengthBar}>
                  {[1, 2, 3, 4].map(i => (
                    <View key={i} style={[s.seg, { backgroundColor: i <= strength.level ? strength.color : '#E5E7EB' }]} />
                  ))}
                </View>
                <Text style={[s.strengthTxt, { color: strength.color }]}>{strength.label}</Text>
              </View>
            )}

            <View style={{ height: 16 }} />

            <FloatPw
              label="Confirm Password"
              value={confPw}
              onChangeText={t => { setConfPw(t); setError(''); }}
              icon="lock-check-outline"
              show={showConf}
              onToggleShow={() => setShowConf(v => !v)}
              inputRef={confRef}
              returnKeyType="done"
              onSubmitEditing={handleSave}
              hasError={mismatch}
            />

            {/* Single inline error area */}
            {(error || mismatch) ? (
              <View style={s.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
                <Text style={s.errorTxt}>{error || 'Passwords do not match'}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.65 }]}
            onPress={handleSave} disabled={saving} activeOpacity={0.85}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFF" />
              : <>
                  <MaterialCommunityIcons name="lock-check-outline" size={19} color="#FFF" />
                  <Text style={s.saveTxt}>Update Password</Text>
                </>}
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Text style={s.cancelTxt}>Cancel</Text>
          </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5F7' },

  topBar: {
    backgroundColor: P,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 34,
  },
  backBtn:      { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flex: 1, alignItems: 'center', gap: 4 },
  topIconCircle:{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  topTitle:     { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub:       { fontSize: 11, color: 'rgba(255,255,255,0.65)' },

  scroll: { paddingHorizontal: 16, paddingTop: 29, paddingBottom: 48 },

  topSection: { alignItems: 'center', marginBottom: 28 },
  lockBadge: {
    width: 70, height: 70, borderRadius: 18,
    backgroundColor: '#FFF5F5', borderWidth: 1.5, borderColor: '#FECDD3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    elevation: 3, shadowColor: P, shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  heading:    { fontSize: 18, fontWeight: '800', color: '#111827', marginBottom: 4 },
  subheading: { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },

  strengthRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  strengthBar: { flex: 1, flexDirection: 'row', gap: 4 },
  seg:         { flex: 1, height: 4, borderRadius: 2 },
  strengthTxt: { fontSize: 11, fontWeight: '700', width: 44, textAlign: 'right' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  errorTxt: { fontSize: 12, color: '#EF4444', fontWeight: '600', flex: 1 },

  saveBtn: { height: 52, borderRadius: 14, backgroundColor: P, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, elevation: 4, shadowColor: P, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  saveTxt:  { fontSize: 15, fontWeight: '800', color: '#FFF' },

  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
});
