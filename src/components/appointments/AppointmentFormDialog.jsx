import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

export default function AppointmentFormDialog({ open, onOpenChange, appointment, clients, vehicles, services, onSave, isSaving }) {
  const [form, setForm] = useState({
    client_id: '', vehicle_id: '', service_ids: [], date: '', time: '',
    status: 'agendado', notes: '', payment_status: 'pendente', payment_method: '',
  });

  useEffect(() => {
    if (appointment) {
      setForm({
        client_id: appointment.client_id || '',
        vehicle_id: appointment.vehicle_id || '',
        service_ids: appointment.service_ids || [],
        date: appointment.date || '',
        time: appointment.time || '',
        status: appointment.status || 'agendado',
        notes: appointment.notes || '',
        payment_status: appointment.payment_status || 'pendente',
        payment_method: appointment.payment_method || '',
      });
    } else {
      setForm({
        client_id: '', vehicle_id: '', service_ids: [], date: '', time: '',
        status: 'agendado', notes: '', payment_status: 'pendente', payment_method: '',
      });
    }
  }, [appointment, open]);

  const clientVehicles = vehicles?.filter(v => v.client_id === form.client_id) || [];
  const selectedClient = clients?.find(c => c.id === form.client_id);
  const selectedVehicle = vehicles?.find(v => v.id === form.vehicle_id);
  const selectedServices = services?.filter(s => form.service_ids.includes(s.id)) || [];
  const totalPrice = selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);

  const toggleService = (serviceId) => {
    setForm(prev => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter(id => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      client_name: selectedClient?.name || '',
      vehicle_info: selectedVehicle ? `${selectedVehicle.brand} ${selectedVehicle.model} - ${selectedVehicle.plate}` : '',
      service_names: selectedServices.map(s => s.name).join(', '),
      total_price: totalPrice,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{appointment ? 'Editar Agendamento' : 'Novo Agendamento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v, vehicle_id: '' })}>
              <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
              <SelectContent>
                {clients?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {form.client_id && clientVehicles.length > 0 && (
            <div className="space-y-2">
              <Label>Veículo</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm({ ...form, vehicle_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione o veículo" /></SelectTrigger>
                <SelectContent>
                  {clientVehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} - {v.plate}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Horário *</Label>
              <Input type="time" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} required />
            </div>
          </div>

          {services?.length > 0 && (
            <div className="space-y-2">
              <Label>Serviços</Label>
              <div className="border rounded-xl p-3 space-y-2 max-h-40 overflow-y-auto">
                {services.map(s => (
                  <label key={s.id} className="flex items-center gap-3 py-1 cursor-pointer hover:bg-muted/50 px-2 rounded-lg">
                    <Checkbox
                      checked={form.service_ids.includes(s.id)}
                      onCheckedChange={() => toggleService(s.id)}
                    />
                    <span className="text-sm flex-1">{s.name}</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      R$ {(s.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </label>
                ))}
              </div>
              {totalPrice > 0 && (
                <div className="flex justify-end">
                  <span className="text-sm font-bold text-accent">
                    Total: R$ {totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>
          )}

          {appointment && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="agendado">Agendado</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Pagamento</Label>
                <Select value={form.payment_status} onValueChange={v => setForm({ ...form, payment_status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {(appointment?.payment_status === 'pago' || form.payment_status === 'pago') && (
            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <Select value={form.payment_method} onValueChange={v => setForm({ ...form, payment_method: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}