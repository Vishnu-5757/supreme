import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { API_BASE_URL } from '../config';
import { getAccessToken } from './useAuthApi';
import { incrementBadge } from './notifBadge';

// ─── Foreground handler ────────────────────────────────────────────────────────
// Call once at app start (module level in App.tsx).
export function setupForegroundHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ─── Device token registration ────────────────────────────────────────────────
// Posts the raw FCM token to the backend. Uses the access token directly so
// it can be called from anywhere (no React hook context needed).
async function postDeviceToken(fcmToken: string): Promise<void> {
  const accessToken = getAccessToken();
  console.log('[Push] postDeviceToken() — accessToken present:', !!accessToken);
  if (!accessToken) {
    console.warn('[Push] No access token — skipping device registration.');
    return;
  }

  try {
    console.log('[Push] POSTing to', `${API_BASE_URL}/api/device/register/`);
    const res = await fetch(`${API_BASE_URL}/api/device/register/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ token: fcmToken, platform: Platform.OS }),
    });
    console.log('[Push] Response status:', res.status);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.warn('[Push] Device registration failed:', res.status, body);
    } else {
      console.log('[Push] Device registered successfully.');
    }
  } catch (err: any) {
    console.error('[Push] Network error during device registration:', err?.message ?? err);
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// FCM's token registration call to Google Play Services intermittently throws
// SERVICE_NOT_AVAILABLE right after login (Play Services still warming up,
// brief connectivity blip, etc). It's transient — retry with backoff before
// giving up instead of silently never registering the device.
async function getDevicePushTokenWithRetry(maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Notifications.getDevicePushTokenAsync();
    } catch (err: any) {
      const isLastAttempt = attempt === maxAttempts;
      console.warn(
        `[Push] getDevicePushTokenAsync attempt ${attempt}/${maxAttempts} failed:`,
        err?.message ?? err,
      );
      if (isLastAttempt) throw err;
      await sleep(attempt * 2000); // 2s, 4s, ...
    }
  }
  throw new Error('unreachable');
}

// Call this immediately after a successful login.
export async function registerForPushNotificationsAsync(): Promise<void> {
  console.log('[Push] registerForPushNotificationsAsync() called');
  console.log('[Push] Device.isDevice =', Device.isDevice);

  if (!Device.isDevice) {
    console.log('[Push] Skipping — not a physical device (emulator/simulator).');
    return;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    console.log('[Push] Existing permission status =', existingStatus);

    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      console.log('[Push] Requesting permission...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
      console.log('[Push] Permission after request =', finalStatus);
    }

    if (finalStatus !== 'granted') {
      console.log('[Push] Permission denied — aborting token registration.');
      return;
    }

    console.log('[Push] Permission granted. Fetching FCM device token...');
    const { data: fcmToken } = await getDevicePushTokenWithRetry();
    console.log('[Push] FCM token obtained:', fcmToken ? fcmToken.slice(0, 20) + '...' : 'null/empty');

    await postDeviceToken(fcmToken);
    console.log('[Push] postDeviceToken() completed.');
  } catch (err: any) {
    console.error('[Push] FAILED with error:', err?.message ?? err);
    console.error('[Push] Full error object:', JSON.stringify(err, null, 2));
  }
}

// ─── Notification listeners ────────────────────────────────────────────────────
// Call once in App.tsx after the NavigationContainer is mounted.
// Returns a cleanup function — call it in the useEffect return.
export function setupNotificationListeners(navigationRef: any): () => void {
  // Re-register whenever the FCM token rotates (e.g. app reinstall / token refresh).
  const tokenSub = Notifications.addPushTokenListener(async (pushToken) => {
    await postDeviceToken(pushToken.data);
  });

  // Increment badge counter whenever a notification arrives while app is open.
  const receivedSub = Notifications.addNotificationReceivedListener(() => {
    incrementBadge();
  });

  // Handle notification taps (foreground AND background-to-foreground).
  const responseSub = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data as Record<string, any>;
      if (!navigationRef?.current?.isReady()) return;

      if (data?.lead_id) {
        // Lead follow-up reminder → open lead edit screen via Leads tab
        navigationRef.current.navigate('MainTabs', {
          screen: 'Leads',
          params: { openLeadId: Number(data.lead_id) },
        });
      } else if (data?.project_id) {
        // Any project-milestone notification → open ProjectTrackingScreen
        navigationRef.current.navigate('ProjectTrackingScreen', {
          project_id: Number(data.project_id),
        });
      }
    }
  );

  return () => {
    tokenSub.remove();
    receivedSub.remove();
    responseSub.remove();
  };
}

// ─── Cold-start notification ───────────────────────────────────────────────────
// If the app was completely closed when the user tapped the notification,
// call this once after the navigator is ready to handle the stored response.
export async function handleInitialNotification(navigationRef: any): Promise<void> {
  const response = await Notifications.getLastNotificationResponseAsync();
  if (!response) return;

  const data = response.notification.request.content.data as Record<string, any>;

  if (data?.lead_id) {
    navigationRef.current?.navigate('MainTabs', {
      screen: 'Leads',
      params: { openLeadId: Number(data.lead_id) },
    });
  } else if (data?.project_id) {
    navigationRef.current?.navigate('ProjectTrackingScreen', {
      project_id: Number(data.project_id),
    });
  }
}
