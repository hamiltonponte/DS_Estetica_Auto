import React, { useState } from 'react';
import { ImagePlus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import MediaImage from '@/components/vehicles/MediaImage';
import { api } from '@/api/apiClient';
import { toast } from '@/components/ui/use-toast';
import { isStorageReady } from '@/lib/storage/entityStore';

/**
 * Upload de imagem para produto/serviço (novo ou edição).
 * Salva em IndexedDB / data URL via api.integrations.Core.UploadFile.
 */
export default function ImageUploadField({
  label = 'Imagem',
  value = '',
  onChange,
  disabled = false,
  hint = 'JPG, PNG ou WEBP · até 5MB',
}) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (!isStorageReady()) {
      toast({ title: 'Aguarde o app terminar de carregar', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({
        file,
        storage: 'indexeddb',
        maxSizeMb: 5,
      });
      onChange?.(file_url);
      toast({ title: 'Imagem carregada' });
    } catch (err) {
      toast({ title: err.message || 'Erro ao carregar imagem', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-xl border border-border overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center">
          {value ? (
            <MediaImage
              src={value}
              alt="Prévia"
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full bg-muted"
            />
          ) : (
            <ImagePlus className="w-7 h-7 text-muted-foreground/50" />
          )}
        </div>
        <div className="flex flex-col gap-2 min-w-0">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" disabled={disabled || uploading} asChild>
              <label className="cursor-pointer flex items-center">
                {uploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4 mr-2" />
                )}
                {uploading ? 'Enviando...' : value ? 'Trocar imagem' : 'Enviar imagem'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={disabled || uploading}
                  onChange={handleUpload}
                />
              </label>
            </Button>
            {value && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled || uploading}
                onClick={() => onChange?.('')}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
    </div>
  );
}
