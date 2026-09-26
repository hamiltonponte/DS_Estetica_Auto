import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Bell, MessageCircle, Check, Calendar, User, Phone, Trash2, Send, DollarSign } from 'lucide-react';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { openWhatsApp, formatMoney } from '@/lib/whatsapp';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';

function typeLabel(type) {
  if (type === 'payment_due') return 'Cobrança a prazo';
  if (type === 'service_followup') return 'Pós-serviço';
  if (type === 'subscription_due') return 'Assinatura';
  return 'Lembrete';
}

function typeClass(type) {
  if (type === 'payment_due') return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
  if (type === 'service_followup') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
}

export default function Reminders() {
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: async () => {
      const all = await api.entities.Reminder.list('-scheduled_date', 200);
      return all.filter((r) => r.status === 'pending');
    },
  });

  const { data: configs = [] } = useQuery({
    queryKey: ['business-config'],
    queryFn: () => api.entities.BusinessConfig.list(),
  });

  const config = configs[0];

  const markAsSentMutation = useMutation({
    mutationFn: (id) => api.entities.Reminder.update(id, { status: 'sent', sent_date: new Date().toISOString() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: 'Lembrete marcado como enviado' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Reminder.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast({ title: 'Lembrete excluído' });
    },
  });

  const formatMessage = (reminder) => {
    if (reminder.type === 'payment_due') {
      if (reminder.message_template) return reminder.message_template;
      const due = reminder.scheduled_date
        ? format(parseISO(reminder.scheduled_date), 'dd/MM/yyyy')
        : '—';
      return [
        `Olá${reminder.client_name ? `, ${reminder.client_name}` : ''}!`,
        ``,
        `Lembrete de cobrança referente ao serviço:`,
        reminder.service_names || 'Serviço',
        ``,
        `Valor: R$ ${formatMoney(reminder.value)}`,
        `Vencimento: ${due}`,
        ``,
        `Podemos combinar o recebimento?`,
        config?.business_name ? `— ${config.business_name}` : null,
      ].filter(Boolean).join('\n');
    }

    if (reminder.type === 'service_followup') {
      return (reminder.message_template || '')
        .replace('{nome}', reminder.client_name || '')
        .replace('{data_servico}', reminder.reference_date
          ? new Date(reminder.reference_date).toLocaleDateString('pt-BR')
          : '')
        .replace('{intervalo}', config?.service_reminder_days || 7)
        .replace('{empresa}', config?.business_name || 'DS Estética Auto');
    }

    if (reminder.type === 'subscription_due') {
      let message = config?.whatsapp_reminder_message || reminder.message_template || '';
      return message
        .replace('{nome}', reminder.client_name || '')
        .replace('{valor}', reminder.value || '')
        .replace('{vencimento}', reminder.scheduled_date
          ? new Date(reminder.scheduled_date + 'T12:00:00').toLocaleDateString('pt-BR')
          : '')
        .replace('{pix}', config?.pix_key || '');
    }

    return reminder.message_template || '';
  };

  const handleSendWhatsApp = (reminder) => {
    const message = formatMessage(reminder);
    openWhatsApp({
      phone: reminder.client_whatsapp || reminder.client_phone,
      message,
    });
    markAsSentMutation.mutate(reminder.id);
  };

  const handleBatchSend = () => {
    const batch = reminders.slice(0, 5);
    batch.forEach((reminder, index) => {
      setTimeout(() => handleSendWhatsApp(reminder), index * 2000);
    });
  };

  const today = startOfDay(new Date());
  const overdueCount = reminders.filter((r) => {
    if (!r.scheduled_date) return false;
    try {
      return !isBefore(today, startOfDay(parseISO(r.scheduled_date)));
    } catch {
      return false;
    }
  }).length;

  const pendingCount = reminders.length;

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Lembretes"
        subtitle={`${pendingCount} pendente${pendingCount !== 1 ? 's' : ''}${overdueCount ? ` · ${overdueCount} para cobrar hoje/atrasado` : ''}`}
      />

      <div className="px-4 md:px-6 py-4">
        {pendingCount > 0 && (
          <div className="mb-4 flex items-center justify-between bg-accent/10 border border-accent/20 rounded-xl p-4 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Send className="w-5 h-5 text-accent shrink-0" />
              <div className="min-w-0">
                <p className="font-semibold text-sm">Envio em lote</p>
                <p className="text-xs text-muted-foreground">
                  Enviar para até {Math.min(5, pendingCount)} clientes
                </p>
              </div>
            </div>
            <Button onClick={handleBatchSend} className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0">
              Enviar lote
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : reminders.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="Nenhum lembrete pendente"
            description="Cobranças a prazo e outros lembretes aparecerão aqui"
          />
        ) : (
          <div className="grid gap-3">
            {reminders.map((reminder) => (
              <div key={reminder.id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-all">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeClass(reminder.type)}`}>
                        {typeLabel(reminder.type)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {reminder.scheduled_date
                          ? format(parseISO(reminder.scheduled_date), 'dd/MM/yyyy')
                          : '—'}
                      </span>
                      {reminder.type === 'payment_due' && reminder.value != null && (
                        <span className="text-xs font-semibold text-accent flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          R$ {formatMoney(reminder.value)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <p className="font-semibold text-sm">{reminder.client_name}</p>
                    </div>

                    {(reminder.client_whatsapp || reminder.client_phone) && (
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">
                          {reminder.client_whatsapp || reminder.client_phone}
                        </p>
                      </div>
                    )}

                    {reminder.service_names && (
                      <p className="text-xs text-muted-foreground mb-1">{reminder.service_names}</p>
                    )}

                    <p className="text-xs text-muted-foreground line-clamp-2 mt-2 whitespace-pre-line">
                      {formatMessage(reminder)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleSendWhatsApp(reminder)}
                      className="bg-green-500 hover:bg-green-600 text-white"
                      disabled={markAsSentMutation.isPending}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      Cobrar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsSentMutation.mutate(reminder.id)}
                      disabled={markAsSentMutation.isPending}
                      title="Marcar como feito"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(reminder.id)}
                      disabled={deleteMutation.isPending}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
