import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Printer, CheckCircle2, Package, Wrench, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from '@/components/ui/use-toast';

export default function ServiceReceiptModal({ execution, onClose }) {
  if (!execution) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopy = async () => {
    const text = buildReceiptText(execution);
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: 'Nota copiada para a área de transferência' });
    } catch {
      toast({ title: 'Não foi possível copiar', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={!!execution} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Nota de Serviço
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4" id="receipt-content">
          <div className="bg-primary text-primary-foreground rounded-xl p-4 text-center">
            <h2 className="text-lg font-bold">DS Estética Auto</h2>
            <p className="text-xs text-primary-foreground/70">Estética Automotiva</p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{execution.client_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Veículo:</span>
              <span className="font-medium">{execution.vehicle_info}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">
                {execution.date ? format(new Date(execution.date + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : '—'}
              </span>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-accent" /> Serviços Realizados
            </h4>
            <div className="bg-muted/50 rounded-xl p-3">
              <div className="flex justify-between items-start">
                <span className="text-sm">{execution.service_names || '—'}</span>
                <span className="text-sm font-bold text-accent">
                  R$ {(execution.total_services_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          </div>

          {execution.products_used?.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-1">
                <Package className="w-3.5 h-3.5 text-accent" /> Materiais Utilizados
              </h4>
              <div className="bg-muted/50 rounded-xl p-3 space-y-2">
                {execution.products_used.map((p, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-foreground">{p.product_name}</span>
                    <span className="text-muted-foreground">{p.quantity} {p.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {execution.technician_notes && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Observações</h4>
              <div className="bg-muted/50 rounded-xl p-3">
                <p className="text-sm text-muted-foreground">{execution.technician_notes}</p>
              </div>
            </div>
          )}

          <div className="bg-accent/10 border border-accent/20 rounded-xl p-4 flex justify-between items-center">
            <span className="font-bold text-foreground">TOTAL</span>
            <span className="text-xl font-bold text-accent">
              R$ {(execution.total_services_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            <Copy className="w-4 h-4 mr-2" /> Copiar nota
          </Button>
          <Button variant="outline" onClick={handlePrint}>
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

function buildReceiptText(execution) {
  const date = execution.date
    ? format(new Date(execution.date + 'T12:00:00'), 'dd/MM/yyyy', {})
    : '';

  const products = execution.products_used?.length > 0
    ? execution.products_used.map((p) => `  - ${p.product_name}: ${p.quantity} ${p.unit}`).join('\n')
    : '  Nenhum material registrado';

  return `
NOTA DE SERVIÇO - DS Estética Auto
Data: ${date}
Cliente: ${execution.client_name}
Veículo: ${execution.vehicle_info}

SERVIÇOS: ${execution.service_names || '—'}

MATERIAIS:
${products}

TOTAL: R$ ${(execution.total_services_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
  `.trim();
}
