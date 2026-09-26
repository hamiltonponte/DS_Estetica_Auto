import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import MaskedInput from '@/components/ui/masked-input';
import { maskPhone, maskCpf } from '@/lib/masks';

export default function ClientFormDialog({ open, onOpenChange, client, onSave, isSaving }) {
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', cpf: '', notes: '' });

  useEffect(() => {
    if (client) {
      const whatsapp = client.whatsapp || client.phone || '';
      setForm({
        name: client.name || '',
        whatsapp: maskPhone(whatsapp),
        email: client.email || '',
        cpf: maskCpf(client.cpf || ''),
        notes: client.notes || '',
      });
    } else {
      setForm({ name: '', whatsapp: '', email: '', cpf: '', notes: '' });
    }
  }, [client, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const whatsapp = form.whatsapp.trim();
    // Mantém phone sincronizado com WhatsApp para compatibilidade no app
    onSave({
      name: form.name.trim(),
      whatsapp,
      phone: whatsapp,
      email: form.email.trim(),
      cpf: form.cpf.trim(),
      notes: form.notes,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{client ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <MaskedInput
              id="whatsapp"
              mask="whatsapp"
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              placeholder="(11) 99999-9999"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <MaskedInput
              id="cpf"
              mask="cpf"
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
              placeholder="000.000.000-00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
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
