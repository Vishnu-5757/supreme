// hooks/usePermissions.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuthApi, getAccessToken } from './useAuthApi';
import { API_BASE_URL } from '../config';

const POLL_INTERVAL_MS = 3 * 60 * 1000; // 5 minutes

const MODULE_PERMISSION_MAP: Record<string, string[]> = {
  dashboard: ['dashboard.view_notification'],
  service:   ['service.view_servicerecord'],
  project:   ['project.view_project'],
  lead:      ['lead.view_lead'],
  users:     ['auth.view_user'],
};

let cachedPermissions: string[] | null = null;
let cachedIsSuperuser                  = false;
let fetchInProgress: Promise<void> | null = null;
let lastToken: string | null           = null;

export function clearPermissionsCache() {
  cachedPermissions = null;
  cachedIsSuperuser = false;
  fetchInProgress   = null;
  lastToken         = null;
}

export function usePermissions() {
  const { apiRequest } = useAuthApi();
  const apiRef = useRef(apiRequest);
  apiRef.current = apiRequest;

  const [data, setData] = useState({
    permissions: cachedPermissions ?? [],
    isSuperuser: cachedIsSuperuser,
    loading:     cachedPermissions === null,
  });

  // ─── Core fetch (silent = skip loading spinner, used by polling) ──────────
  const doFetch = async (silent = false) => {
    const token = getAccessToken();
    if (!token) {
      setData({ permissions: [], isSuperuser: false, loading: false });
      return;
    }

    if (token !== lastToken) {
      cachedPermissions = null;
      cachedIsSuperuser = false;
      lastToken         = token;
    }

    if (cachedPermissions !== null && !silent) {
      setData({ permissions: cachedPermissions, isSuperuser: cachedIsSuperuser, loading: false });
      return;
    }

    if (fetchInProgress) {
      await fetchInProgress;
      setData({
        permissions: cachedPermissions ?? [],
        isSuperuser: cachedIsSuperuser,
        loading:     false,
      });
      return;
    }

    if (!silent) {
      setData(prev => ({ ...prev, loading: true }));
    }

    const promise = (async () => {
      try {
        const res = await apiRef.current(`${API_BASE_URL}/api/permissions/`);
        if (res.ok) {
          const json = await res.json();
          const newPerms      = (json.permissions ?? []) as string[];
          const newSuperuser  = json.is_superuser ?? false;

          // ── Only update state if something actually changed ──────────────
          const changed =
            newSuperuser !== cachedIsSuperuser ||
            newPerms.length !== (cachedPermissions?.length ?? -1) ||
            newPerms.some(p => !cachedPermissions?.includes(p));

          cachedPermissions = newPerms;
          cachedIsSuperuser = newSuperuser;

          if (changed) {
            console.log('[permissions] changed — updating state');
            setData({ permissions: newPerms, isSuperuser: newSuperuser, loading: false });
          }
        } else {
          console.warn('[permissions] fetch failed with status:', res.status);
          cachedPermissions = [];
          cachedIsSuperuser = false;
          setData({ permissions: [], isSuperuser: false, loading: false });
        }
      } catch (err) {
        console.error('[permissions] fetch error:', err);
        cachedPermissions = [];
        cachedIsSuperuser = false;
        setData({ permissions: [], isSuperuser: false, loading: false });
      } finally {
        fetchInProgress = null;
      }
    })();

    fetchInProgress = promise;
    await promise;

    if (!silent) {
      setData({
        permissions: cachedPermissions ?? [],
        isSuperuser: cachedIsSuperuser,
        loading:     false,
      });
    }
  };

  const doFetchRef = useRef(doFetch);
  doFetchRef.current = doFetch;

  // ─── Initial fetch ────────────────────────────────────────────────────────
  useEffect(() => { doFetchRef.current(false); }, []);

  // ─── Polling: re-fetch every 5 min while app is mounted ──────────────────
  useEffect(() => {
    const interval = setInterval(() => {
      const token = getAccessToken();
      if (!token) return; // don't poll if logged out
      console.log('[permissions] polling...');
      cachedPermissions = null; // bust cache so fetch actually runs
      doFetchRef.current(true); // silent = no loading spinner
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  // ─── AppState: re-fetch when app comes to foreground ─────────────────────
  useEffect(() => {
    const { AppState } = require('react-native');
    const sub = AppState.addEventListener('change', (state: string) => {
      if (state === 'active') {
        console.log('[permissions] AppState active — refreshing');
        cachedPermissions = null;
        cachedIsSuperuser = false;
        fetchInProgress   = null;
        lastToken         = null;
        doFetchRef.current(true); // silent
      }
    });
    return () => sub.remove();
  }, []);

  const canAccess = useCallback(
    (module: string): boolean => {
      if (data.isSuperuser) return true;
      const required = MODULE_PERMISSION_MAP[module] ?? [];
      return required.some(perm => data.permissions.includes(perm));
    },
    [data],
  );

  const hasPermission = useCallback(
    (perm: string): boolean => {
      if (data.isSuperuser) return true;
      return data.permissions.includes(perm);
    },
    [data],
  );

  const refreshPermissions = useCallback(async () => {
    cachedPermissions = null;
    cachedIsSuperuser = false;
    fetchInProgress   = null;
    lastToken         = null;
    await doFetchRef.current(false);
  }, []);

  return {
    canAccess,
    hasPermission,
    permissions:        data.permissions,
    isSuperuser:        data.isSuperuser,
    loading:            data.loading,
    refreshPermissions,
  };
}