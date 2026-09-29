import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  ArrowLeft, CheckCircle2, Play, UserPlus, SkipForward, Wrench,
} from 'lucide-react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import MaskedInput from '@/components/ui/masked-input';
import PageHeader from '@/components/shared/PageHeader';
import ServiceProductPicker, {
  buildSelectionSummary,
  setItemQuantity,
} from '@/components/shared/ServiceProductPicker';
import PaymentModal from '@/components/service-execution/PaymentModal';
import ServiceReceiptModal from '@/components/service-execution/ServiceReceiptModal';
import { createPaymentDueReminder } from '@/lib/reminders';
import { awardStampOnServiceComplete } from '@/lib/loyalty/awardStamp';
import { toast } from '@/components/ui/use-toast';
import {
  formatMoney,
  maskMoneyInput,
  maskPercentInput,
  parseMoneyInput,
  parsePercentInput,
  calcDiscount,
} from '@/lib/whatsapp';
import { cn } from '@/lib/utils';

const STEPS = {
  SELECT: 'select',
  RUNNING: 'running',
  CLIENT: 'client',
  DONE: 'done',
};

export default function QuickStartService() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(STEPS.SELECT);
  const [serviceQuantities, setServiceQuantities] = useState({});
  const [productQuantities, setProductQuantities] = useState({});
  const [notes, setNotes] = useState('');
  const [discountType, setDiscountType] = useState('fixed'); // fixed | percent
  const [discountInput, setDiscountInput] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [clientForm, setClientForm] = useState({ name: '', whatsapp: '' });
  const [receiptData, setReceiptData] = useState(null);
  const [lastExecution, setLastExecution] = useState(null);
  const [draftId] = useState(() => crypto.randomUUID());

  const { data: services = [], isLoading: loadingServices } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list('name'),
  });

  const { data: products = [], isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list('name'),
  });

  const activeServices = useMemo(
    () => services.filter((s) => s.active !== false),
    [services],
  );
  const activeProducts = useMemo(
    () => products.filter((p) => p.active !== false),
    [products],
  );

  const summary = useMemo(
    () => buildSelectionSummary({
      services: activeServices,
      products: activeProducts,
      serviceQuantities,
      productQuantities,
    }),
    [activeServices, activeProducts, serviceQuantities, productQuantities],
  );

  const selectedServiceIds = summary.selectedServiceIds;
  const selectedProductIds = summary.selectedProductIds;

  const totalPrice = summary.total;
  const itemNames = summary.names;

  const discountValue = discountType === 'percent'
    ? parsePercentInput(discountInput)
    : parseMoneyInput(discountInput);

  const { discount: discountAmount, total: payableTotal } = useMemo(
    () => calcDiscount({
      subtotal: totalPrice,
      type: discountType === 'percent' ? 'percent' : 'fixed',
      value: discountValue,
    }),
    [totalPrice, discountType, discountValue],
  );

  const createExecution = useMutation({
    mutationFn: async ({ execution, appointment }) => {
      const apt = await api.entities.Appointment.create(appointment);
      const result = await api.entities.ServiceExecution.create({
        ...execution,
        appointment_id: apt.id,
      });
      if (execution.payment_method === 'prazo' && execution.payment_due_date) {
        await createPaymentDueReminder({
          clientName: execution.client_name,
          clientPhone: execution.client_phone,
          clientWhatsapp: execution.client_whatsapp,
          amount: execution.total_services_price,
          dueDate: execution.payment_due_date,
          serviceNames: execution.service_names,
          appointmentId: apt.id,
          executionId: result.id,
          message: execution.prazo_message,
        });
      }

      const loyalty = await awardStampOnServiceComplete({
        clientId: execution.client_id,
        clientName: execution.client_name,
      });

      if (loyalty) {
        const updated = await api.entities.ServiceExecution.update(result.id, {
          loyalty_snapshot: loyalty,
        });
        return { ...result, ...updated, loyalty_snapshot: loyalty };
      }

      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['service-executions'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      queryClient.invalidateQueries({ queryKey: ['client-loyalty'] });
      setLastExecution(result);
      setReceiptData(result);
      setStep(STEPS.DONE);
    },
  });

  const startService = () => {
    if (summary.items.length === 0) {
      toast({ title: 'Selecione pelo menos um serviço ou produto', variant: 'destructive' });
      return;
    }
    setStep(STEPS.RUNNING);
  };

  const handlePaymentConfirm = (data) => {
    setPaymentData(data);
    setPaymentOpen(false);
    setStep(STEPS.CLIENT);
  };

  const buildPayloads = (client = {}) => {
    const clientName = client.name || 'Cliente avulso';
    const date = format(new Date(), 'yyyy-MM-dd');
    const time = format(new Date(), 'HH:mm');

    const productsSold = summary.items
      .filter((i) => i.type === 'product')
      .map((i) => ({
        product_id: i.ref_id,
        product_name: i.name,
        quantity: i.quantity,
        unit: i.unit,
        sale_price: i.unit_price,
      }));

    const appointment = {
      client_id: client.id || null,
      client_name: clientName,
      client_phone: client.phone || '',
      client_whatsapp: client.whatsapp || client.phone || '',
      vehicle_info: '',
      vehicle_id: null,
      service_ids: selectedServiceIds,
      product_ids: selectedProductIds,
      service_names: itemNames,
      date,
      time,
      status: 'concluido',
      total_price: payableTotal,
      subtotal: totalPrice,
      discount_type: discountAmount > 0 ? discountType : null,
      discount_value: discountAmount > 0 ? discountValue : 0,
      discount_amount: discountAmount,
      payment_status: paymentData?.payment_status || 'pago',
      payment_method: paymentData?.payment_method || '',
      payment_due_date: paymentData?.payment_due_date || null,
      notes: notes || 'Serviço rápido (iniciar serviço)',
      quick_start: true,
    };

    const execution = {
      appointment_id: null,
      quick_start: true,
      client_id: client.id || null,
      client_name: clientName,
      client_phone: client.phone || '',
      client_whatsapp: client.whatsapp || client.phone || '',
      client_address: client.address || '',
      vehicle_info: '',
      vehicle_id: null,
      service_ids: selectedServiceIds,
      product_ids: selectedProductIds,
      service_names: itemNames,
      date,
      status: 'concluido',
      products_used: [],
      products_sold: productsSold,
      total_services_price: payableTotal,
      subtotal: totalPrice,
      discount_type: discountAmount > 0 ? discountType : null,
      discount_value: discountAmount > 0 ? discountValue : 0,
      discount_amount: discountAmount,
      total_products_cost: 0,
      technician_notes: notes,
      technician_name: paymentData?.technician_name || '',
      payment_method: paymentData?.payment_method || '',
      payment_status: paymentData?.payment_status || 'pago',
      amount_received: paymentData?.amount_received ?? payableTotal,
      payment_due_date: paymentData?.payment_due_date || null,
      prazo_message: paymentData?.prazo_message || '',
      receipt_sent: false,
    };

    return { appointment, execution };
  };

  const finishWithoutClient = () => {
    createExecution.mutate(buildPayloads());
  };

  const finishWithClient = async () => {
    const name = clientForm.name.trim();
    if (!name) {
      toast({ title: 'Informe o nome do cliente ou pule o cadastro', variant: 'destructive' });
      return;
    }

    try {
      const client = await api.entities.Client.create({
        name,
        phone: clientForm.whatsapp.trim(),
        whatsapp: clientForm.whatsapp.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      createExecution.mutate(buildPayloads(client));
    } catch (err) {
      toast({ title: err.message || 'Erro ao cadastrar cliente', variant: 'destructive' });
    }
  };

  const resetFlow = () => {
    setStep(STEPS.SELECT);
    setServiceQuantities({});
    setProductQuantities({});
    setNotes('');
    setDiscountType('fixed');
    setDiscountInput('');
    setPaymentData(null);
    setClientForm({ name: '', whatsapp: '' });
    setReceiptData(null);
    setLastExecution(null);
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Iniciar serviço"
        subtitle="Fluxo rápido — escolha serviços e produtos e receba no final"
      />

      <div className="px-4 md:px-6 py-6 max-w-2xl space-y-5">
        <Button type="button" variant="ghost" className="px-0" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao início
        </Button>

        {step === STEPS.SELECT && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4 text-accent" />
              O que será feito?
            </h3>
            <p className="text-sm text-muted-foreground">
              Selecione itens e ajuste a quantidade. O cadastro do cliente só aparece no final, se você quiser.
            </p>

            <ServiceProductPicker
              services={activeServices}
              products={activeProducts}
              serviceQuantities={serviceQuantities}
              productQuantities={productQuantities}
              onServiceQuantityChange={(id, qty) => {
                setServiceQuantities((prev) => setItemQuantity(prev, id, qty));
              }}
              onProductQuantityChange={(id, qty) => {
                setProductQuantities((prev) => setItemQuantity(prev, id, qty));
              }}
              isLoading={loadingServices || loadingProducts}
            />

            <div className="flex items-center justify-between pt-2 border-t border-border">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-accent">
                  R$ {formatMoney(totalPrice)}
                </p>
              </div>
              <Button
                type="button"
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={summary.items.length === 0}
                onClick={startService}
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar
              </Button>
            </div>
          </div>
        )}

        {step === STEPS.RUNNING && (
          <div className="space-y-4">
            <div className="bg-card rounded-2xl border border-border p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-600">
                <Play className="w-4 h-4" />
                <span className="text-sm font-semibold">Serviço em andamento</span>
              </div>
              <p className="font-medium">{itemNames}</p>
              <div>
                <p className="text-xs text-muted-foreground">Subtotal</p>
                <p className="text-xl font-bold text-foreground">
                  R$ {formatMoney(totalPrice)}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-3">
                <Label>Desconto (opcional)</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('fixed');
                      setDiscountInput('');
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                      discountType === 'fixed'
                        ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent/30'
                        : 'border-border hover:border-accent/40',
                    )}
                  >
                    R$ valor fixo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDiscountType('percent');
                      setDiscountInput('');
                    }}
                    className={cn(
                      'rounded-lg border px-3 py-2 text-sm font-medium transition-all',
                      discountType === 'percent'
                        ? 'border-accent bg-accent/10 text-accent ring-1 ring-accent/30'
                        : 'border-border hover:border-accent/40',
                    )}
                  >
                    % porcentagem
                  </button>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    {discountType === 'percent' ? 'Porcentagem de desconto' : 'Valor do desconto (R$)'}
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {discountType === 'percent' ? '%' : 'R$'}
                    </span>
                    <Input
                      inputMode="decimal"
                      className="pl-10"
                      value={discountInput}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setDiscountInput(
                          discountType === 'percent'
                            ? maskPercentInput(raw)
                            : maskMoneyInput(raw),
                        );
                      }}
                      placeholder={discountType === 'percent' ? '0' : '0,00'}
                    />
                  </div>
                </div>
                {discountAmount > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Desconto aplicado:{' '}
                    <span className="font-semibold text-foreground">
                      − R$ {formatMoney(discountAmount)}
                      {discountType === 'percent' ? ` (${discountValue}%)` : ''}
                    </span>
                  </p>
                )}
              </div>

              <div className="rounded-xl bg-accent/10 border border-accent/20 p-4 text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                  Valor a pagar
                </p>
                <p className="text-3xl font-bold text-accent">
                  R$ {formatMoney(payableTotal)}
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <Label>Observações (opcional)</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Anotações do serviço..."
                />
              </div>
            </div>

            <Button
              type="button"
              className="w-full bg-green-600 hover:bg-green-700 text-white text-base py-6 rounded-2xl"
              onClick={() => setPaymentOpen(true)}
            >
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Receber e finalizar · R$ {formatMoney(payableTotal)}
            </Button>

            <Button type="button" variant="outline" className="w-full" onClick={() => setStep(STEPS.SELECT)}>
              Voltar e alterar seleção
            </Button>
          </div>
        )}

        {step === STEPS.CLIENT && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-accent" />
              Cadastrar cliente? (opcional)
            </h3>
            <p className="text-sm text-muted-foreground">
              Você pode finalizar só com o recebimento. Cadastre o cliente apenas se quiser guardar no histórico.
            </p>

            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={clientForm.name}
                  onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Nome do cliente"
                />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <MaskedInput
                  mask="whatsapp"
                  value={clientForm.whatsapp}
                  onChange={(e) => setClientForm((p) => ({ ...p, whatsapp: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                type="button"
                className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground"
                disabled={createExecution.isPending}
                onClick={finishWithClient}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Salvar cliente e concluir
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={createExecution.isPending}
                onClick={finishWithoutClient}
              >
                <SkipForward className="w-4 h-4 mr-2" />
                Concluir sem cadastrar
              </Button>
            </div>
          </div>
        )}

        {step === STEPS.DONE && (
          <div className="bg-card rounded-2xl border border-border p-5 space-y-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <h3 className="font-semibold text-lg">Serviço concluído</h3>
            <p className="text-sm text-muted-foreground">
              Pagamento registrado
              {lastExecution?.client_name ? ` · ${lastExecution.client_name}` : ''}.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button type="button" className="flex-1" onClick={() => setReceiptData(lastExecution)}>
                Ver nota
              </Button>
              <Button type="button" variant="outline" className="flex-1" onClick={resetFlow}>
                Novo serviço
              </Button>
              <Button type="button" variant="ghost" className="flex-1" onClick={() => navigate('/')}>
                Início
              </Button>
            </div>
          </div>
        )}
      </div>

      <PaymentModal
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onConfirm={handlePaymentConfirm}
        totalAmount={payableTotal}
        appointmentId={draftId}
        clientName={clientForm.name}
        clientWhatsapp={clientForm.whatsapp}
        serviceNames={itemNames}
      />

      {receiptData && (
        <ServiceReceiptModal
          execution={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
}
