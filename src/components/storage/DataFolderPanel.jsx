import React, { useCallback, useEffect, useState } from 'react';
import { FolderOpen, FolderCheck, RefreshCw, Unplug, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import {
  connectDataFolder,
  disconnectDataFolder,
  getDataFolderStatus,
  isDataFolderSupported,
  onDataFolderChange,
  reconnectDataFolder,
  writeAllToDataFolder,
  getDataFolderHandle,
  APP_FOLDER_NAME,
} from '@/lib/storage/dataFolder';

function formatWhen(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export default function DataFolderPanel() {
  const [status, setStatus] = useState({
    supported: isDataFolderSupported(),
    connected: false,
    permission: 'none',
    folderName: APP_FOLDER_NAME,
    lastSyncAt: null,
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await getDataFolderStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    refresh();
    return onDataFolderChange(refresh);
  }, [refresh]);

  const handleCreate = async () => {
    setBusy(true);
    try {
      await connectDataFolder();
      await refresh();
      toast({
        title: 'Pasta criada e conectada',
        description: `Os dados serão salvos em ${APP_FOLDER_NAME}`,
      });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      toast({
        title: err.message || 'Não foi possível criar a pasta',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleReconnect = async () => {
    setBusy(true);
    try {
      await reconnectDataFolder();
      await refresh();
      toast({ title: 'Pasta reconectada e dados sincronizados' });
    } catch (err) {
      toast({
        title: err.message || 'Não foi possível reconectar',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSyncNow = async () => {
    setBusy(true);
    try {
      const handle = await getDataFolderHandle();
      if (!handle) {
        toast({ title: 'Crie a pasta de dados primeiro', variant: 'destructive' });
        return;
      }
      await writeAllToDataFolder(handle);
      await refresh();
      toast({ title: 'Dados salvos na pasta' });
    } catch (err) {
      toast({
        title: err.message || 'Erro ao salvar na pasta',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    try {
      await disconnectDataFolder();
      await refresh();
      toast({ title: 'Pasta desconectada (os dados no app continuam)' });
    } finally {
      setBusy(false);
    }
  };

  if (!status.supported) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
          <div className="text-sm space-y-1">
            <p className="font-medium text-amber-100">Pasta de dados não disponível neste navegador</p>
            <p className="text-xs text-muted-foreground">
              No Android/PC use Chrome ou Edge. No iPhone a pasta automática não é permitida pelo sistema —
              use o backup completo (.json) e a planilha Excel abaixo.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Crie uma pasta no celular/PC. Depois disso, cada cliente, veículo, produto, serviço,
        orçamento e finalização financeira é gravado automaticamente nessa pasta
        (JSON + planilha Excel).
      </p>

      {status.connected ? (
        <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-400">
            <FolderCheck className="w-4 h-4" />
            <span className="text-sm font-semibold">Pasta ativa: {status.folderName}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Última sincronização: {formatWhen(status.lastSyncAt)}
          </p>
        </div>
      ) : status.permission === 'prompt' ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-100">
            Pasta encontrada, mas o navegador pediu permissão novamente.
          </p>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {!status.connected && (
          <Button type="button" onClick={status.permission === 'prompt' ? handleReconnect : handleCreate} disabled={busy} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <FolderOpen className="w-4 h-4 mr-2" />
            {busy
              ? 'Aguarde...'
              : status.permission === 'prompt'
                ? 'Reconectar pasta'
                : 'Criar pasta de dados'}
          </Button>
        )}
        {status.connected && (
          <>
            <Button type="button" variant="outline" onClick={handleSyncNow} disabled={busy}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Salvar agora
            </Button>
            <Button type="button" variant="outline" onClick={handleDisconnect} disabled={busy}>
              <Unplug className="w-4 h-4 mr-2" />
              Desconectar
            </Button>
          </>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Dica: escolha Documentos ou Downloads. O app cria a pasta <strong>{APP_FOLDER_NAME}</strong> dentro dela.
        No Chrome Android, permita o acesso quando o sistema pedir.
      </p>
    </div>
  );
}
