import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, X, ImagePlus } from 'lucide-react';
import { api } from '@/api/apiClient';

export default function VehicleFormDialog({ open, onOpenChange, vehicle, clients, onSave, isSaving }) {
  const [form, setForm] = useState({ client_id: '', brand: '', model: '', year: '', color: '', plate: '' });
  const [damagePhotos, setDamagePhotos] = useState([]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
      setDamagePhotos(vehicle.damage_photos || []);
    } else {
      setForm({ client_id: '', brand: '', model: '', year: '', color: '', plate: '' });
      setDamagePhotos([]);
    }
  }, [vehicle, open]);

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    setDamagePhotos(prev => [...prev, file_url]);
    setUploadingPhoto(false);
  };

  const removePhoto = (index) => {
    setDamagePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      year: form.year ? Number(form.year) : undefined,
      damage_photos: damagePhotos,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{vehicle ? 'Editar Veículo' : 'Novo Veículo'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>Ano</Label>
              <Input type="number" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <Input value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Placa *</Label>
              <Input value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value })} required />
            </div>
          </div>

          {/* Damage Photos */}
          <div className="space-y-2">
            <Label>Registro de Avarias</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10 text-sm"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <Camera className="w-4 h-4 mr-2" />
                {uploadingPhoto ? 'Enviando...' : 'Tirar Foto'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-10 text-sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
              >
                <ImagePlus className="w-4 h-4 mr-2" />
                {uploadingPhoto ? 'Enviando...' : 'Galeria'}
              </Button>
            </div>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={e => handlePhotoUpload(e.target.files?.[0])}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => handlePhotoUpload(e.target.files?.[0])}
            />
            {damagePhotos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-2">
                {damagePhotos.map((url, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden aspect-square">
                    <img src={url} alt={`Avaria ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(idx)}
                      className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3 text-white" />
                    </button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[9px] text-center py-0.5">
                      Avaria {idx + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSaving || uploadingPhoto}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}