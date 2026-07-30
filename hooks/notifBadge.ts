import * as Notifications from 'expo-notifications';

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

export function getBadgeCount(): number {
  return _count;
}

export function subscribeBadge(fn: (n: number) => void): () => void {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
}
