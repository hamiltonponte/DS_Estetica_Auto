import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearAuthSession,
  getAuthToken,
  getAuthUser,
  isCloudEnabled,
  saveSyncMeta,
  setAuthSession,
} from '@/lib/cloud/cloudConfig';
import { cloudLogin, cloudMe } from '@/lib/cloud/cloudApi';
import { getCloudSyncStatus, initialSyncAfterLogin } from '@/lib/cloud/syncEngine';

const CloudAuthContext = createContext(null);

export function CloudAuthProvider({ children }) {
  const enabled = isCloudEnabled();
  const [user, setUser] = useState(() => getAuthUser());
  const [booting, setBooting] = useState(enabled);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(getCloudSyncStatus());

  const refreshSyncStatus = useCallback(() => {
    setSyncStatus(getCloudSyncStatus());
  }, []);

  useEffect(() => {
    const onSyncChanged = () => refreshSyncStatus();
    window.addEventListener('ds-estetica-sync-changed', onSyncChanged);
    return () => window.removeEventListener('ds-estetica-sync-changed', onSyncChanged);
  }, [refreshSyncStatus]);

  useEffect(() => {
    if (!enabled) {
      setBooting(false);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setBooting(false);
      return;
    }

    cloudMe()
      .then(async (data) => {
        setUser(data.user);
        setAuthSession({ token, user: data.user });
        setSyncing(true);
        try {
          await initialSyncAfterLogin();
        } finally {
          setSyncing(false);
          refreshSyncStatus();
        }
      })
      .catch(() => {
        clearAuthSession();
        setUser(null);
        saveSyncMeta({ lastError: 'Sessão expirada. Faça login novamente.' });
        refreshSyncStatus();
      })
      .finally(() => setBooting(false));
  }, [enabled, refreshSyncStatus]);

  const login = useCallback(async (email, password) => {
    const data = await cloudLogin(email, password);
    setAuthSession({ token: data.token, user: data.user });
    setUser(data.user);
    setSyncing(true);
    try {
      await initialSyncAfterLogin();
    } finally {
      setSyncing(false);
      refreshSyncStatus();
    }
    return data.user;
  }, [refreshSyncStatus]);

  const logout = useCallback(() => {
    clearAuthSession();
    setUser(null);
    refreshSyncStatus();
  }, [refreshSyncStatus]);

  const value = useMemo(() => ({
    enabled,
    user,
    isAuthenticated: enabled ? Boolean(user && getAuthToken()) : true,
    booting: enabled && booting,
    syncing,
    syncStatus,
    login,
    logout,
    refreshSyncStatus,
  }), [enabled, user, booting, syncing, syncStatus, login, logout, refreshSyncStatus]);

  return (
    <CloudAuthContext.Provider value={value}>
      {children}
    </CloudAuthContext.Provider>
  );
}

export function useCloudAuth() {
  const ctx = useContext(CloudAuthContext);
  if (!ctx) throw new Error('useCloudAuth must be used within CloudAuthProvider');
  return ctx;
}
