import React, { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Send, User } from 'lucide-react';
import { api } from '@/api/apiClient';
import { useBranding } from '@/lib/BrandingContext';
import { openWhatsApp, formatMoney } from '@/lib/whatsapp';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import MaskedInput from '@/components/ui/masked-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { maskPhone } from '@/lib/masks';

export function buildQuoteMessage({
  businessName,
  businessAddress,
  businessPhone,
  clientName,
  items,
  total,
  notes,
}) {
  const lines = items.map((item) => {
    const qty = item.quantity > 1 ? `${item.quantity}x ` : '';
    const unit = item.unit ? ` (${item.unit})` : '';
    return `• ${qty}${item.name}${unit}\n  R$ ${formatMoney(item.total)}`;
  });

  return [
    `*ORÇAMENTO*`,
    `*${businessName}*`,
    businessAddress || null,
    businessPhone ? `Tel: ${businessPhone}` : null,
    ``,
    `Olá${clientName ? `, ${clientName}` : ''}!`,
    ``,
    `Segue o orçamento solicitado:`,
    ``,
    ...lines,
    ``,
    `*TOTAL: R$ ${formatMoney(total)}*`,
    ``,
    notes ? `Obs.: ${notes}` : null,
    `Validade: 7 dias.`,
    `Aguardamos seu retorno!`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/**
 * Modal só para informar/selecionar cliente e enviar o orçamento no WhatsApp.
 */
export default function QuoteClientModal({
  open,
  onOpenChange,
  items = [],
  total = 0,
  notes = '',
  onSent,
}) {
  const queryClient = useQueryClient();
  const { businessName, businessAddress, businessPhone } = useBranding();

  const [clientMode, setClientMode] = useState('manual');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list('name'),
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setClientMode('manual');
      setClientId('');
      setClientName('');
      setClientPhone('');
    }
  }, [open]);

  useEffect(() => {
    if (clientMode !== 'select' || !clientId) return;
    const c = clients.find((x) => x.id === clientId);
    if (c) {
      setClientName(c.name || '');
      setClientPhone(maskPhone(c.whatsapp || c.phone || ''));
    }
  }, [clientId, clientMode, clients]);

  const saveMutation = useMutation({
    mutationFn: (data) => api.entities.Quote.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['quotes'] }),
  });

  const handleSend = async () => {
    const name = clientName.trim();
    if (!name) {
      toast({ title: 'Informe ou selecione o cliente', variant: 'destructive' });
      return;
    }
    if (!items.length) {
      toast({ title: 'Nenhum item no orçamento', variant: 'destructive' });
      return;
    }

    const message = buildQuoteMessage({
      businessName,
      businessAddress,
      businessPhone,
      clientName: name,
      items,
      total,
      notes,
    });

    try {
      await saveMutation.mutateAsync({
        client_id: clientId || null,
        client_name: name,
        client_phone: clientPhone.trim(),
        client_whatsapp: clientPhone.trim(),
        items,
        total,
        notes,
        message,
        status: 'sent',
        sent_at: new Date().toISOString(),
        date: format(new Date(), 'yyyy-MM-dd'),
      });

      openWhatsApp({ phone: clientPhone.trim(), message });
      toast({ title: 'Orçamento salvo. Abrindo WhatsApp...' });
      onOpenChange(false);
      onSent?.();
    } catch (err) {
      toast({ title: err.message || 'Erro ao salvar orçamento', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-accent" />
            Cliente do orçamento
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl bg-accent/10 border border-accent/20 p-3 text-center mb-2">
          <p className="text-xs text-muted-foreground">Total do orçamento</p>
          <p className="text-2xl font-bold text-accent">R$ {formatMoney(total)}</p>
          <p className="text-xs text-muted-foreground mt-1">{items.length} item(ns)</p>
        </div>

        <Tabs value={clientMode} onValueChange={setClientMode}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual">Escrever nome</TabsTrigger>
            <TabsTrigger value="select">Selecionar cliente</TabsTrigger>
          </TabsList>

          <TabsContent value="manual" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label>Nome do cliente *</Label>
              <Input
                value={clientName}
                onChange={(e) => {
                  setClientId('');
                  setClientName(e.target.value);
                }}
                placeholder="Nome completo"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp (opcional)</Label>
              <MaskedInput
                mask="whatsapp"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </TabsContent>

          <TabsContent value="select" className="space-y-3 mt-3">
            <div className="space-y-1.5">
              <Label>Cliente cadastrado *</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}{(c.whatsapp || c.phone) ? ` — ${maskPhone(c.whatsapp || c.phone)}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clientId && (
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <MaskedInput
                  mask="whatsapp"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter className="gap-2 flex-col sm:flex-row mt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1">
            Voltar
          </Button>
          <Button
            type="button"
            className="bg-green-500 hover:bg-green-600 text-white sm:flex-1"
            onClick={handleSend}
            disabled={saveMutation.isPending}
          >
            <Send className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Enviando...' : 'Enviar no WhatsApp'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
