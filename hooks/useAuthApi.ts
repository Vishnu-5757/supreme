// hooks/useAuthApi.ts
import { useState, useRef, useEffect, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const STORE_ACCESS  = 'auth_access_token';
const STORE_REFRESH = 'auth_refresh_token';
const STORE_USER    = 'auth_user_profile';

// Global token storage
let globalAccessToken: string | null = null;
let globalRefreshToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

// Timer reference for auto-logout
let logoutTimer: NodeJS.Timeout | null = null;

// Callback to be set by the app (e.g., from your navigation/context)
let onSessionExpiredCallback: (() => void) | null = null;

// Fired specifically when a refresh 401 indicates the token was blacklisted
// (backend device-limit enforcement). Different from generic session expiry.
let onForceLogoutCallback: ((message: string) => void) | null = null;
export const setForceLogoutCallback = (cb: ((message: string) => void) | null) => {
  onForceLogoutCallback = cb;
};

// Global 403 handler — set once in App, fired by every apiRequest that gets a 403
let on403Callback: ((message: string) => void) | null = null;
export const set403Callback = (cb: ((message: string) => void) | null) => {
  on403Callback = cb;
};

// Decode refresh token and get expiry time
const getRefreshTokenExpiry = (token: string): number | null => {
  try {
    const decoded: any = jwtDecode(token);
    return decoded.exp ? decoded.exp * 1000 : null; // convert to milliseconds
  } catch {
    return null;
  }
};

// Schedule auto-logout based on refresh token expiry
const scheduleAutoLogout = () => {
  if (logoutTimer) clearTimeout(logoutTimer);
  if (!globalRefreshToken) return;
  const expiryMs = getRefreshTokenExpiry(globalRefreshToken);
  if (!expiryMs) return;
  const now = Date.now();
  const delay = expiryMs - now;
  if (delay <= 0) {
    // Already expired – trigger logout immediately
    if (onSessionExpiredCallback) onSessionExpiredCallback();
    return;
  }
  logoutTimer = setTimeout(() => {
    if (onSessionExpiredCallback) onSessionExpiredCallback();
  }, delay);
};

export const setAuthTokens = (access: string, refresh: string) => {
  globalAccessToken = access;
  globalRefreshToken = refresh;
  scheduleAutoLogout();
  // Persist to secure storage so tokens survive app restarts
  SecureStore.setItemAsync(STORE_ACCESS,  access).catch(() => {});
  SecureStore.setItemAsync(STORE_REFRESH, refresh).catch(() => {});
};

export const clearAuthTokens = () => {
  globalAccessToken = null;
  globalRefreshToken = null;
  if (logoutTimer) {
    clearTimeout(logoutTimer);
    logoutTimer = null;
  }
  SecureStore.deleteItemAsync(STORE_ACCESS).catch(() => {});
  SecureStore.deleteItemAsync(STORE_REFRESH).catch(() => {});
  SecureStore.deleteItemAsync(STORE_USER).catch(() => {});
};

// Store the user profile returned by the login API so it survives app restarts.
export const persistUserProfile = (user: any) => {
  if (!user) return;
  SecureStore.setItemAsync(STORE_USER, JSON.stringify(user)).catch(() => {});
};

// Called once on app start (during splash). Returns { valid, user } so the
// caller can skip Login and pass user profile to the Dashboard as params.
export const loadStoredTokens = async (): Promise<{ valid: boolean; user?: any }> => {
  try {
    const [access, refresh, userJson] = await Promise.all([
      SecureStore.getItemAsync(STORE_ACCESS),
      SecureStore.getItemAsync(STORE_REFRESH),
      SecureStore.getItemAsync(STORE_USER),
    ]);
    if (!access || !refresh) return { valid: false };
    const expiry = getRefreshTokenExpiry(refresh);
    if (!expiry || expiry <= Date.now()) return { valid: false };
    globalAccessToken  = access;
    globalRefreshToken = refresh;
    scheduleAutoLogout();
    const user = userJson ? JSON.parse(userJson) : undefined;
    return { valid: true, user };
  } catch {
    return { valid: false };
  }
};

export const getAccessToken = () => globalAccessToken;
export const getRefreshToken = () => globalRefreshToken;

// Replace the existing setSessionExpiredCallback with this:
export const setSessionExpiredCallback = (callback: (() => void) | null) => {
  onSessionExpiredCallback = callback;
  if (callback && globalRefreshToken) scheduleAutoLogout();
};

const refreshAccessToken = async (): Promise<string | null> => {
  if (!globalRefreshToken) return null;
  try {
    const response = await fetch(`${API_BASE_URL}/api/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: globalRefreshToken }),
    });
    if (!response.ok) {
      clearAuthTokens();
      // Check if this is a blacklisted-token 401 (backend device-limit enforcement).
      // Only then show the device-limit message; all other failures use generic expiry.
      let isBlacklisted = false;
      try {
        const body = await response.clone().json();
        if (
          body?.code === 'token_not_valid' ||
          String(body?.detail ?? '').toLowerCase().includes('blacklisted')
        ) {
          isBlacklisted = true;
        }
      } catch {}
      if (isBlacklisted && onForceLogoutCallback) {
        onForceLogoutCallback(
          'You were logged out because your account signed in on another device (max 2 devices allowed).'
        );
      } else if (onSessionExpiredCallback) {
        onSessionExpiredCallback();
      }
      return null;
    }
    const data = await response.json();
    const newAccess = data.access;
    const newRefresh = data.refresh || globalRefreshToken;
    globalAccessToken  = newAccess;
    globalRefreshToken = newRefresh;
    scheduleAutoLogout();
    // Keep persisted tokens in sync with refreshed values
    SecureStore.setItemAsync(STORE_ACCESS,  newAccess).catch(() => {});
    if (data.refresh) SecureStore.setItemAsync(STORE_REFRESH, newRefresh!).catch(() => {});
    return newAccess;
  } catch (error) {
    console.warn('Token refresh request failed:', error);
    if (onSessionExpiredCallback) onSessionExpiredCallback();
    return null;
  }
};

export const useAuthApi = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const apiRequest = useCallback(async (
    url: string,
    options: RequestInit = {},
    retry = true
  ): Promise<Response> => {
    const makeRequest = (token: string | null) => {
      const headers = {
        ...options.headers,
        Authorization: token ? `Bearer ${token}` : '',
      };
      return fetch(url, { ...options, headers });
    };

    const fire403 = async (res: Response) => {
      if (res.status === 403 && on403Callback) {
        let msg = "You don't have permission to do this.";
        try {
          const body = await res.clone().json();
          msg = body.error || body.detail || body.message || msg;
        } catch {}
        on403Callback(msg);
      }
      return res;
    };

    let response = await makeRequest(globalAccessToken);
    if (response.status === 401 && retry) {
      if (refreshPromise) {
        await refreshPromise;
        return apiRequest(url, options, false);
      }
      setIsRefreshing(true);
      refreshPromise = refreshAccessToken();
      try {
        const newToken = await refreshPromise;
        if (!newToken) throw new Error('SESSION_EXPIRED');
        response = await makeRequest(newToken);
        return fire403(response);
      } finally {
        setIsRefreshing(false);
        refreshPromise = null;
      }
    }
    return fire403(response);
  }, []);

  return { apiRequest, isRefreshing };
};