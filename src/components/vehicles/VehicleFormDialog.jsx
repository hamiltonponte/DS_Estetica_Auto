import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DamageReportsSection from '@/components/vehicles/DamageReportsSection';
import {
  getVehicleDamageReports,
  prepareVehicleDamagePayload,
} from '@/lib/vehicles/damageReports';
import { formatPlateDisplay, preparePlateFields } from '@/lib/vehicles/plateUtils';

export default function VehicleFormDialog({ open, onOpenChange, vehicle, clients, onSave, isSaving }) {
  const [form, setForm] = useState({
    client_id: '',
    brand: '',
    model: '',
    year: '',
    color: '',
    plate: '',
  });
  const [damageReports, setDamageReports] = useState([]);

  useEffect(() => {
    if (vehicle) {
      setForm({
        client_id: vehicle.client_id || '',
        brand: vehicle.brand || '',
        model: vehicle.model || '',
        year: vehicle.year || '',
        color: vehicle.color || '',
        plate: vehicle.plate || '',
      });
      setDamageReports(getVehicleDamageReports(vehicle));
    } else {
      setForm({
        client_id: '',
        brand: '',
        model: '',
        year: '',
        color: '',
        plate: '',
      });
      setDamageReports([]);
    }
  }, [vehicle, open]);

  const handlePlateChange = (value) => {
    setForm({ ...form, plate: formatPlateDisplay(value) });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const plateFields = preparePlateFields(form.plate);
    const damagePayload = prepareVehicleDamagePayload(damageReports);

    onSave({
      ...form,
      ...plateFields,
      year: form.year ? Number(form.year) : undefined,
      ...damagePayload,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle-plate">Placa *</Label>
            <Input
              id="vehicle-plate"
              value={form.plate}
              onChange={(e) => handlePlateChange(e.target.value)}
              placeholder="ABC-1D23"
              className="uppercase font-semibold tracking-wide"
              autoComplete="off"
              required
            />
            <p className="text-xs text-muted-foreground">
              A placa é o identificador principal para busca rápida no box.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Proprietário *</Label>
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients?.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Marca *</Label>
              <Input value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Modelo *</Label>
              <Input value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            </div>
          </div>

          <DamageReportsSection
            reports={damageReports}
            onChange={setDamageReports}
            disabled={isSaving}
          />

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
