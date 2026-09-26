import React, { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/api/apiClient';
import {
  VEHICLE_DAMAGE_AREAS,
  createDamageReport,
  formatDamageCapturedAt,
} from '@/lib/vehicles/damageReports';
import MediaImage from '@/components/vehicles/MediaImage';

const IOS_CAMERA_ATTRS = {
  accept: 'image/*',
  capture: 'environment',
};

export default function DamageReportsSection({
  reports,
  onChange,
  disabled = false,
}) {
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(null);
  const [draftArea, setDraftArea] = useState('Outra área');
  const [draftDescription, setDraftDescription] = useState('');

  useEffect(() => {
    if (!pending) {
      setDraftArea('Outra área');
      setDraftDescription('');
    }
  }, [pending]);

  const resetInput = (input) => {
    if (input) input.value = '';
  };

  const handleFileSelected = async (file, source) => {
    if (!file || disabled) return;

    setError('');
    setUploading(true);
    try {
      const { file_url, mime_type, byte_size } = await api.integrations.Core.UploadFile({
        file,
        storage: 'indexeddb',
      });
      setPending({ photoRef: file_url, source, mime_type, byte_size });
    } catch (err) {
      setError(err?.message || 'Não foi possível salvar a foto.');
    } finally {
      setUploading(false);
    }
  };

  const confirmPending = () => {
    if (!pending?.photoRef) return;
    if (!draftArea.trim()) {
      setError('Informe a parte do veículo.');
      return;
    }

    const report = createDamageReport({
      photoRef: pending.photoRef,
      areaLabel: draftArea,
      description: draftDescription,
      source: pending.source,
      mimeType: pending.mime_type,
      byteSize: pending.byte_size,
    });

    onChange([...(reports || []), report]);
    setPending(null);
    setError('');
  };

  const removeReport = (id) => {
    onChange((reports || []).filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-3">
      <div>
        <Label>Registro de avarias</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Documente danos com foto, parte do carro e descrição. Funciona offline (câmera ou galeria).
        </p>
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-10 text-sm"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <Camera className="w-4 h-4 mr-2" />
          {uploading ? 'Salvando...' : 'Câmera'}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 h-10 text-sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading}
        >
          <ImagePlus className="w-4 h-4 mr-2" />
          {uploading ? 'Salvando...' : 'Galeria'}
        </Button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        {...IOS_CAMERA_ATTRS}
        className="hidden"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0], 'camera');
          resetInput(e.target);
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          handleFileSelected(e.target.files?.[0], 'gallery');
          resetInput(e.target);
        }}
      />

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {(reports || []).length > 0 && (
        <div className="space-y-2">
          {(reports || []).map((report) => (
            <div
              key={report.id}
              className="flex gap-3 rounded-xl border border-border p-2 bg-muted/20"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                <MediaImage
                  src={report.photo_ref}
                  alt={report.area_label}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{report.area_label}</p>
                {report.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-2">{report.description}</p>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sem descrição</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1">
                  {formatDamageCapturedAt(report.captured_at)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeReport(report.id)}
                className="self-start rounded-full p-1 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                aria-label="Remover avaria"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Detalhes da avaria</DialogTitle>
          </DialogHeader>

          {pending?.photoRef && (
            <div className="rounded-xl overflow-hidden aspect-video bg-muted">
              <MediaImage
                src={pending.photoRef}
                alt="Pré-visualização"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="damage-area">Parte do veículo *</Label>
              <Input
                id="damage-area"
                list="vehicle-damage-areas"
                value={draftArea}
                onChange={(e) => setDraftArea(e.target.value)}
                placeholder="Ex.: Para-lama dianteiro direito"
                required
              />
              <datalist id="vehicle-damage-areas">
                {VEHICLE_DAMAGE_AREAS.map((area) => (
                  <option key={area} value={area} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="damage-description">Descrição</Label>
              <textarea
                id="damage-description"
                value={draftDescription}
                onChange={(e) => setDraftDescription(e.target.value)}
                placeholder="Ex.: Risco superficial, amassado leve..."
                rows={3}
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button type="button" onClick={confirmPending}>
              Adicionar avaria
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
