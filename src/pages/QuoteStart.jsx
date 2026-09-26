import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, FileText, Send } from 'lucide-react';
import { api } from '@/api/apiClient';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import PageHeader from '@/components/shared/PageHeader';
import ServiceProductPicker, {
  buildSelectionSummary,
} from '@/components/shared/ServiceProductPicker';
import QuoteClientModal from '@/components/quotes/QuoteClientModal';
import { toast } from '@/components/ui/use-toast';
import { formatMoney } from '@/lib/whatsapp';

export default function QuoteStart() {
  const navigate = useNavigate();
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);
  const [selectedProductIds, setSelectedProductIds] = useState([]);
  const [notes, setNotes] = useState('');
  const [clientModalOpen, setClientModalOpen] = useState(false);

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
      selectedServiceIds,
      selectedProductIds,
    }),
    [activeServices, activeProducts, selectedServiceIds, selectedProductIds],
  );

  const toggleService = (id) => {
    setSelectedServiceIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const toggleProduct = (id) => {
    setSelectedProductIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  };

  const handleSendClick = () => {
    if (summary.items.length === 0) {
      toast({ title: 'Selecione pelo menos um serviço ou produto', variant: 'destructive' });
      return;
    }
    setClientModalOpen(true);
  };

  const resetSelection = () => {
    setSelectedServiceIds([]);
    setSelectedProductIds([]);
    setNotes('');
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Orçamento"
        subtitle="Selecione serviços e produtos — o cliente é informado na hora de enviar"
      />

      <div className="px-4 md:px-6 py-6 max-w-2xl space-y-5">
        <Button type="button" variant="ghost" className="px-0" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao início
        </Button>

        <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            O que incluir no orçamento?
          </h3>
          <p className="text-sm text-muted-foreground">
            Selecione um ou mais serviços e/ou produtos. Depois clique em enviar e informe o cliente.
          </p>

          <ServiceProductPicker
            services={activeServices}
            products={activeProducts}
            selectedServiceIds={selectedServiceIds}
            selectedProductIds={selectedProductIds}
            onToggleService={toggleService}
            onToggleProduct={toggleProduct}
            isLoading={loadingServices || loadingProducts}
          />

          <div className="space-y-2 pt-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Ex.: inclui materiais, validade especial..."
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold text-accent">
                R$ {formatMoney(summary.total)}
              </p>
              {summary.items.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1 max-w-[180px]">
                  {summary.names}
                </p>
              )}
            </div>
            <Button
              type="button"
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={summary.items.length === 0}
              onClick={handleSendClick}
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar orçamento
            </Button>
          </div>
        </div>
      </div>

      <QuoteClientModal
        open={clientModalOpen}
        onOpenChange={setClientModalOpen}
        items={summary.items}
        total={summary.total}
        notes={notes.trim()}
        onSent={resetSelection}
      />
    </div>
  );
}
