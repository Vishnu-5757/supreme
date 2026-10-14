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
            <Text style={s.topTitle} numberOfLines={1}>My Profile</Text>
            <Text style={s.topSub} numberOfLines={1}>Manage your account</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView style={s.scrollOuter} showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* ── Hero profile card ── */}
        <View style={s.profileCard}>
          <View pointerEvents="none" style={s.cardWatermark} />

          <View style={s.cardTopRow}>
            <View style={s.avatarCircle}>
              <Text style={s.avatarTxt}>{initials}</Text>
            </View>
            <TouchableOpacity
              style={s.editIconBtn}
              onPress={() => navigation.navigate('EditProfile', { user: { ...user, username: localUsername } })}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons name="pencil-outline" size={13} color={P} />
            </TouchableOpacity>
          </View>

          <Text style={s.name} numberOfLines={1}>{displayName || 'User'}</Text>
          {role ? <Text style={s.roleTxt}>{role}</Text> : null}

          {email ? (
            <View style={s.infoRow}>
              <MaterialCommunityIcons name="email-outline" size={11} color="#9CA3AF" />
              <Text style={s.infoTxt} numberOfLines={1}>{email}</Text>
            </View>
          ) : null}

          {branchName ? (
            <View style={s.chips}>
              <View style={s.chip}>
                <MaterialCommunityIcons name="office-building-outline" size={10} color={P} />
                <Text style={s.chipTxt}>{branchName}</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── Account ── */}
        <Text style={s.sectionLabel}>ACCOUNT</Text>
        <View style={s.menuCard}>
          <Row
            icon="lock-outline" iconColor="#6B7280" iconBg="#F3F4F6"
            label="Change Password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <View style={s.sep} />
          <Row
            icon="bell-outline" iconColor="#6B7280" iconBg="#F3F4F6"
            label="Notifications"
            onPress={() => navigation.navigate('Notifications')}
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
              <MaterialCommunityIcons name="logout-variant" size={24} color="#DC2626" />
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
        <MaterialCommunityIcons name={icon} size={16} color={iconColor} />
      </View>
      <Text style={[s.rowLabel, labelColor ? { color: labelColor } : null]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color={labelColor ?? '#D1D5DB'} style={{ opacity: labelColor ? 0.5 : 1 }} />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F4F5F7' },

  /* rounded header */
  topBar: {
    backgroundColor: P,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 18,
  },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flex: 1, justifyContent: 'center', paddingHorizontal: 10 },
  topIconCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  topAvatarTxt: { fontSize: 20, fontWeight: '800', color: P },
  topTitle: { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)' },

  scrollOuter: { flex: 1, backgroundColor: '#F4F5F7', borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  scroll: { paddingTop: 18, paddingHorizontal: 14, paddingBottom: 36 },

  /* hero profile card — premium "credit card" style */
  profileCard: {
    position: 'relative',
    backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(142,28,28,0.08)',
    elevation: 4,
    shadowColor: '#421313', shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
  },
  cardWatermark: {
    position: 'absolute', top: -22, right: -22,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: 'rgba(142,28,28,0.045)',
  },
  cardTopRow: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    marginBottom: 10,
  },
  editIconBtn: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#FFF5F5',
    borderWidth: 1, borderColor: '#FECDD3',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: P, alignItems: 'center', justifyContent: 'center',
  },
  avatarTxt:   { fontSize: 17, fontWeight: '800', color: '#FFF' },

  name:        { fontSize: 15, fontWeight: '800', color: '#111827', letterSpacing: -0.3, marginBottom: 2 },
  roleTxt:     { fontSize: 11, color: '#9CA3AF', fontWeight: '600', marginBottom: 6 },
  infoRow:     { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 7 },
  infoTxt:     { fontSize: 11, color: '#6B7280', fontWeight: '500' },
  chips:       { flexDirection: 'row', gap: 5, flexWrap: 'wrap' },
  chip:        { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 999, backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#FECDD3' },
  chipTxt:     { fontSize: 9.5, fontWeight: '700', color: P },

  /* menu */
  sectionLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 1, marginBottom: 6 },
  menuCard: {
    backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden',
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  logoutCard: {
    borderWidth: 1.5, borderColor: '#FEE2E2',
    shadowColor: '#DC2626', shadowOpacity: 0.06,
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, gap: 10 },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { flex: 1, fontSize: 13.5, fontWeight: '600', color: '#111827' },
  sep: { height: 1, backgroundColor: '#F3F4F6', marginLeft: 54 },
});

const m = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 36 },
  box: {
    backgroundColor: '#FFF', borderRadius: 20, alignItems: 'center',
    width: '100%', maxWidth: 290, overflow: 'hidden',
    elevation: 24, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 28, shadowOffset: { width: 0, height: 12 },
  },
  iconBox: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center', marginTop: 22, marginBottom: 10 },
  title:   { fontSize: 15.5, fontWeight: '800', color: '#111827' },
  sub:     { fontSize: 11.5, color: '#6B7280', textAlign: 'center', marginTop: 5, marginBottom: 18, paddingHorizontal: 20 },
  divider: { height: 1, width: '100%', backgroundColor: '#F3F4F6' },
  row:     { flexDirection: 'row', width: '100%' },
  btn:     { flex: 1, paddingVertical: 13, alignItems: 'center' },
  vline:   { width: 1, backgroundColor: '#F3F4F6' },
  cancel:  { fontSize: 13.5, fontWeight: '600', color: '#6B7280' },
  logout:  { fontSize: 13.5, fontWeight: '700', color: '#DC2626' },
});
