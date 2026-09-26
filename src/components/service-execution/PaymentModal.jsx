import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { DollarSign, CheckCircle2, Copy, QrCode, CalendarClock } from 'lucide-react';
import { api } from '@/api/apiClient';
import { buildPixPayload, extractCityFromAddress } from '@/lib/pix/pixBrCode';
import { toast } from '@/components/ui/use-toast';
import { openWhatsApp, formatMoney } from '@/lib/whatsapp';
import { useBranding } from '@/lib/BrandingContext';
import { format, addDays } from 'date-fns';
import QRCode from 'qrcode';

const PAYMENT_LABELS = {
  dinheiro: 'Dinheiro',
  pix: 'PIX',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  prazo: 'A prazo',
};

function buildPrazoMessage({
  businessName,
  businessAddress,
  businessPhone,
  clientName,
  serviceNames,
  amount,
  dueDate,
  technicianName,
}) {
  const dueLabel = dueDate
    ? format(new Date(dueDate + 'T12:00:00'), 'dd/MM/yyyy')
    : '—';

  return [
    `*NOTA DE PAGAMENTO A PRAZO*`,
    `*${businessName}*`,
    businessAddress || null,
    businessPhone ? `Tel: ${businessPhone}` : null,
    ``,
    `Olá${clientName ? `, ${clientName}` : ''}!`,
    ``,
    `Serviço realizado:`,
    serviceNames || '—',
    ``,
    `*Valor: R$ ${formatMoney(amount)}*`,
    `*Vencimento: ${dueLabel}*`,
    technicianName ? `Profissional: ${technicianName}` : null,
    ``,
    `Esta é a confirmação do serviço com pagamento agendado.`,
    `Qualquer dúvida, estamos à disposição.`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export default function PaymentModal({
  open,
  onOpenChange,
  onConfirm,
  totalAmount,
  appointmentId,
  clientName = '',
  clientWhatsapp = '',
  serviceNames = '',
}) {
  const { businessName, businessAddress, businessPhone } = useBranding();
  const [paymentMethod, setPaymentMethod] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [sendPrazoWhatsapp, setSendPrazoWhatsapp] = useState(true);
  const [pixPayload, setPixPayload] = useState('');
  const [pixQrDataUrl, setPixQrDataUrl] = useState('');
  const [pixLoading, setPixLoading] = useState(false);

  const amount = Number(totalAmount) || 0;

  const { data: configs = [] } = useQuery({
    queryKey: ['business-config'],
    queryFn: () => api.entities.BusinessConfig.list(),
    enabled: open,
  });

  const config = configs[0];
  const pixReady = Boolean(config?.pix_key && config?.pix_key_type);

  const formattedAmount = useMemo(
    () => amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    [amount],
  );

  useEffect(() => {
    if (!open) {
      setPaymentMethod('');
      setTechnicianName('');
      setDueDate('');
      setSendPrazoWhatsapp(true);
      setPixPayload('');
      setPixQrDataUrl('');
    } else {
      setDueDate(format(addDays(new Date(), 7), 'yyyy-MM-dd'));
    }
  }, [open]);

  useEffect(() => {
    if (paymentMethod !== 'pix') {
      setPixPayload('');
      setPixQrDataUrl('');
    }
  }, [paymentMethod]);

  const generatePixQr = async () => {
    if (!pixReady) {
      toast({
        title: 'Configure o PIX em Configurações',
        variant: 'destructive',
      });
      return;
    }

    setPixLoading(true);
    try {
      const city =
        config.pix_city?.trim() ||
        extractCityFromAddress(config.address);

      const payload = buildPixPayload({
        pixKey: config.pix_key,
        pixKeyType: config.pix_key_type,
        amount,
        receiverName: config.business_name || 'DS Estetica Auto',
        city,
        txid: appointmentId ? `DSEST${String(appointmentId).replace(/-/g, '').slice(0, 20)}` : undefined,
      });

      const dataUrl = await QRCode.toDataURL(payload, {
        width: 280,
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      });

      setPixPayload(payload);
      setPixQrDataUrl(dataUrl);
    } catch (err) {
      toast({
        title: err.message || 'Erro ao gerar QR Code PIX',
        variant: 'destructive',
      });
    } finally {
      setPixLoading(false);
    }
  };

  useEffect(() => {
    if (paymentMethod === 'pix' && pixReady && amount > 0) {
      generatePixQr();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentMethod, pixReady, amount, config?.pix_key]);

  const handleCopyPix = async () => {
    if (!pixPayload) return;
    try {
      await navigator.clipboard.writeText(pixPayload);
      toast({ title: 'Código PIX copiado' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!paymentMethod) return;
    if (paymentMethod === 'pix' && !pixReady) {
      toast({ title: 'Cadastre a chave PIX em Configurações', variant: 'destructive' });
      return;
    }
    if (paymentMethod === 'prazo' && !dueDate) {
      toast({ title: 'Informe a data de pagamento', variant: 'destructive' });
      return;
    }

    const isPrazo = paymentMethod === 'prazo';
    const prazoMessage = isPrazo
      ? buildPrazoMessage({
          businessName,
          businessAddress,
          businessPhone,
          clientName,
          serviceNames,
          amount,
          dueDate,
          technicianName,
        })
      : '';

    if (isPrazo && sendPrazoWhatsapp) {
      openWhatsApp({ phone: clientWhatsapp, message: prazoMessage });
    }

    onConfirm({
      payment_method: paymentMethod,
      amount_received: isPrazo ? 0 : amount,
      technician_name: technicianName,
      payment_status: isPrazo ? 'pendente' : 'pago',
      payment_due_date: isPrazo ? dueDate : null,
      prazo_message: prazoMessage,
      send_prazo_whatsapp: isPrazo && sendPrazoWhatsapp,
    });
  };

  const canConfirm =
    paymentMethod &&
    amount > 0 &&
    (paymentMethod !== 'pix' || (pixReady && pixQrDataUrl)) &&
    (paymentMethod !== 'prazo' || Boolean(dueDate));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Recebimento de Pagamento
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Valor do serviço</p>
            <p className="text-3xl font-bold text-accent">R$ {formattedAmount}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Valor definido automaticamente pelo agendamento</p>
          </div>

          <div className="space-y-2">
            <Label>Forma de Pagamento *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                <SelectItem value="prazo">A prazo (cobrar depois)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'prazo' && (
            <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <CalendarClock className="w-4 h-4" />
                  Data de pagamento *
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
              <label className="flex items-start gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={sendPrazoWhatsapp}
                  onCheckedChange={(v) => setSendPrazoWhatsapp(Boolean(v))}
                  className="mt-0.5"
                />
                <span>
                  Enviar nota de prazo no WhatsApp
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    Sem número cadastrado, o WhatsApp abre para você escolher o contato.
                  </span>
                </span>
              </label>
              <p className="text-xs text-amber-200/90">
                Um lembrete de cobrança será criado na data escolhida (menu Lembretes).
              </p>
            </div>
          )}

          {paymentMethod === 'pix' && (
            <div className="space-y-3 rounded-xl border border-border p-4 bg-muted/30">
              {!pixReady ? (
                <p className="text-sm text-amber-600">
                  Cadastre chave PIX e tipo em Configurações → Pagamento via PIX.
                </p>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4" /> QR Code PIX
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generatePixQr}
                      disabled={pixLoading}
                    >
                      {pixLoading ? 'Gerando...' : 'Atualizar QR'}
                    </Button>
                  </div>

                  {pixQrDataUrl ? (
                    <div className="flex flex-col items-center gap-3">
                      <img
                        src={pixQrDataUrl}
                        alt="QR Code PIX"
                        className="w-[220px] h-[220px] rounded-lg border border-border bg-white p-2"
                      />
                      <p className="text-sm font-semibold text-accent">R$ {formattedAmount}</p>
                      <Button type="button" variant="outline" size="sm" onClick={handleCopyPix} className="w-full">
                        <Copy className="w-4 h-4 mr-2" />
                        Copiar código PIX
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      {pixLoading ? 'Gerando QR Code...' : 'Aguarde a geração do QR Code'}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Nome do Profissional</Label>
            <Input
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              placeholder="Quem realizou o serviço?"
            />
          </div>

          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="sm:flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white sm:flex-1"
              disabled={!canConfirm}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {paymentMethod === 'prazo' ? 'Confirmar a prazo' : 'Pagamento Recebido'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { PAYMENT_LABELS, buildPrazoMessage };
