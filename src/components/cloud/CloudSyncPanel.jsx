import React, { useState } from 'react';
import { Cloud, CloudOff, Loader2, RefreshCw, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCloudAuth } from '@/lib/cloud/CloudAuthContext';
import { pullFromCloud, pushToCloud, restoreFromCloud, syncNow } from '@/lib/cloud/syncEngine';
import { toast } from '@/components/ui/use-toast';

function formatWhen(iso) {
  if (!iso) return 'Nunca';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
}

export default function CloudSyncPanel({ collapsed = false }) {
  const { enabled, user, syncStatus, logout, refreshSyncStatus, syncing: authSyncing } = useCloudAuth();
  const [busy, setBusy] = useState(false);

  if (!enabled) return null;

  const run = async (action, successTitle) => {
    setBusy(true);
    try {
      await action();
      refreshSyncStatus();
      toast({ title: successTitle });
    } catch (err) {
      toast({ title: err.message || 'Erro na sincronização', variant: 'destructive' });
      refreshSyncStatus();
    } finally {
      setBusy(false);
    }
  };

  const isBusy = busy || authSyncing || syncStatus.pending;

  return (
    <div className={cn('rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 space-y-2', collapsed && 'p-2')}>
      {!collapsed && (
        <div className="flex items-center gap-2">
          <Cloud className="w-4 h-4 text-accent shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-semibold truncate">Nuvem</p>
            <p className="text-[10px] text-sidebar-foreground/60 truncate">{user?.email || 'Não conectado'}</p>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="text-[10px] text-sidebar-foreground/60 space-y-0.5">
          <p>Último envio: {formatWhen(syncStatus.lastPushAt)}</p>
          <p>Último download: {formatWhen(syncStatus.lastPullAt)}</p>
          {syncStatus.lastError && (
            <p className="text-amber-400 line-clamp-2">Pendente: {syncStatus.lastError}</p>
          )}
        </div>
      )}

      <div className={cn('flex gap-1', collapsed ? 'flex-col' : 'flex-wrap')}>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs flex-1"
          disabled={isBusy}
          title="Sincronizar agora"
          onClick={() => run(() => syncNow(), 'Dados sincronizados com a nuvem')}
        >
          {isBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          {!collapsed && <span className="ml-1.5">Sync</span>}
        </Button>
        {!collapsed && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            disabled={isBusy}
            onClick={() => run(() => restoreFromCloud(), 'Dados restaurados da nuvem')}
          >
            Restaurar
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-8 text-xs"
          disabled={isBusy}
          title="Sair"
          onClick={logout}
        >
          <LogOut className="w-3.5 h-3.5" />
        </Button>
      </div>

      {!navigator.onLine && !collapsed && (
        <p className="text-[10px] text-amber-400 flex items-center gap-1">
          <CloudOff className="w-3 h-3" /> Offline — alterações serão enviadas depois
        </p>
      )}
    </div>
  );
}

export function CloudSyncSettingsSection() {
  const { enabled, user, syncStatus, logout, refreshSyncStatus, syncing: authSyncing } = useCloudAuth();
  const [busy, setBusy] = useState(false);

  if (!enabled) {
    return (
      <div className="rounded-xl border border-border p-4 bg-muted/20 text-sm text-muted-foreground">
        Sincronização na nuvem não configurada neste build.
      </div>
    );
  }

  const isBusy = busy || authSyncing || syncStatus.pending;

  const run = async (fn, ok) => {
    setBusy(true);
    try {
      await fn();
      refreshSyncStatus();
      toast({ title: ok });
    } catch (err) {
      toast({ title: err.message || 'Erro na sincronização', variant: 'destructive' });
      refreshSyncStatus();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
        <p className="text-sm font-medium flex items-center gap-2">
          <Cloud className="w-4 h-4 text-accent" />
          Conta conectada
        </p>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <p className="text-xs text-muted-foreground">
          Último envio: {formatWhen(syncStatus.lastPushAt)} · Último download: {formatWhen(syncStatus.lastPullAt)}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" disabled={isBusy} onClick={() => run(() => syncNow(), 'Sincronização concluída')}>
          {isBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Sincronizar agora
        </Button>
        <Button type="button" variant="outline" disabled={isBusy} onClick={() => run(() => pushToCloud(), 'Dados enviados para a nuvem')}>
          Enviar para nuvem
        </Button>
        <Button type="button" variant="outline" disabled={isBusy} onClick={() => run(() => pullFromCloud({ full: false }), 'Atualizações baixadas')}>
          Baixar atualizações
        </Button>
        <Button type="button" variant="outline" disabled={isBusy} onClick={() => {
          if (!window.confirm('Restaurar da nuvem substitui os dados locais pelos da nuvem. Continuar?')) return;
          run(() => restoreFromCloud(), 'Restauração concluída');
        }}>
          Restaurar da nuvem
        </Button>
        <Button type="button" variant="ghost" onClick={logout}>Sair da conta</Button>
      </div>
    </div>
  );
}
