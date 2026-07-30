import React, { useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  StatusBar, Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect } from '@react-navigation/native';
import { clearAuthTokens } from '../hooks/useAuthApi';
import { userCache } from '../hooks/userCache';

const P = '#8E1C1C';

export default function ProfileScreen({ navigation, route }: any) {
  const { user } = route.params ?? {};
  const [localUsername, setLocalUsername] = useState<string>(user?.username ?? '');
  const [confirm, setConfirm]   = useState(false);
  const [loggingOut, setOut]    = useState(false);

  useFocusEffect(useCallback(() => {
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(P);
    if (userCache.current?.username) setLocalUsername(userCache.current.username);
  }, []));

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ''}`.trim()
    : localUsername;

  const initials   = displayName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2) || 'U';
  const branchName = user?.profile?.branch?.name ?? null;
  const role       = user?.is_superuser ? 'Superuser' : user?.profile?.role ?? null;
  const email      = user?.email ?? null;

  const doLogout = async () => {
    setOut(true);
    try { clearAuthTokens(); userCache.current = null; navigation.replace('Login'); }
    finally { setOut(false); }
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
              <Text style={s.topAvatarTxt}>{initials}</Text>
            </View>
            <Text style={s.topTitle}>My Profile</Text>
            <Text style={s.topSub}>Manage your account</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView style={s.scrollOuter} showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Horizontal profile card ── */}
        <View style={s.profileCard}>
          <View style={s.avatarWrap}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarTxt}>{initials}</Text>
            </View>
          </View>

          <View style={s.profileInfo}>
            <Text style={s.name} numberOfLines={1}>{displayName || 'User'}</Text>
            <Text style={s.username}>@{localUsername}</Text>
            {email ? (
              <View style={s.infoRow}>
                <MaterialCommunityIcons name="email-outline" size={13} color="#9CA3AF" />
                <Text style={s.infoTxt} numberOfLines={1}>{email}</Text>
              </View>
            ) : null}
            {(branchName || role) ? (
              <View style={s.chips}>
                {branchName ? (
                  <View style={[s.chip, { backgroundColor: '#FFF5F5', borderColor: '#FECDD3' }]}>
                    <MaterialCommunityIcons name="office-building-outline" size={11} color={P} />
                    <Text style={[s.chipTxt, { color: P }]}>{branchName}</Text>
                  </View>
                ) : null}
                {role ? (
                  <View style={[s.chip, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                    <MaterialCommunityIcons name="shield-check-outline" size={11} color="#2563EB" />
                    <Text style={[s.chipTxt, { color: '#2563EB' }]}>{role}</Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        </View>

        {/* ── Account ── */}
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.menuCard}>
          <Row
            icon="account-edit-outline" iconColor={P} iconBg="#FFF5F5"
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile', { user: { ...user, username: localUsername } })}
          />
          <View style={s.sep} />
          <Row
            icon="lock-outline" iconColor="#2563EB" iconBg="#EFF6FF"
            label="Change Password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </View>

        {/* ── Session ── */}
        <Text style={s.sectionLabel}>SESSION</Text>
        <View style={[s.menuCard, s.logoutCard]}>
          <Row
            icon="logout-variant" iconColor="#DC2626" iconBg="#FFF0F0"
            label="Log Out" labelColor="#DC2626"
            onPress={() => setConfirm(true)}
          />
        </View>

        </ScrollView>
      </SafeAreaView>

      {/* ── Confirm modal ── */}
      <Modal visible={confirm} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setConfirm(false)}>
        <View style={m.overlay}>
          <View style={m.box}>
            <View style={m.iconBox}>
              <MaterialCommunityIcons name="logout-variant" size={30} color="#DC2626" />
            </View>
            <Text style={m.title}>Log out?</Text>
            <Text style={m.sub}>You'll need to sign in again to continue.</Text>
            <View style={m.divider} />
            <View style={m.row}>
              <TouchableOpacity style={m.btn} onPress={() => setConfirm(false)} activeOpacity={0.7}>
                <Text style={m.cancel}>Cancel</Text>
              </TouchableOpacity>
              <View style={m.vline} />
              <TouchableOpacity style={m.btn} onPress={() => { setConfirm(false); doLogout(); }} disabled={loggingOut} activeOpacity={0.7}>
                {loggingOut ? <ActivityIndicator size="small" color="#DC2626" /> : <Text style={m.logout}>Log Out</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Row({ icon, iconColor, iconBg, label, labelColor, onPress }: any) {
  return (
    <TouchableOpacity style={s.row} onPress={onPress} activeOpacity={0.65}>
      <View style={[s.rowIcon, { backgroundColor: iconBg }]}>
        <MaterialCommunityIcons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={[s.rowLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={18} color={labelColor ?? '#D1D5DB'} style={{ opacity: labelColor ? 0.5 : 1 }} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5F7' },

  /* rounded header */
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
  topAvatarTxt: { fontSize: 20, fontWeight: '800', color: P },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)' },

  scrollOuter: { flex: 1, backgroundColor: '#F4F5F7', marginTop: -24 },
  scroll: { paddingTop: 29, paddingHorizontal: 16, paddingBottom: 48 },

  /* horizontal profile card */
  profileCard: {
    backgroundColor: '#FFF', borderRadius: 18,
    padding: 20, flexDirection: 'row', alignItems: 'center', gap: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
  },
  avatarWrap: {
    width: 74, height: 74, borderRadius: 37,
    backgroundColor: '#FFF5F5',
    borderWidth: 2, borderColor: '#FECDD3',
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: P, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 3 },
    flexShrink: 0,
  },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:   { fontSize: 24, fontWeight: '800', color: '#FFF' },

  profileInfo: { flex: 1 },
  name:        { fontSize: 18, fontWeight: '800', color: '#111827', letterSpacing: -0.3, marginBottom: 2 },
  username:    { fontSize: 13, color: '#9CA3AF', fontWeight: '500', marginBottom: 6 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 },
  infoTxt:     { fontSize: 12, color: '#9CA3AF', fontWeight: '500', flex: 1 },
  chips:       { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1 },
  chipTxt:     { fontSize: 11, fontWeight: '700' },

  /* menu */
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1.1, marginBottom: 8 },
  menuCard: {
    backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  logoutCard: {
    borderWidth: 1.5, borderColor: '#FEE2E2',
    shadowColor: '#DC2626', shadowOpacity: 0.06,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowIcon: { width: 36, height: 36, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#111827' },
  sep: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 64 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36 },
  box: {
    backgroundColor: '#FFF', borderRadius: 24, alignItems: 'center',
    width: '100%', maxWidth: 320, overflow: 'hidden',
    elevation: 24, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 12 },
  },
  iconBox: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginTop: 28, marginBottom: 12 },
  title:   { fontSize: 18, fontWeight: '800', color: '#111827' },
  sub:     { fontSize: 13, color: '#6B7280', textAlign: 'center', marginTop: 6, marginBottom: 24, paddingHorizontal: 24 },
  divider: { height: 1, width: '100%', backgroundColor: '#F3F4F6' },
  row:     { flexDirection: 'row', width: '100%' },
  btn:     { flex: 1, paddingVertical: 16, alignItems: 'center' },
  vline:   { width: 1, backgroundColor: '#F3F4F6' },
  cancel:  { fontSize: 15, fontWeight: '600', color: '#6B7280' },
  logout:  { fontSize: 15, fontWeight: '700', color: '#DC2626' },
});
