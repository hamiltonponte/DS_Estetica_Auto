import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { format, addMonths } from 'date-fns';

export default function SubscriptionFormDialog({ open, onOpenChange, subscription, onSave, isSaving }) {
  const [form, setForm] = useState({ client_id: '', plan_name: '', description: '', value: '', due_day: '5', status: 'ativo' });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list(),
  });

  useEffect(() => {
    if (subscription) {
      setForm({
        client_id: subscription.client_id || '',
        plan_name: subscription.plan_name || '',
        description: subscription.description || '',
        value: subscription.value ?? '',
        due_day: subscription.due_day ?? '5',
        status: subscription.status || 'ativo',
      });
    } else {
      setForm({ client_id: '', plan_name: '', description: '', value: '', due_day: '5', status: 'ativo' });
    }
  }, [subscription, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const selectedClient = clients.find(c => c.id === form.client_id);
    const dueDay = Number(form.due_day);
    const now = new Date();
    const dueDate = new Date(now.getFullYear(), now.getMonth(), dueDay);
    if (dueDate < now) dueDate.setMonth(dueDate.getMonth() + 1);

    onSave({
      ...form,
      value: Number(form.value),
      due_day: dueDay,
      due_date: format(dueDate, 'yyyy-MM-dd'),
      client_name: selectedClient?.name || '',
      client_phone: selectedClient?.phone || '',
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{subscription ? 'Editar Assinatura' : 'Nova Assinatura'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente *</Label>
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })} required>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name} — {c.phone}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome do Plano *</Label>
              <Input value={form.plan_name} onChange={e => setForm({ ...form, plan_name: e.target.value })} placeholder="Ex: Plano Mensal" required />
            </div>
            <div className="space-y-1.5">
              <Label>Valor (R$) *</Label>
              <Input type="number" step="0.01" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="0,00" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Dia de Vencimento (1–31)</Label>
            <Input type="number" min="1" max="31" value={form.due_day} onChange={e => setForm({ ...form, due_day: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Descrição do Plano</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="O que inclui este plano?" rows={3} />
          </div>
          {subscription && (
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSaving || !form.client_id}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}