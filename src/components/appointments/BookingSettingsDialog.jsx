import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Check, Link2, Cloud, LogIn, LogOut, Loader2 } from 'lucide-react';
import { api } from '@/api/apiClient';
import { useBranding } from '@/lib/BrandingContext';
import { useCloudAuth } from '@/lib/cloud/CloudAuthContext';
import { isCloudEnabled, getAuthToken } from '@/lib/cloud/cloudConfig';
import { syncNow } from '@/lib/cloud/syncEngine';
import {
  DEFAULT_BOOKING_CONFIG,
  WEEKDAY_LABELS,
  buildPublicBookingUrl,
  normalizeSlug,
} from '@/lib/booking/bookingSlots';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import ImageUploadField from '@/components/shared/ImageUploadField';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

function ensureConfig(list, businessName) {
  if (list?.[0]) return list[0];
  const base = businessName || 'meu-negocio';
  return {
    ...DEFAULT_BOOKING_CONFIG,
    public_slug: normalizeSlug(base) || `negocio-${Date.now().toString(36)}`,
  };
}

export default function BookingSettingsDialog({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const { businessName } = useBranding();
  const { login, logout, user, syncing: cloudSyncing } = useCloudAuth();
  const [form, setForm] = useState(DEFAULT_BOOKING_CONFIG);
  const [copied, setCopied] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState('');

  const { data: configs = [], isLoading } = useQuery({
    queryKey: ['booking-config'],
    queryFn: () => api.entities.BookingConfig.list(),
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setForm(ensureConfig(configs, businessName));
    setCloudError('');
  }, [open, configs, businessName]);

  const publicUrl = useMemo(
    () => (form.public_slug ? buildPublicBookingUrl(form.public_slug) : ''),
    [form.public_slug],
  );

  const cloudReady = isCloudEnabled() && Boolean(getAuthToken());

  const handleCloudLogin = async (e) => {
    e.preventDefault();
    setCloudError('');
    setCloudLoading(true);
    try {
      await login(cloudEmail.trim(), cloudPassword);
      setCloudPassword('');
      toast({ title: 'Conectado à nuvem. Seus dados locais foram preservados.' });
    } catch (err) {
      setCloudError(err?.message || 'Não foi possível conectar.');
    } finally {
      setCloudLoading(false);
    }
  };

  const handleCloudLogout = () => {
    logout();
    toast({ title: 'Desconectado da nuvem (dados locais mantidos)' });
  };

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      const slug = normalizeSlug(data.public_slug);
      if (!slug) throw new Error('Informe um link público válido.');
      const payload = {
        ...DEFAULT_BOOKING_CONFIG,
        ...data,
        public_slug: slug,
        weekdays: Array.isArray(data.weekdays) ? data.weekdays : DEFAULT_BOOKING_CONFIG.weekdays,
        slot_minutes: Number(data.slot_minutes) || 60,
        max_per_day: Number(data.max_per_day) || 8,
        advance_days: Number(data.advance_days) || 30,
      };

      if (data.id) {
        return api.entities.BookingConfig.update(data.id, payload);
      }
      return api.entities.BookingConfig.create(payload);
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['booking-config'] });
      toast({ title: 'Configurações de agendamento salvas' });

      if (isCloudEnabled() && Boolean(getAuthToken())) {
        setSyncing(true);
        try {
          await syncNow({ preferPullFirst: true });
          toast({ title: 'Link sincronizado — pronto para o Instagram' });
        } catch (err) {
          toast({
            title: 'Salvo neste aparelho, mas a sincronização falhou',
            description: err?.message || 'Conecte à nuvem e tente salvar de novo.',
            variant: 'destructive',
          });
        } finally {
          setSyncing(false);
        }
      }

      onOpenChange(false);
    },
    onError: (err) => {
      toast({ title: err.message || 'Erro ao salvar', variant: 'destructive' });
    },
  });

  const toggleWeekday = (day) => {
    setForm((prev) => {
      const set = new Set(prev.weekdays || []);
      if (set.has(day)) set.delete(day);
      else set.add(day);
      return { ...prev, weekdays: [...set].sort((a, b) => a - b) };
    });
  };

  const handleCopy = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast({ title: 'Link copiado' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurações de agendamento online</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-10 flex justify-center">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Conexão nuvem — necessária só para o link do Instagram */}
            <div className="rounded-xl border border-border p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Cloud className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">Conexão para o link do Instagram</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    O app abre normalmente sem login. A nuvem só é usada para o cliente agendar
                    pelo Instagram e o horário aparecer em Agendados. Seus cadastros locais não são apagados.
                  </p>
                </div>
              </div>

              {cloudReady ? (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-green-500/10 border border-green-500/20 px-3 py-2">
                  <p className="text-xs text-green-700 dark:text-green-400 truncate">
                    Conectado{user?.email ? `: ${user.email}` : ''}
                  </p>
                  <Button type="button" variant="ghost" size="sm" onClick={handleCloudLogout}>
                    <LogOut className="w-3.5 h-3.5 mr-1" />
                    Sair
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCloudLogin} className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="E-mail da nuvem"
                      value={cloudEmail}
                      onChange={(e) => setCloudEmail(e.target.value)}
                      required
                    />
                    <Input
                      type="password"
                      autoComplete="current-password"
                      placeholder="Senha"
                      value={cloudPassword}
                      onChange={(e) => setCloudPassword(e.target.value)}
                      required
                    />
                  </div>
                  {cloudError && (
                    <p className="text-xs text-destructive">{cloudError}</p>
                  )}
                  <Button
                    type="submit"
                    variant="outline"
                    className="w-full"
                    disabled={cloudLoading || cloudSyncing}
                  >
                    {cloudLoading || cloudSyncing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <LogIn className="w-4 h-4 mr-2" />
                        Conectar à nuvem
                      </>
                    )}
                  </Button>
                </form>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
              <div>
                <p className="text-sm font-medium">Ativar link público</p>
                <p className="text-xs text-muted-foreground">
                  Clientes agendam pelo Instagram e o horário aparece em Agendados.
                </p>
              </div>
              <Switch
                checked={!!form.enabled}
                onCheckedChange={(v) => setForm((p) => ({ ...p, enabled: v }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Link público (slug)</Label>
              <Input
                value={form.public_slug || ''}
                onChange={(e) => setForm((p) => ({ ...p, public_slug: normalizeSlug(e.target.value) }))}
                placeholder="minha-estetica"
              />
              {publicUrl && (
                <div className="flex gap-2 mt-2">
                  <Input readOnly value={publicUrl} className="text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopy} title="Copiar link">
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              )}
              {!cloudReady && (
                <p className="text-xs text-amber-600 mt-1">
                  Conecte à nuvem acima e salve para o link funcionar no Instagram.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Mensagem de boas-vindas</Label>
              <Textarea
                rows={3}
                value={form.welcome_message || ''}
                onChange={(e) => setForm((p) => ({ ...p, welcome_message: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Banner / flyer (opcional)</Label>
              <ImageUploadField
                value={form.banner_url || ''}
                onChange={(url) => setForm((p) => ({ ...p, banner_url: url }))}
                label="Imagem de divulgação"
              />
            </div>

            <div className="space-y-2">
              <Label>Dias disponíveis</Label>
              <div className="flex flex-wrap gap-2">
                {WEEKDAY_LABELS.map((d) => {
                  const active = (form.weekdays || []).includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleWeekday(d.value)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                        active
                          ? 'bg-accent text-accent-foreground border-accent'
                          : 'bg-background border-border text-muted-foreground',
                      )}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Horário início</Label>
                <Input
                  type="time"
                  value={form.start_time || '09:00'}
                  onChange={(e) => setForm((p) => ({ ...p, start_time: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Horário fim</Label>
                <Input
                  type="time"
                  value={form.end_time || '18:00'}
                  onChange={(e) => setForm((p) => ({ ...p, end_time: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Duração do horário (min)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={form.slot_minutes || 60}
                  onChange={(e) => setForm((p) => ({ ...p, slot_minutes: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. agendamentos/dia</Label>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={form.max_per_day || 8}
                  onChange={(e) => setForm((p) => ({ ...p, max_per_day: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Antecedência máxima (dias)</Label>
              <Input
                type="number"
                min={1}
                max={120}
                value={form.advance_days || 30}
                onChange={(e) => setForm((p) => ({ ...p, advance_days: e.target.value }))}
              />
            </div>

            <div className="rounded-xl border border-border bg-muted/30 p-3 flex gap-2">
              <Link2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Cole o link na bio do Instagram. Horários iguais não são aceitos e o limite diário é respeitado.
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            disabled={saveMutation.isPending || syncing}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending || syncing ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
