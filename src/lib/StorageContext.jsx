import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { initializeStorage } from '@/lib/storage/fileSystem';
import { setStorageReady } from '@/lib/storage/entityStore';
import { syncWorkbook } from '@/lib/storage/excelSync';
import { seedServicesIfEmpty } from '@/lib/storage/seedData';
import { restoreDataFolderOnBoot } from '@/lib/storage/dataFolder';

const StorageContext = createContext(null);

export function StorageProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const init = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await initializeStorage();
      setStorageReady(true);
      await seedServicesIfEmpty();
      await syncWorkbook();
      await restoreDataFolderOnBoot();
      setReady(true);
    } catch (e) {
      console.error(e);
      setReady(false);
      setError(e.message || 'Erro ao iniciar armazenamento local');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <StorageContext.Provider value={{ ready, loading, error, refresh: init }}>
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used within StorageProvider');
  return ctx;
}
