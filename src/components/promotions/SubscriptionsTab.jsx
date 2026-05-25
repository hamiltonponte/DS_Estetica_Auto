import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Plus, MessageSquare, Edit2, Trash2, CheckCircle, AlertCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import SubscriptionFormDialog from './SubscriptionFormDialog';

const statusConfig = {
  ativo: { label: 'Ativo', icon: CheckCircle, cls: 'bg-green-500/10 text-green-600 border-green-500/20' },
  vencido: { label: 'Vencido', icon: AlertCircle, cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
  cancelado: { label: 'Cancelado', icon: XCircle, cls: 'bg-muted text-muted-foreground border-border' },
};

export default function SubscriptionsTab() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const queryClient = useQueryClient();

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['subscriptions'],
    queryFn: () => api.entities.Subscription.list('-created_date', 100),
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['business-config'],
    queryFn: () => api.entities.BusinessConfig.list(),
  });

  const bizConfig = configs[0] || {};

  const saveMutation = useMutation({
    mutationFn: (data) => editing?.id
      ? api.entities.Subscription.update(editing.id, data)
      : api.entities.Subscription.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['subscriptions'] }); setDialogOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Subscription.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['subscriptions'] }),
  });

  const sendWhatsapp = (sub) => {
    const dueDate = sub.due_date ? format(parseISO(sub.due_date), "dd/MM/yyyy") : '—';
    const pix = bizConfig.pix_key || 'Não configurado';
    const template = bizConfig.whatsapp_reminder_message ||
      `Olá {nome}! Sua mensalidade *{plano}* no valor de *R$ {valor}* vence em *{vencimento}*. PIX: *{pix}*`;

    const msg = template
      .replace(/{nome}/g, sub.client_name)
      .replace(/{plano}/g, sub.plan_name)
      .replace(/{valor}/g, Number(sub.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 }))
      .replace(/{vencimento}/g, dueDate)
      .replace(/{pix}/g, pix);

    const phone = (sub.client_phone || '').replace(/\D/g, '');
    const url = `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');

    api.entities.Subscription.update(sub.id, { whatsapp_sent: true, last_reminder_sent: format(new Date(), 'yyyy-MM-dd') });
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
  };

  const activeSubs = subscriptions.filter(s => s.status !== 'cancelado');

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{activeSubs.length} assinatura(s) ativa(s)</p>
        <Button
          className="bg-accent hover:bg-accent/90 text-accent-foreground"
          onClick={() => { setEditing(null); setDialogOpen(true); }}
        >
          <Plus className="w-4 h-4 mr-1" /> Nova Assinatura
        </Button>
      </div>

      {subscriptions.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center">
          <RefreshCw className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-semibold text-foreground mb-1">Nenhuma assinatura cadastrada</p>
          <p className="text-sm text-muted-foreground">Crie planos mensais para seus clientes com lembretes automáticos via WhatsApp.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subscriptions.map(sub => {
            const st = statusConfig[sub.status] || statusConfig.ativo;
            const StatusIcon = st.icon;
            const daysUntil = sub.due_date ? differenceInDays(parseISO(sub.due_date), new Date()) : null;
            const isNearDue = daysUntil !== null && daysUntil <= (bizConfig.reminder_days_before || 3) && daysUntil >= 0;
            const isOverdue = daysUntil !== null && daysUntil < 0;

            return (
              <div key={sub.id} className={`bg-card rounded-2xl border p-4 ${isOverdue ? 'border-red-500/30' : isNearDue ? 'border-amber-500/30' : 'border-border'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{sub.client_name}</span>
                      <Badge variant="outline" className={st.cls}>
                        <StatusIcon className="w-3 h-3 mr-1" /> {st.label}
                      </Badge>
                      {isNearDue && <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Vence em {daysUntil}d</Badge>}
                      {isOverdue && <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/20">Vencido há {Math.abs(daysUntil)}d</Badge>}
                      {sub.whatsapp_sent && <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">✓ WhatsApp</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{sub.plan_name}</p>
                    {sub.description && <p className="text-xs text-muted-foreground mt-1">{sub.description}</p>}
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                      <span className="font-bold text-accent text-sm">R$ {Number(sub.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span>Vence dia {sub.due_day}</span>
                      {sub.due_date && <span>{format(parseISO(sub.due_date), "dd/MM/yyyy")}</span>}
                      {sub.client_phone && <span>📱 {sub.client_phone}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-500/30 hover:bg-green-500/10"
                      onClick={() => sendWhatsapp(sub)}
                      title="Enviar lembrete via WhatsApp"
                    >
                      <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => { setEditing(sub); setDialogOpen(true); }}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(sub.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <SubscriptionFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        subscription={editing}
        onSave={(data) => saveMutation.mutate(data)}
        isSaving={saveMutation.isPending}
      />
    </div>
  );
}