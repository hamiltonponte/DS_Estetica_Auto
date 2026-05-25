import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  clearStoredDirectory,
  getDirectoryName,
  isFileSystemSupported,
  pickDataDirectory,
  restoreDataDirectory,
} from '@/lib/storage/fileSystem';
import { setStorageRoot } from '@/lib/storage/entityStore';
import { syncWorkbook } from '@/lib/storage/excelSync';
import { seedServicesIfEmpty } from '@/lib/storage/seedData';

const StorageContext = createContext(null);

export function StorageProvider({ children }) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [folderName, setFolderName] = useState('');
  const [error, setError] = useState(null);
  const [unsupported, setUnsupported] = useState(false);

  const applyHandle = useCallback(async (handle) => {
    setStorageRoot(handle);
    setFolderName(await getDirectoryName(handle));
    await seedServicesIfEmpty(handle);
    await syncWorkbook(handle);
    setReady(true);
    setError(null);
  }, []);

  const tryRestore = useCallback(async () => {
    setLoading(true);
    setUnsupported(!isFileSystemSupported());
    if (!isFileSystemSupported()) {
      setLoading(false);
      return;
    }
    try {
      const handle = await restoreDataDirectory();
      if (handle) {
        await applyHandle(handle);
      } else {
        setReady(false);
      }
    } catch (e) {
      console.error(e);
      setReady(false);
      setError('Não foi possível acessar a pasta salva. Selecione novamente.');
    } finally {
      setLoading(false);
    }
  }, [applyHandle]);

  useEffect(() => {
    tryRestore();
  }, [tryRestore]);

  const selectFolder = async () => {
    setLoading(true);
    setError(null);
    try {
      const handle = await pickDataDirectory();
      await applyHandle(handle);
    } catch (e) {
      if (e.name === 'AbortError') {
        setError(null);
      } else if (e.message === 'UNSUPPORTED') {
        setUnsupported(true);
        setError('Seu navegador não suporta salvar em pasta. Use Chrome ou Edge no computador ou Android.');
      } else {
        setError(e.message || 'Erro ao selecionar pasta');
      }
      setReady(false);
    } finally {
      setLoading(false);
    }
  };

  const changeFolder = async () => {
    await clearStoredDirectory();
    setStorageRoot(null);
    setReady(false);
    setFolderName('');
    await selectFolder();
  };

  return (
    <StorageContext.Provider
      value={{
        ready,
        loading,
        folderName,
        error,
        unsupported,
        selectFolder,
        changeFolder,
        refresh: tryRestore,
      }}
    >
      {children}
    </StorageContext.Provider>
  );
}

export function useStorage() {
  const ctx = useContext(StorageContext);
  if (!ctx) throw new Error('useStorage must be used within StorageProvider');
  return ctx;
}
