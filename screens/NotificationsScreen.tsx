import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Modal,
  Linking,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { clearBadge, refreshBadgeFromServer } from '../hooks/notifBadge';
import { useAuthApi } from '../hooks/useAuthApi';
import { API_BASE_URL } from '../config';
import { SkeletonNotifCard } from '../components/Skeleton';

const PRIMARY = '#8E1C1C';
const MUTED = '#94A3B8';

type NotificationItem = {
  id: number;
  source: 'lead' | 'project';
  title: string;
  body: string;
  time: string;
  sentAt: string;
  read: boolean;
  lead_id?: number;
  project_id?: number;
  stale?: boolean;
  customerName?: string;
  mobile?: string;
};

function formatTime(sentAt: string): string {
  const now = new Date();
  const sent = new Date(sentAt);
  const diffMins = Math.floor((now.getTime() - sent.getTime()) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  if (Math.floor(diffHours / 24) === 1) return 'Yesterday';
  return sent.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatSentAt(sentAt: string): string {
  const d = new Date(sentAt);
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

// The title/body text ("Follow-up tomorrow") is static copy generated
// by the backend at send time — it never updates itself. Anything older
// than ~20h is stale relative-time wording, so flag it as overdue.
function isStaleRelativeTime(sentAt: string): boolean {
  const now = new Date();
  const sent = new Date(sentAt);
  const diffHours = (now.getTime() - sent.getTime()) / 3600000;
  return diffHours >= 20;
}

// "Follow-up tomorrow" was written relative to sentAt. Once stale, swap
// the word "tomorrow" (and "today") for the actual calendar date so the
// text itself stops lying, instead of just badging it.
function rewriteStaleText(text: string, sentAt: string): string {
  if (!text) return text;

  const sent = new Date(sentAt);
  const followUpDate = new Date(sent);
  followUpDate.setDate(followUpDate.getDate() + 1);

  const formatted = followUpDate.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });

  return text
    .replace(/\btomorrow\b/gi, `on ${formatted}`)
    .replace(/\btoday\b/gi, `on ${formatted}`);
}

function mapItems(results: any[], source: 'lead' | 'project'): NotificationItem[] {
  return (results ?? []).map((n: any) => {
    const stale = isStaleRelativeTime(n.sent_at);

    return {
      id: n.id,
      source,
      title: stale ? rewriteStaleText(n.title, n.sent_at) : n.title,
      body: stale ? rewriteStaleText(n.body, n.sent_at) : n.body,
      time: formatTime(n.sent_at),
      sentAt: n.sent_at,
      read: n.is_read,
      lead_id: n.lead_id,
      project_id: n.project_id,
      stale,
      customerName: source === 'lead' ? n.lead_customer_name : n.project_customer_name,
      mobile: source === 'lead' ? n.lead_mobile : n.project_mobile,
    };
  });
}

export default function NotificationsScreen({ navigation, route }: any) {
  const { onUnreadCount } = route?.params ?? {};
  const { apiRequest } = useAuthApi();
  const insets = useSafeAreaInsets();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NotificationItem | null>(null);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const [leadRes, projectRes] = await Promise.all([
        apiRequest(`${API_BASE_URL}/lead/api/notifications/`),
        apiRequest(`${API_BASE_URL}/project/api/notifications/`),
      ]);

      const leadJson    = leadRes.ok    ? await leadRes.json()    : { results: [], unread_count: 0 };
      const projectJson = projectRes.ok ? await projectRes.json() : { results: [], unread_count: 0 };

      const merged = [
        ...mapItems(leadJson.results,    'lead'),
        ...mapItems(projectJson.results, 'project'),
      ].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());

      setNotifications(merged);
      onUnreadCount?.((leadJson.unread_count ?? 0) + (projectJson.unread_count ?? 0));
    } catch (err) {
      console.warn('[Notifications] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor(PRIMARY);
      clearBadge();
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleTap = async (item: NotificationItem) => {
    setSelectedItem(item);

    if (!item.read) {
      try {
        const base = item.source === 'lead' ? 'lead' : 'project';
        await apiRequest(`${API_BASE_URL}/${base}/api/notifications/${item.id}/read/`, {
          method: 'POST',
        });
        setNotifications(prev =>
          prev.map(n =>
            n.id === item.id && n.source === item.source ? { ...n, read: true } : n
          )
        );
        const newUnread = notifications.filter(
          n => !n.read && !(n.id === item.id && n.source === item.source)
        ).length;
        onUnreadCount?.(newUnread);
        refreshBadgeFromServer();
      } catch {}
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const iconFor = (item: NotificationItem) =>
    item.source === 'project'
      ? item.read ? 'briefcase-outline' : 'briefcase-clock-outline'
      : item.read ? 'bell-outline'     : 'bell-badge-outline';

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" backgroundColor={PRIMARY} />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* ── Rounded header ── */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.85}>
            <MaterialCommunityIcons name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.topBarCenter}>
            <View style={styles.topIconCircle}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={PRIMARY} />
            </View>
            <Text style={styles.topTitle}>Notifications</Text>
            <Text style={styles.topSub}>{unreadCount} unread · {notifications.length} total</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        {loading && notifications.length === 0 ? (
          <View style={styles.skeletonWrap}>
            {[1, 2, 3, 4, 5].map(i => <SkeletonNotifCard key={i} />)}
          </View>
        ) : (
          <FlatList
            style={styles.list}
            data={notifications}
            keyExtractor={item => `${item.source}-${item.id}`}
            contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 28 }]}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            onRefresh={fetchNotifications}
            refreshing={loading}
            renderItem={({ item }) => (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleTap(item)}
                style={[styles.card, item.read ? styles.cardRead : styles.cardUnread]}
              >
                <View style={[styles.iconWrap, item.source === 'project' && styles.iconWrapProject]}>
                  <MaterialCommunityIcons
                    name={iconFor(item)}
                    size={20}
                    color={item.read ? '#64748B' : item.source === 'project' ? '#0369A1' : PRIMARY}
                  />
                </View>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <View style={styles.cardTitleRow}>
                    <Text
                      style={[styles.cardTitle, item.read && styles.cardTitleRead]}
                      numberOfLines={1}
                    >
                      {item.title}
                    </Text>

                    {item.stale && (
                      <View style={styles.staleBadge}>
                        <Text style={styles.staleBadgeText}>Overdue</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
                </View>
                <Text style={styles.time}>{item.time}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="bell-off-outline" size={46} color={MUTED} />
                <Text style={styles.emptyTitle}>No notifications</Text>
                <Text style={styles.emptySub}>You're all caught up.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      {/* ── Detail modal (centered card) ── */}
      <Modal
        visible={!!selectedItem}
        animationType="fade"
        transparent
        onRequestClose={() => setSelectedItem(null)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setSelectedItem(null)} />
          {selectedItem && (
            <View style={styles.card2}>
              {/* Top row: source badge + close */}
              <View style={styles.card2Header}>
                <View style={[styles.sourceBadge, selectedItem.source === 'project' && styles.sourceBadgeProject]}>
                  <MaterialCommunityIcons
                    name={selectedItem.source === 'project' ? 'briefcase-clock-outline' : 'bell-badge-outline'}
                    size={13}
                    color={selectedItem.source === 'project' ? '#0369A1' : PRIMARY}
                  />
                  <Text style={[styles.sourceBadgeText, selectedItem.source === 'project' && styles.sourceBadgeTextProject]}>
                    {selectedItem.source === 'project' ? 'Project Reminder' : 'Lead Reminder'}
                  </Text>
                </View>
                <TouchableOpacity style={styles.card2Close} onPress={() => setSelectedItem(null)} activeOpacity={0.7}>
                  <MaterialCommunityIcons name="close" size={16} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.card2Title}>{selectedItem.title}</Text>

              {/* Divider */}
              <View style={styles.card2Divider} />

              {/* Detail rows */}
              <View style={styles.card2Rows}>
                <View style={styles.card2Row}>
                  <View style={styles.card2RowIcon}>
                    <MaterialCommunityIcons name="text-box-outline" size={15} color="#64748B" />
                  </View>
                  <Text style={styles.card2RowText}>{selectedItem.body}</Text>
                </View>

                {!!selectedItem.customerName && (
                  <View style={styles.card2Row}>
                    <View style={styles.card2RowIcon}>
                      <MaterialCommunityIcons name="account-outline" size={15} color="#64748B" />
                    </View>
                    <Text style={styles.card2RowText}>{selectedItem.customerName}</Text>
                  </View>
                )}

                {!!selectedItem.mobile && (
                  <View style={styles.card2Row}>
                    <View style={styles.card2RowIcon}>
                      <MaterialCommunityIcons name="phone-outline" size={15} color="#64748B" />
                    </View>
                    <Text style={styles.card2RowText}>{selectedItem.mobile}</Text>
                  </View>
                )}

                <View style={styles.card2Row}>
                  <View style={styles.card2RowIcon}>
                    <MaterialCommunityIcons name="clock-outline" size={15} color="#64748B" />
                  </View>
                  <Text style={styles.card2RowText}>{formatSentAt(selectedItem.sentAt)}</Text>
                </View>
              </View>

              {/* Call button */}
              {!!selectedItem.mobile ? (
                <TouchableOpacity
                  style={styles.callBtn}
                  activeOpacity={0.85}
                  onPress={() => Linking.openURL(`tel:${selectedItem.mobile}`)}
                >
                  <MaterialCommunityIcons name="phone" size={18} color="#FFF" />
                  <Text style={styles.callBtnText}>
                    Call {selectedItem.customerName || 'Customer'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.noCallRow}>
                  <MaterialCommunityIcons name="phone-off-outline" size={15} color="#94A3B8" />
                  <Text style={styles.noCallText}>No contact number available</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen:   { flex: 1, backgroundColor: '#F5F6F8' },
  safeArea: { flex: 1, backgroundColor: PRIMARY },

  topBar: {
    backgroundColor: PRIMARY,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 8, paddingBottom: 34,
  },
  backBtn:      { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  topBarCenter: { flex: 1, alignItems: 'center', gap: 4 },
  topIconCircle:{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  topTitle:     { fontSize: 17, fontWeight: '800', color: '#FFF', marginTop: 2 },
  topSub:       { fontSize: 11, color: 'rgba(255,255,255,0.65)' },

  skeletonWrap: { flex: 1, backgroundColor: '#F5F6F8', marginTop: -24, paddingTop: 29, paddingHorizontal: 14, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  list:         { flex: 1, marginTop: -24, backgroundColor: '#F5F6F8', borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  listContent:  { paddingTop: 29, paddingHorizontal: 14, paddingBottom: 28, flexGrow: 1 },
  sep: { height: 10 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardUnread: { borderColor: 'rgba(142,28,28,0.35)' },
  cardRead:   { borderColor: '#E2E8F0' },

  iconWrap: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(142,28,28,0.08)',
    marginRight: 10,
  },
  iconWrapProject: { backgroundColor: 'rgba(3,105,161,0.08)' },

  cardTitleRow: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  cardTitle:     { fontSize: 14, fontWeight: '800', color: '#0F172A', flexShrink: 1 },
  cardTitleRead: { fontWeight: '600', color: '#475569' },
  cardBody: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 3 },
  time:     { fontSize: 11, fontWeight: '700', color: '#94A3B8', maxWidth: 72, textAlign: 'right' },

  staleBadge: {
    marginLeft: 7,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#FEE2E2',
  },
  staleBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B91C1C',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  staleHint: {
    fontSize: 10.5,
    fontWeight: '600',
    color: '#B91C1C',
    marginTop: 4,
    fontStyle: 'italic',
  },

  emptyWrap: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptySub:   { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'center' },

  // ── Centered detail modal ──
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 20,
  },
  card2: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  card2Header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sourceBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(142,28,28,0.08)',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 999,
  },
  sourceBadgeProject: { backgroundColor: 'rgba(3,105,161,0.08)' },
  sourceBadgeText: {
    fontSize: 11, fontWeight: '700', color: PRIMARY,
  },
  sourceBadgeTextProject: { color: '#0369A1' },
  card2Close: {
    width: 30, height: 30, borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center', justifyContent: 'center',
  },
  card2Title: {
    fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 14,
  },
  card2Divider: {
    height: 1, backgroundColor: '#F1F5F9', marginBottom: 14,
  },
  card2Rows: { gap: 10, marginBottom: 18 },
  card2Row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  card2RowIcon: {
    width: 24, height: 24, borderRadius: 8,
    backgroundColor: '#F8FAFC',
    alignItems: 'center', justifyContent: 'center',
    marginTop: 1,
  },
  card2RowText: {
    flex: 1, fontSize: 13, fontWeight: '600', color: '#475569', lineHeight: 20,
  },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
  },
  callBtnText: { fontSize: 15, fontWeight: '800', color: '#FFF' },
  noCallRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10,
  },
  noCallText: { fontSize: 12, fontWeight: '600', color: '#94A3B8' },
});
