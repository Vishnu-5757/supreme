import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { clearBadge } from '../hooks/notifBadge';
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

function mapItems(results: any[], source: 'lead' | 'project'): NotificationItem[] {
  return (results ?? []).map((n: any) => ({
    id: n.id,
    source,
    title: n.title,
    body: n.body,
    time: formatTime(n.sent_at),
    sentAt: n.sent_at,
    read: n.is_read,
    lead_id: n.lead_id,
    project_id: n.project_id,
  }));
}

export default function NotificationsScreen({ navigation, route }: any) {
  const { onUnreadCount } = route?.params ?? {};
  const { apiRequest } = useAuthApi();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);

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
    // Mark read via the correct base path
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
      } catch {}
    }

    // Navigate to the right screen
    if (item.source === 'lead' && item.lead_id) {
      navigation.navigate('MainTabs', {
        screen: 'Leads',
        params: { openLeadId: item.lead_id },
      });
    } else if (item.source === 'project' && item.project_id) {
      navigation.navigate('ProjectTrackingScreen', { project_id: item.project_id });
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
            contentContainerStyle={styles.listContent}
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
                  <Text style={[styles.cardTitle, item.read && styles.cardTitleRead]}>
                    {item.title}
                  </Text>
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

  cardTitle:     { fontSize: 14, fontWeight: '800', color: '#0F172A' },
  cardTitleRead: { fontWeight: '600', color: '#475569' },
  cardBody: { fontSize: 12, fontWeight: '600', color: '#64748B', marginTop: 3 },
  time:     { fontSize: 11, fontWeight: '700', color: '#94A3B8', maxWidth: 72, textAlign: 'right' },

  emptyWrap: {
    flex: 1,
    alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  emptySub:   { fontSize: 13, fontWeight: '600', color: '#64748B', textAlign: 'center' },
});
