// screens/MyProgressScreen.tsx
//
// Replaces the locked "Users" tab for non-superusers — instead of a dead
// end, a non-admin sees their own personal snapshot: how many leads,
// projects and service tickets are theirs, scoped to whichever of those
// modules they actually have. Every count comes straight from that
// module's own list API — the same endpoints Leads/Projects/Service
// already call — which already restrict a regular user to their own
// records server-side, so no new backend aggregation was needed.
//
// Header matches every other tab (Leads/Projects/Service) exactly — flat
// THEME.primary bar, title+subtitle left, bell+account-menu right. The
// body below is where this screen earns its keep: a bar comparison across
// modules and a donut ring for service-ticket completion, instead of a
// flat list of numbers.
import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Svg, { Circle } from 'react-native-svg';
import { useFocusEffect } from '@react-navigation/native';
import { useAuthApi } from '../hooks/useAuthApi';
import { usePermissionContext } from '../hooks/PermissionContext';
import { userCache } from '../hooks/userCache';
import { API_BASE_URL } from '../config';
import { clearBadge, getBadgeCount, subscribeBadge } from '../hooks/notifBadge';
import { AccountMenu } from '../components/AccountMenu';

const THEME = {
  primary: '#8E1C1C',
  primaryLight: '#FCE9E9',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  text: '#0F172A',
  textSecondary: '#475569',
  muted: '#64748B',
  border: '#ECEEF1',
  success: '#16A34A',
  successLight: '#ECFDF5',
  warning: '#D97706',
  warningLight: '#FFFBEB',
  info: '#2563EB',
  infoLight: '#EFF6FF',
  gold: '#B45309',
  goldLight: '#FFFBEB',
  // One-color palette for the overview chart — same maroon as the header,
  // just at decreasing strength per bar instead of mixing different hues.
  tone1: '#8E1C1C',
  tone2: 'rgba(142,28,28,0.72)',
  tone3: 'rgba(142,28,28,0.45)',
};

type Counts = { total: number; secondary?: number; secondaryLabel?: string } | null;

