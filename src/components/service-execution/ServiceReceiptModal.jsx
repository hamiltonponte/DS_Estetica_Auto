import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle2, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';
import { useBranding } from '@/lib/BrandingContext';
import { PAYMENT_LABELS } from '@/components/service-execution/PaymentModal';
import StampsProgress from '@/components/loyalty/StampsProgress';
import { formatStampsText } from '@/lib/loyalty/awardStamp';

export default function ServiceReceiptModal({ execution, onClose }) {
  const {
    businessName,
    businessTagline,
    logoUrl,
    businessAddress,
    businessPhone,
    ownerName,
  } = useBranding();

  if (!execution) return null;

  const professional =
    execution.technician_name
    || ownerName
    || '—';

  const dateLabel = execution.date
    ? format(new Date(execution.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '—';

  const dateShort = execution.date
    ? format(new Date(execution.date + 'T12:00:00'), 'dd/MM/yyyy')
    : '';

  const total = (execution.total_services_price || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
  });

  const loyalty = execution.loyalty_snapshot || null;

  const handlePrint = () => {
    // Clona a nota no body para imprimir sem UI/toasts/modais
    const source = document.getElementById('receipt-print');
    if (!source) return;

    document.getElementById('print-root')?.remove();

    const root = document.createElement('div');
    root.id = 'print-root';
    const clone = source.cloneNode(true);
    clone.id = 'receipt-print-clone';
    clone.classList.remove('hidden');
    clone.style.display = 'block';
    root.appendChild(clone);
    document.body.appendChild(root);
    document.body.classList.add('printing-receipt');

    const cleanup = () => {
      document.body.classList.remove('printing-receipt');
      root.remove();
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);
    // fallback se afterprint não disparar
    setTimeout(cleanup, 60_000);
    setTimeout(() => window.print(), 80);
  };

  const handleCopy = async () => {
    const text = buildReceiptText({
      execution,
      businessName,
      businessTagline,
      businessAddress,
      businessPhone,
      professional,
      dateShort,
      total,
      loyalty,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Nota copiada para a área de transferência' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!execution} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto print:fixed print:inset-0 print:max-w-none print:max-h-none print:h-auto print:w-full print:overflow-visible print:border-0 print:shadow-none print:bg-white print:text-black print:p-0 print:rounded-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Nota de Serviço
          </DialogTitle>
        </DialogHeader>

        {/* Preview na tela */}
        <div className="space-y-3 print:hidden" id="receipt-screen">
          <div className="brand-hero rounded-xl p-4 text-center space-y-1">
            <img
              src={logoUrl}
              alt={businessName}
              className="w-14 h-14 rounded-full object-cover mx-auto border border-accent/30"
            />
            <h2 className="text-lg font-brand font-bold">{businessName}</h2>
            {businessTagline && (
              <p className="text-xs text-accent font-semibold uppercase tracking-wider">{businessTagline}</p>
            )}
            {businessAddress && <p className="text-xs text-muted-foreground">{businessAddress}</p>}
            {businessPhone && <p className="text-xs text-muted-foreground">Tel: {businessPhone}</p>}
          </div>
          <div className="bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
            <Row label="Cliente" value={execution.client_name} />
            <Row label="Veículo" value={execution.vehicle_info} />
            <Row label="Data" value={dateLabel} />
            <Row label="Profissional" value={professional} />
            {execution.payment_method && (
              <Row
                label="Pagamento"
                value={
                  execution.payment_method === 'prazo' && execution.payment_due_date
                    ? `A prazo · venc. ${format(new Date(execution.payment_due_date + 'T12:00:00'), 'dd/MM/yyyy')}`
                    : (PAYMENT_LABELS[execution.payment_method] || execution.payment_method)
                }
              />
            )}
          </div>
          <div className="bg-muted/50 rounded-xl p-3 space-y-1 text-sm">
            <div className="flex justify-between gap-2">
              <span>{execution.service_names || '—'}</span>
              <span className="font-medium whitespace-nowrap">
                R$ {(execution.subtotal ?? execution.total_services_price ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            {execution.discount_amount > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>
                  Desconto
                  {execution.discount_type === 'percent' ? ` (${execution.discount_value}%)` : ''}
                </span>
                <span>− R$ {Number(execution.discount_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
          </div>
          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex justify-between">
            <span className="font-bold">TOTAL</span>
            <span className="text-xl font-bold text-accent">R$ {total}</span>
          </div>

          {loyalty && (
            <StampsProgress
              stamps={loyalty.stamps}
              required={loyalty.required}
              rewardDescription={loyalty.reward_description}
              campaignName={loyalty.campaign_name}
              justCompleted={loyalty.just_completed}
            />
          )}
        </div>

        {/* Layout profissional só para impressão */}
        <div id="receipt-print" className="hidden print:block print:bg-white print:text-black p-8">
          <header className="border-b-2 border-black pb-4 mb-6 text-center">
            <img
              src={logoUrl}
              alt=""
              className="w-16 h-16 object-contain mx-auto mb-2"
            />
            <h1 className="text-2xl font-bold tracking-wide uppercase">{businessName}</h1>
            {businessTagline && (
              <p className="text-sm mt-1">{businessTagline}</p>
            )}
            {businessAddress && (
              <p className="text-sm mt-2">{businessAddress}</p>
            )}
            {businessPhone && (
              <p className="text-sm">Telefone: {businessPhone}</p>
            )}
          </header>

          <h2 className="text-center text-lg font-bold uppercase tracking-widest mb-6">
            Nota de Serviço
          </h2>

          <table className="w-full text-sm mb-6">
            <tbody>
              <tr>
                <td className="py-1.5 pr-4 font-semibold w-36">Data</td>
                <td className="py-1.5">{dateShort || dateLabel}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 font-semibold">Cliente</td>
                <td className="py-1.5">{execution.client_name || '—'}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 font-semibold">Veículo</td>
                <td className="py-1.5">{execution.vehicle_info || '—'}</td>
              </tr>
              <tr>
                <td className="py-1.5 pr-4 font-semibold">Profissional</td>
                <td className="py-1.5">{professional}</td>
              </tr>
              {execution.payment_method && (
                <tr>
                  <td className="py-1.5 pr-4 font-semibold">Pagamento</td>
                  <td className="py-1.5">
                    {execution.payment_method === 'prazo' && execution.payment_due_date
                      ? `A prazo · venc. ${format(new Date(execution.payment_due_date + 'T12:00:00'), 'dd/MM/yyyy')}`
                      : (PAYMENT_LABELS[execution.payment_method] || execution.payment_method)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          <div className="border border-black mb-6">
            <div className="bg-neutral-100 border-b border-black px-3 py-2 font-bold text-sm uppercase">
              Serviços realizados
            </div>
            <div className="px-3 py-3 flex justify-between text-sm">
              <span>{execution.service_names || '—'}</span>
              <span className="font-semibold whitespace-nowrap ml-4">R$ {total}</span>
            </div>
          </div>

          {execution.products_used?.length > 0 && (
            <div className="border border-black mb-6">
              <div className="bg-neutral-100 border-b border-black px-3 py-2 font-bold text-sm uppercase">
                Materiais utilizados
              </div>
              <ul className="px-3 py-2 text-sm space-y-1">
                {execution.products_used.map((p, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{p.product_name}</span>
                    <span>{p.quantity} {p.unit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {execution.technician_notes && (
            <div className="mb-6 text-sm">
              <p className="font-bold uppercase mb-1">Observações</p>
              <p>{execution.technician_notes}</p>
            </div>
          )}

          <div className="border-2 border-black px-4 py-3 flex justify-between items-center mb-6">
            <span className="font-bold text-base uppercase">Total</span>
            <span className="font-bold text-xl">R$ {total}</span>
          </div>

          {loyalty && (
            <div className="mb-10">
              <StampsProgress
                stamps={loyalty.stamps}
                required={loyalty.required}
                rewardDescription={loyalty.reward_description}
                campaignName={loyalty.campaign_name}
                justCompleted={loyalty.just_completed}
                printMode
              />
            </div>
          )}

          <div className="mt-12 grid grid-cols-2 gap-8 text-center text-sm">
            <div>
              <div className="border-t border-black pt-2 mx-4">Assinatura do cliente</div>
            </div>
            <div>
              <div className="border-t border-black pt-2 mx-4">
                {professional !== '—' ? professional : 'Profissional responsável'}
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-neutral-600 mt-10">
            Documento emitido por {businessName}
            {businessPhone ? ` · ${businessPhone}` : ''}
          </p>
        </div>

        <div className="flex gap-2 pt-2 print:hidden">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" /> Copiar nota
          </Button>
          <Button variant="outline" onClick={handlePrint} title="Imprimir">
            <Printer className="w-4 h-4" />
          </Button>
          <Button className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-right">{value || '—'}</span>
    </div>
  );
}

function buildReceiptText({
  execution,
  businessName,
  businessTagline,
  businessAddress,
  businessPhone,
  professional,
  dateShort,
  total,
  loyalty,
}) {
  const products = execution.products_used?.length > 0
    ? execution.products_used.map((p) => `  - ${p.product_name}: ${p.quantity} ${p.unit}`).join('\n')
    : '  Nenhum material registrado';

  const paymentLine = execution.payment_method
    ? `\nPagamento: ${PAYMENT_LABELS[execution.payment_method] || execution.payment_method}`
    : '';

  const stampsBlock = loyalty ? `\n\n${formatStampsText(loyalty)}` : '';

  return `
${businessName}
${businessTagline || ''}
${businessAddress || ''}
${businessPhone ? `Tel: ${businessPhone}` : ''}

NOTA DE SERVIÇO
Data: ${dateShort}
Cliente: ${execution.client_name}
Veículo: ${execution.vehicle_info}
Profissional: ${professional}${paymentLine}

SERVIÇOS: ${execution.service_names || '—'}

MATERIAIS:
${products}

TOTAL: R$ ${total}${stampsBlock}
  `.trim();
}
