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
import { userCache } from '../hooks/userCache';

const P = '#8E1C1C';

// ── Floating label input ──────────────────────────────────────────────────────
function FloatInput({ label, value, onChangeText, icon, returnKeyType = 'done', onSubmitEditing, inputRef }: {
  label: string; value: string; onChangeText: (v: string) => void;
  icon: string; returnKeyType?: 'done' | 'next';
  onSubmitEditing?: () => void; inputRef?: React.RefObject<TextInput>;
}) {
  const [focused, setFocused] = useState(false);
  const anim = useRef(new Animated.Value(value.length > 0 ? 1 : 0)).current;
  const active = focused || value.length > 0;

  useEffect(() => {
    Animated.timing(anim, { toValue: active ? 1 : 0, duration: 190, useNativeDriver: false }).start();
  }, [active]);

  const labelH  = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] });
  const labelOp = anim.interpolate({ inputRange: [0, 0.5], outputRange: [0, 1], extrapolate: 'clamp' });

  return (
    <View>
      <Animated.View style={{ height: labelH, opacity: labelOp, justifyContent: 'flex-end', paddingBottom: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: focused ? P : '#6B7280', letterSpacing: 0.4 }}>
          {label}
        </Text>
      </Animated.View>
      <View style={[fi.row, { borderColor: focused ? P : '#E5E7EB', backgroundColor: focused ? '#FFFBFB' : '#F9FAFB' }]}>
        <View style={fi.iconWrap}>
          <MaterialCommunityIcons name={icon} size={18} color={focused ? P : '#9CA3AF'} />
        </View>
        <TextInput
          ref={inputRef}
          style={fi.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={active ? '' : label}
          placeholderTextColor="#C4C9D4"
          autoCapitalize="none"
          autoCorrect={false}
          selectionColor={P}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

const fi = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', height: 54, borderRadius: 12, borderWidth: 1.5 },
  iconWrap: { width: 44, alignItems: 'center', justifyContent: 'center' },
  input:    { flex: 1, fontSize: 15, color: '#111827', height: '100%' },
});

// ── Screen ────────────────────────────────────────────────────────────────────
export default function EditProfileScreen({ navigation, route }: any) {
  const { user } = route.params ?? {};
  const [username, setUsername] = useState(user?.username ?? '');
  const [error,    setError]    = useState('');
  const [saving,   setSaving]   = useState(false);
  const { apiRequest } = useAuthApi();

  const initial = (username?.[0] || 'U').toUpperCase();

  const handleSave = async () => {
    setError('');
    if (!username.trim()) { setError('Username cannot be empty.'); return; }
    setSaving(true);
    try {
      const res = await apiRequest(`${API_BASE_URL}/api/profile/update/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });
      if (res.ok) {
        if (userCache.current) userCache.current.username = username.trim();
        navigation.goBack();
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err?.detail || err?.error || 'Could not update username.');
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
              <MaterialCommunityIcons name="account-edit-outline" size={24} color={P} />
            </View>
            <Text style={s.topTitle}>Edit Profile</Text>
            <Text style={s.topSub}>Change your username</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#F4F5F7', marginTop: -24 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Avatar preview */}
          <View style={s.preview}>
            <View style={s.avatarWrap}>
              <View style={s.avatarCircle}>
                <Text style={s.avatarTxt}>{initial}</Text>
              </View>
            </View>
            <Text style={s.previewNote}>Updates as you type</Text>
          </View>

          {/* Form */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Change Username</Text>
            <Text style={s.cardSub}>Your username is used to log in to the app.</Text>
            <View style={{ height: 20 }} />
            <FloatInput
              label="Username"
              value={username}
              onChangeText={t => { setUsername(t); setError(''); }}
              icon="at"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {error ? (
              <View style={s.errorRow}>
                <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#EF4444" />
                <Text style={s.errorTxt}>{error}</Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.65 }]} onPress={handleSave} disabled={saving} activeOpacity={0.85}>
            {saving
              ? <ActivityIndicator size="small" color="#FFF" />
              : <><MaterialCommunityIcons name="content-save-outline" size={19} color="#FFF" /><Text style={s.saveTxt}>Save Changes</Text></>}
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
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 18,
    borderBottomLeftRadius: 24, borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: P, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flex: 1, alignItems: 'center', gap: 4 },
  topIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)' },

  scroll: { paddingHorizontal: 16, paddingTop: 29, paddingBottom: 48 },

  preview: { alignItems: 'center', marginBottom: 24 },
  avatarWrap: {
    width: 86, height: 86, borderRadius: 43,
    backgroundColor: '#FFF5F5', borderWidth: 2, borderColor: '#FECDD3',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    elevation: 4, shadowColor: P, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  avatarCircle: { width: 74, height: 74, borderRadius: 37, backgroundColor: P, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:    { fontSize: 28, fontWeight: '800', color: '#FFF' },
  previewNote:  { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  card: { backgroundColor: '#FFF', borderRadius: 16, padding: 20, marginBottom: 14, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 16, fontWeight: '800', color: '#111827', marginBottom: 4 },
  cardSub:   { fontSize: 13, color: '#9CA3AF', fontWeight: '500' },

  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 8 },
  errorTxt: { fontSize: 12, color: '#EF4444', fontWeight: '600', flex: 1 },

  saveBtn: { height: 52, borderRadius: 14, backgroundColor: P, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, elevation: 4, shadowColor: P, shadowOpacity: 0.28, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  saveTxt:  { fontSize: 15, fontWeight: '800', color: '#FFF' },

  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelTxt: { fontSize: 14, fontWeight: '600', color: '#9CA3AF' },
});
