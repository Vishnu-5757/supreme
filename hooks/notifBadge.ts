import * as Notifications from 'expo-notifications';
import { API_BASE_URL } from '../config';
import { getAccessToken } from './useAuthApi';

let _count = 0;
const _listeners: Array<(n: number) => void> = [];

function _notify() {
  _listeners.forEach(fn => fn(_count));
}

export function incrementBadge(): void {
  _count++;
  Notifications.setBadgeCountAsync(_count).catch(() => {});
  _notify();
}

export function clearBadge(): void {
  _count = 0;
  Notifications.setBadgeCountAsync(0).catch(() => {});
  _notify();
}

function setBadgeCount(n: number): void {
  _count = n;
  Notifications.setBadgeCountAsync(n).catch(() => {});
  _notify();
}

export function getBadgeCount(): number {
  return _count;
}

export function subscribeBadge(fn: (n: number) => void): () => void {
  _listeners.push(fn);
  // Sync the subscriber to whatever the count already is right now. Without
  // this, a subscriber that mounts just after refreshBadgeFromServer()
  // already resolved (e.g. right after login, where the fetch races the
  // screen mount) would miss that update entirely and stay stuck at its
  // stale initial value until some other refresh happens to fire later.
  fn(_count);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
}

// Fetches unread_count from both notification endpoints and sets the badge
// to the authoritative server total. Safe to call from anywhere — silently
// ignores network errors so callers don't need try/catch.
export async function refreshBadgeFromServer(): Promise<void> {
  const token = getAccessToken();
  if (!token) return;
  try {
    const [leadRes, projectRes] = await Promise.all([
      fetch(`${API_BASE_URL}/lead/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch(`${API_BASE_URL}/project/api/notifications/`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ]);
    const leadJson    = leadRes.ok    ? await leadRes.json()    : { unread_count: 0 };
    const projectJson = projectRes.ok ? await projectRes.json() : { unread_count: 0 };
    setBadgeCount((leadJson.unread_count ?? 0) + (projectJson.unread_count ?? 0));
  } catch {
    // Network error — badge stays at current local value
  }
}