export default function MyProgressScreen({ navigation }: any) {
  const { apiRequest } = useAuthApi();
  const { canAccess, loading: permsLoading } = usePermissionContext();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifCount, setNotifCount] = useState(() => getBadgeCount());
  React.useEffect(() => subscribeBadge(setNotifCount), []);
  const [leadCounts, setLeadCounts] = useState<Counts>(null);
  const [projectCounts, setProjectCounts] = useState<Counts>(null);
  const [serviceCounts, setServiceCounts] = useState<Counts>(null);
  const [convertedThisMonth, setConvertedThisMonth] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [followUpsTotal, setFollowUpsTotal] = useState(0);

  const hasLead = canAccess('lead');
  const hasProject = canAccess('project');
  const hasService = canAccess('service');
  const hasAnyModule = hasLead || hasProject || hasService;

  const countFrom = useCallback(
    async (url: string) => {
      try {
        const res = await apiRequest(url);
        if (!res.ok) return 0;
        const json = await res.json();
        return json.count ?? 0;
      } catch {
        return 0;
      }
    },
    [apiRequest],
  );

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const jobs: Promise<void>[] = [];

        if (hasLead) {
          jobs.push(
            countFrom(`${API_BASE_URL}/lead/api/leads/?view_type=mine&page_size=1`).then(total =>
              setLeadCounts({ total }),
            ),
          );
          const now = new Date();
          const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
          const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          jobs.push(
            countFrom(
              `${API_BASE_URL}/lead/api/leads/?view_type=mine&page_size=1&is_converted=true&converted_date_from=${toDateStr(firstOfMonth)}&converted_date_to=${toDateStr(now)}`,
            ).then(setConvertedThisMonth),
          );
          // Follow-ups due today or overdue, not yet converted — the one
          // thing Dashboard's "recent activity" feed never surfaces.
          jobs.push(
            (async () => {
              try {
                const res = await apiRequest(
                  `${API_BASE_URL}/lead/api/leads/?view_type=mine&page_size=5&is_converted=false&follow_up_before=${encodeURIComponent(now.toISOString())}`,
                );
                if (!res.ok) return;
                const json = await res.json();
                setFollowUps(json.results || []);
                setFollowUpsTotal(json.count ?? 0);
              } catch {
                setFollowUps([]);
                setFollowUpsTotal(0);
              }
            })(),
          );
        } else {
          setLeadCounts(null);
          setConvertedThisMonth(null);
          setFollowUps([]);
          setFollowUpsTotal(0);
        }

        if (hasProject) {
          jobs.push(
            countFrom(`${API_BASE_URL}/project/api/projects/?page_size=1`).then(total =>
              setProjectCounts({ total }),
            ),
          );
        } else {
          setProjectCounts(null);
        }

        if (hasService) {
          jobs.push(
            Promise.all([
              countFrom(`${API_BASE_URL}/service/api/services/?page_size=1`),
              countFrom(`${API_BASE_URL}/service/api/services/?status=completed&page_size=1`),
            ]).then(([total, completed]) =>
              setServiceCounts({ total, secondary: completed, secondaryLabel: 'Completed' }),
            ),
          );
        } else {
          setServiceCounts(null);
        }

        await Promise.all(jobs);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [countFrom, hasLead, hasProject, hasService],
  );

  useFocusEffect(
    useCallback(() => {
      if (!permsLoading) load(true);
    }, [permsLoading, load]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const user = userCache.current;
  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name ?? ''}`.trim()
    : user?.username ?? 'there';
  const branchName = user?.profile?.branch?.name ?? null;

  const serviceOpen = serviceCounts ? Math.max(0, serviceCounts.total - (serviceCounts.secondary ?? 0)) : 0;
  const serviceDonePct = serviceCounts && serviceCounts.total > 0
    ? Math.round(((serviceCounts.secondary ?? 0) / serviceCounts.total) * 100)
    : 0;

  // Compact number chips — whichever of these the viewer actually has.
  const chips: { icon: string; label: string; value: number; onPress: () => void }[] = [];
  if (hasLead && leadCounts) {
    chips.push({ icon: 'account-group-outline', label: 'Leads', value: leadCounts.total, onPress: () => navigation.navigate('Leads') });
  }
  if (hasLead && convertedThisMonth != null) {
    chips.push({ icon: 'trophy-outline', label: 'Converted', value: convertedThisMonth, onPress: () => navigation.navigate('Leads') });
  }
  if (hasProject && projectCounts) {
    chips.push({ icon: 'briefcase-outline', label: 'Projects', value: projectCounts.total, onPress: () => navigation.navigate('Projects') });
  }

  return (
    <View style={{ flex: 1, backgroundColor: THEME.primary }}>
      <StatusBar barStyle="light-content" backgroundColor={THEME.primary} />
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.headerWrap}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerTitle}>My Progress</Text>
              <Text style={styles.headerSubtitle}>Hi {displayName}{branchName ? ` · ${branchName}` : ''}</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.iconBtn}
                onPress={() => { clearBadge(); navigation.navigate('Notifications'); }}
              >
                <MaterialCommunityIcons name="bell-outline" size={18} color="#FFF" />
                {notifCount > 0 && (
                  <View style={styles.notifBadge}>
                    <Text style={styles.notifBadgeText}>{notifCount > 9 ? '9+' : String(notifCount)}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <AccountMenu navigation={navigation} />
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={THEME.primary} colors={[THEME.primary]} />}
        >
          {permsLoading || loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={THEME.primary} />
            </View>
          ) : !hasAnyModule ? (
            <View style={styles.emptyWrap}>
              <MaterialCommunityIcons name="clipboard-text-off-outline" size={40} color={THEME.muted} />
              <Text style={styles.emptyTitle}>No modules assigned yet</Text>
              <Text style={styles.emptySub}>Ask your admin to give you access to Leads, Projects or Service to see your work here.</Text>
            </View>
          ) : (
            <>
              {chips.length > 0 && (
                <View style={styles.chipsRow}>
                  {chips.map((c, i) => (
                    <TouchableOpacity key={i} style={styles.chip} onPress={c.onPress} activeOpacity={0.8}>
                      <MaterialCommunityIcons name={c.icon} size={14} color={THEME.tone1} />
                      <Text style={styles.chipValue}>{c.value}</Text>
                      <Text style={styles.chipLabel}>{c.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {hasLead && (
                <View style={styles.card}>
                  <View style={styles.followUpsHead}>
                    <Text style={styles.cardLabel}>Follow-ups Due</Text>
                    {followUpsTotal > 0 && (
                      <View style={styles.followUpsBadge}>
                        <Text style={styles.followUpsBadgeText}>{followUpsTotal}</Text>
                      </View>
                    )}
                  </View>

                  {followUps.length === 0 ? (
                    <View style={styles.followUpsEmpty}>
                      <MaterialCommunityIcons name="calendar-check-outline" size={22} color={THEME.muted} />
                      <Text style={styles.followUpsEmptyText}>Nothing due — you're all caught up.</Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 6 }}>
                      {followUps.map((lead, i) => (
                        <FollowUpRow
                          key={lead.id}
                          lead={lead}
                          isLast={i === followUps.length - 1}
                          onPress={() => navigation.navigate('AddEditLead', {
                            lead,
                            onSuccess: () => load(true),
                          })}
                        />
                      ))}
                      {followUpsTotal > followUps.length && (
                        <TouchableOpacity style={styles.viewAllRow} onPress={() => navigation.navigate('Leads')} activeOpacity={0.8}>
                          <Text style={styles.viewAllText}>View {followUpsTotal - followUps.length} more in Leads</Text>
                          <MaterialCommunityIcons name="chevron-right" size={16} color={THEME.tone1} />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              )}

              {hasService && serviceCounts && (
                <TouchableOpacity
                  style={styles.card}
                  activeOpacity={0.88}
                  onPress={() => navigation.navigate('Service')}
                >
                  <View style={styles.serviceTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardLabel}>My Service Tickets</Text>
                      <Text style={styles.serviceTotalText}>{serviceCounts.total} total</Text>
                      <View style={styles.serviceLegend}>
                        <View style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: THEME.tone1 }]} />
                          <Text style={styles.legendText}>{serviceCounts.secondary ?? 0} Completed</Text>
                        </View>
                        <View style={styles.legendRow}>
                          <View style={[styles.legendDot, { backgroundColor: THEME.border }]} />
                          <Text style={styles.legendText}>{serviceOpen} Open</Text>
                        </View>
                      </View>
                    </View>
                    <DonutRing pct={serviceDonePct} />
                  </View>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Relative label for a follow-up date: "Today", "Yesterday",
// "3 days overdue", or a plain date further back ─────────────────────
const followUpLabel = (iso: string | null): { text: string; overdue: boolean } => {
  if (!iso) return { text: '', overdue: false };
  const due = new Date(iso);
  const now = new Date();
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((today.getTime() - dueDay.getTime()) / 86400000);

  if (diffDays === 0) return { text: 'Today', overdue: false };
  if (diffDays === 1) return { text: 'Yesterday', overdue: true };
  if (diffDays > 1) return { text: `${diffDays} days overdue`, overdue: true };
  return { text: due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), overdue: false };
};

// ─── One row in the Follow-ups Due card ─────────────────────────────
const FollowUpRow = ({ lead, isLast, onPress }: any) => {
  const { text, overdue } = followUpLabel(lead.follow_up_date);
  return (
    <TouchableOpacity
      style={[styles.followUpRow, !isLast && styles.followUpRowBorder]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.followUpDot} />
      <View style={{ flex: 1 }}>
        <Text style={styles.followUpName} numberOfLines={1}>{lead.customer_name}</Text>
        <Text style={styles.followUpMobile} numberOfLines={1}>{lead.mobile}</Text>
      </View>
      <Text style={[styles.followUpWhen, overdue && styles.followUpWhenOverdue]}>{text}</Text>
      <MaterialCommunityIcons name="chevron-right" size={16} color={THEME.muted} />
    </TouchableOpacity>
  );
};

// ─── Donut ring (SVG) for the service completion ratio ─────────────
const DonutRing = ({ pct }: { pct: number }) => {
  const size = 92;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const [animatedPct, setAnimatedPct] = useState(0);

  React.useEffect(() => {
    const id = progressAnim.addListener(({ value }) => setAnimatedPct(value));
    Animated.timing(progressAnim, { toValue: pct, duration: 750, useNativeDriver: false }).start();
    return () => progressAnim.removeListener(id);
  }, [pct]);

  const strokeDashoffset = circumference * (1 - animatedPct / 100);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={THEME.border} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={THEME.tone1} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <View style={StyleSheet.absoluteFillObject}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={styles.donutPct}>{Math.round(animatedPct)}%</Text>
          <Text style={styles.donutLabel}>Done</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  headerWrap: {
    backgroundColor: THEME.primary,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
  },
  headerTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1, paddingRight: 10 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#FFF', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.78)', marginTop: 2, fontWeight: '500' },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)',
  },
  notifBadge: {
    position: 'absolute', top: 2, right: 2, minWidth: 15, height: 15, borderRadius: 8,
    backgroundColor: '#FF3B30', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3, borderWidth: 1.5, borderColor: THEME.primary,
  },
  notifBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '900', lineHeight: 10 },
  body: { flex: 1, backgroundColor: THEME.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: 'hidden' },
  bodyContent: { padding: 16, paddingBottom: 100, gap: 12 },
  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  emptyWrap: { paddingTop: 60, alignItems: 'center', gap: 8, paddingHorizontal: 30 },
  emptyTitle: { fontSize: 15, fontWeight: '800', color: THEME.text, marginTop: 6 },
  emptySub: { fontSize: 12.5, color: THEME.muted, textAlign: 'center', lineHeight: 18 },
  card: {
    backgroundColor: THEME.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: THEME.border,
  },
  cardLabel: {
    fontSize: 11.5, fontWeight: '800', color: THEME.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  // ---- compact number chips ----
  chipsRow: { flexDirection: 'row', gap: 8 },
  chip: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: THEME.card, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 10,
    borderWidth: 1, borderColor: THEME.border,
  },
  chipValue: { fontSize: 14, fontWeight: '800', color: THEME.text },
  chipLabel: { fontSize: 10.5, fontWeight: '600', color: THEME.muted, flexShrink: 1 },
  // ---- follow-ups card ----
  followUpsHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  followUpsBadge: {
    minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6,
    backgroundColor: THEME.tone1, alignItems: 'center', justifyContent: 'center',
  },
  followUpsBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  followUpsEmpty: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  followUpsEmptyText: { fontSize: 12.5, color: THEME.muted, fontWeight: '500' },
  followUpRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11 },
  followUpRowBorder: { borderBottomWidth: 1, borderBottomColor: THEME.border },
  followUpDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: THEME.tone1 },
  followUpName: { fontSize: 13, fontWeight: '700', color: THEME.text },
  followUpMobile: { fontSize: 11, color: THEME.muted, marginTop: 1 },
  followUpWhen: { fontSize: 11, fontWeight: '700', color: THEME.textSecondary },
  followUpWhenOverdue: { color: THEME.tone1 },
  viewAllRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 12 },
  viewAllText: { fontSize: 12.5, fontWeight: '700', color: THEME.tone1 },
  // ---- service donut card ----
  serviceTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  serviceTotalText: { fontSize: 20, fontWeight: '800', color: THEME.text, marginTop: 4 },
  serviceLegend: { marginTop: 10, gap: 6 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 12, fontWeight: '600', color: THEME.textSecondary },
  donutPct: { fontSize: 16, fontWeight: '800', color: THEME.text },
  donutLabel: { fontSize: 9, fontWeight: '700', color: THEME.muted, marginTop: -2 },
});
