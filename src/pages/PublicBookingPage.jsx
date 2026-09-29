import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CalendarPlus, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MaskedInput from '@/components/ui/masked-input';
import MediaImage from '@/components/vehicles/MediaImage';
import {
  createPublicBooking,
  fetchPublicBookingPage,
  fetchPublicBookingSlots,
} from '@/lib/booking/publicBookingApi';
import {
  addEventToDeviceCalendar,
} from '@/lib/booking/bookingSlots';
import { formatMoney } from '@/lib/whatsapp';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/use-toast';

const DEFAULT_LOGO = `${import.meta.env.BASE_URL}brand/logo-ds.jpg`;

export default function PublicBookingPage() {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(null);

  const [serviceId, setServiceId] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(null);
  const [calendarSaving, setCalendarSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        if (!slug) throw new Error('Link de agendamento inválido.');
        const data = await fetchPublicBookingPage(slug);
        if (cancelled) return;
        setPage(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Não foi possível abrir o agendamento.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!slug || !date) {
      setSlots([]);
      setTime('');
      return undefined;
    }
    let cancelled = false;
    (async () => {
      setSlotsLoading(true);
      setTime('');
      try {
        const data = await fetchPublicBookingSlots(slug, date);
        if (cancelled) return;
        setSlots(data.slots || []);
      } catch (err) {
        if (!cancelled) {
          setSlots([]);
          setError(err.message || 'Erro ao carregar horários.');
        }
      } finally {
        if (!cancelled) setSlotsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug, date]);

  const selectedService = useMemo(
    () => (page?.services || []).find((s) => s.id === serviceId) || null,
    [page, serviceId],
  );

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const maxDate = useMemo(() => {
    const days = Number(page?.booking?.advance_days) || 30;
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }, [page]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!serviceId || !date || !time || !name.trim() || !whatsapp.trim()) {
      setError('Preencha serviço, data, horário, nome e WhatsApp.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const result = await createPublicBooking(slug, {
        service_id: serviceId,
        date,
        time,
        client_name: name.trim(),
        client_whatsapp: whatsapp.trim(),
        notes: notes.trim(),
      });
      setDone(result);
    } catch (err) {
      setError(err.message || 'Não foi possível concluir o agendamento.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveCalendar = async () => {
    if (!done?.appointment || !page || calendarSaving) return;
    const apt = done.appointment;
    setCalendarSaving(true);
    try {
      const result = await addEventToDeviceCalendar({
        title: `${page.business?.name || 'Agendamento'} — ${apt.service_names || 'Serviço'}`,
        description: `Agendamento confirmado.\nCliente: ${apt.client_name}\n${apt.notes || ''}`.trim(),
        date: apt.date,
        time: apt.time,
        durationMinutes: Number(page.booking?.slot_minutes) || 60,
        location: page.business?.address || '',
      });
      if (result.method === 'cancelled') return;
      if (result.method === 'share') {
        toast({ title: 'Pronto — confirme na agenda do celular' });
      } else {
        toast({ title: 'Abra a agenda e confirme o horário' });
      }
    } catch (err) {
      toast({
        title: err?.message || 'Não foi possível abrir a agenda',
        variant: 'destructive',
      });
    } finally {
      setCalendarSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-2">
          <p className="font-semibold text-lg">Agendamento indisponível</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const business = page?.business || {};
  const logo = business.logo_url || DEFAULT_LOGO;

  if (done?.appointment) {
    const apt = done.appointment;
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-4 py-10 space-y-6 text-center">
          <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
          <div>
            <h1 className="text-2xl font-brand font-bold">Agendamento confirmado!</h1>
            <p className="text-sm text-muted-foreground mt-2">
              {apt.service_names} · {apt.date.split('-').reverse().join('/')} às {apt.time}
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Quer guardar este horário na agenda do celular? O sistema pede sua confirmação — nada é baixado automaticamente.
          </p>
          <Button
            type="button"
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={handleSaveCalendar}
            disabled={calendarSaving}
          >
            <CalendarPlus className="w-4 h-4 mr-2" />
            {calendarSaving ? 'Abrindo agenda...' : 'Salvar na minha agenda'}
          </Button>
          <p className="text-xs text-muted-foreground">
            No iPhone/Android, escolha a Agenda e confirme. Em outros aparelhos, abre o Google Agenda para você aceitar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto">
        {page?.booking?.banner_url ? (
          <div className="w-full aspect-[16/7] overflow-hidden bg-muted">
            <MediaImage
              src={page.booking.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
              fallbackClassName="w-full h-full bg-muted"
            />
          </div>
        ) : null}

        <div className="px-4 py-6 space-y-5">
          <div className="flex items-center gap-3">
            <img
              src={logo}
              alt=""
              className="w-14 h-14 rounded-full object-cover border border-accent/30"
              onError={(e) => { e.currentTarget.src = DEFAULT_LOGO; }}
            />
            <div>
              <h1 className="text-xl font-brand font-bold leading-tight">
                {business.name || 'Agendamento'}
              </h1>
              {business.tagline && (
                <p className="text-[10px] text-accent font-semibold uppercase tracking-widest">
                  {business.tagline}
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {page?.booking?.welcome_message
              || 'Olá! Escolha o serviço e o horário desejado.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Serviço *</Label>
              <div className="space-y-2">
                {(page?.services || []).map((service) => {
                  const active = serviceId === service.id;
                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => setServiceId(service.id)}
                      className={cn(
                        'w-full text-left rounded-xl border p-3 transition-all',
                        active
                          ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                          : 'border-border hover:border-accent/40',
                      )}
                    >
                      <div className="flex justify-between gap-3">
                        <span className="font-medium text-sm">{service.name}</span>
                        <span className="text-sm font-bold text-accent shrink-0">
                          R$ {formatMoney(service.price)}
                        </span>
                      </div>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                    </button>
                  );
                })}
                {(page?.services || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum serviço disponível no momento.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input
                  type="date"
                  min={minDate}
                  max={maxDate}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Horário *</Label>
                {slotsLoading ? (
                  <div className="h-10 flex items-center text-sm text-muted-foreground">
                    Carregando horários...
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {slots.length === 0 && date ? (
                      <p className="text-xs text-muted-foreground py-2">
                        Nenhum horário livre neste dia.
                      </p>
                    ) : (
                      slots.map((slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setTime(slot)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg text-xs font-semibold border',
                            time === slot
                              ? 'bg-accent text-accent-foreground border-accent'
                              : 'border-border bg-background',
                          )}
                        >
                          {slot}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Seu nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="space-y-1.5">
              <Label>WhatsApp *</Label>
              <MaskedInput
                mask="whatsapp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Observações</Label>
              <Textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Modelo do carro, preferências..."
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
              disabled={submitting || !selectedService}
            >
              {submitting ? 'Confirmando...' : 'Confirmar agendamento'}
            </Button>
          </form>

          {business.phone && (
            <p className="text-center text-xs text-muted-foreground pt-2">
              Dúvidas? {business.phone}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
