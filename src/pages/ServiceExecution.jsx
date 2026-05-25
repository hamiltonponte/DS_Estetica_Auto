import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Play, CheckCircle2, Package, Plus, Trash2, FileText, Car, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import ServiceReceiptModal from '@/components/service-execution/ServiceReceiptModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ServiceExecution() {
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('');
  const [productsUsed, setProductsUsed] = useState([]);
  const [notes, setNotes] = useState('');
  const [receiptData, setReceiptData] = useState(null);
  const [addingProduct, setAddingProduct] = useState({ product_id: '', quantity: '' });
  const queryClient = useQueryClient();

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list('-date', 200),
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
  });

  const { data: executions = [] } = useQuery({
    queryKey: ['service-executions'],
    queryFn: () => api.entities.ServiceExecution.list('-created_date', 50),
  });

  const createExecution = useMutation({
    mutationFn: (data) => api.entities.ServiceExecution.create(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['service-executions'] });
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      setReceiptData(result);
      setSelectedAppointmentId('');
      setProductsUsed([]);
      setNotes('');
    },
  });

  const updateAppointment = useMutation({
    mutationFn: ({ id, data }) => api.entities.Appointment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['appointments'] }),
  });

  const pendingAppointments = appointments.filter(a =>
    a.status === 'agendado' || a.status === 'em_andamento'
  );

  const selectedAppointment = appointments.find(a => a.id === selectedAppointmentId);

  const addProductToList = () => {
    if (!addingProduct.product_id || !addingProduct.quantity) return;
    const product = products.find(p => p.id === addingProduct.product_id);
    if (!product) return;
    setProductsUsed(prev => [
      ...prev.filter(p => p.product_id !== addingProduct.product_id),
      {
        product_id: product.id,
        product_name: product.name,
        quantity: Number(addingProduct.quantity),
        unit: product.unit,
        cost_price: product.cost_price || 0,
      }
    ]);
    setAddingProduct({ product_id: '', quantity: '' });
  };

  const removeProduct = (productId) => {
    setProductsUsed(prev => prev.filter(p => p.product_id !== productId));
  };

  const totalProductsCost = productsUsed.reduce((sum, p) => sum + (p.quantity * (p.cost_price || 0)), 0);

  const handleFinalize = () => {
    if (!selectedAppointment) return;

    const executionData = {
      appointment_id: selectedAppointment.id,
      client_name: selectedAppointment.client_name,
      vehicle_info: selectedAppointment.vehicle_info,
      vehicle_id: selectedAppointment.vehicle_id,
      service_names: selectedAppointment.service_names,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'concluido',
      products_used: productsUsed,
      total_services_price: selectedAppointment.total_price || 0,
      total_products_cost: totalProductsCost,
      technician_notes: notes,
      receipt_sent: false,
    };

    createExecution.mutate(executionData);
    updateAppointment.mutate({ id: selectedAppointment.id, data: { ...selectedAppointment, status: 'concluido' } });
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Execução de Serviço" subtitle="Inicie e finalize serviços com registro de materiais" />

      <div className="px-4 md:px-6 py-6 space-y-6 max-w-3xl">
        {/* Select vehicle/appointment */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Car className="w-4 h-4 text-accent" />
            Selecionar Veículo / Agendamento
          </h3>
          {pendingAppointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento pendente no momento.</p>
          ) : (
            <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o agendamento..." />
              </SelectTrigger>
              <SelectContent>
                {pendingAppointments.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.client_name} — {a.vehicle_info || 'Veículo'} — {a.date ? format(new Date(a.date + 'T12:00:00'), 'dd/MM', { locale: ptBR }) : ''} {a.time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {selectedAppointment && (
            <div className="mt-4 p-4 bg-muted/50 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{selectedAppointment.client_name}</span>
                <Badge variant="outline" className={selectedAppointment.status === 'em_andamento' ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-blue-500/10 text-blue-600 border-blue-500/20'}>
                  {selectedAppointment.status === 'em_andamento' ? 'Em Andamento' : 'Agendado'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{selectedAppointment.vehicle_info}</p>
              <p className="text-xs text-muted-foreground">Serviços: {selectedAppointment.service_names || '—'}</p>
              <p className="text-sm font-bold text-accent">
                R$ {(selectedAppointment.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          )}
        </div>

        {/* Products used */}
        {selectedAppointment && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Package className="w-4 h-4 text-accent" />
              Produtos Utilizados
            </h3>

            {/* Add product row */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1">
                <Select value={addingProduct.product_id} onValueChange={v => setAddingProduct(p => ({ ...p, product_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} ({p.unit})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-28">
                <Input
                  type="number"
                  placeholder="Qtd"
                  value={addingProduct.quantity}
                  onChange={e => setAddingProduct(p => ({ ...p, quantity: e.target.value }))}
                  step="0.01"
                />
              </div>
              <Button
                type="button"
                onClick={addProductToList}
                disabled={!addingProduct.product_id || !addingProduct.quantity}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
                size="icon"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {productsUsed.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto adicionado</p>
            ) : (
              <div className="space-y-2">
                {productsUsed.map(p => (
                  <div key={p.product_id} className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
                    <div>
                      <span className="text-sm font-medium">{p.product_name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.quantity} {p.unit}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {p.cost_price > 0 && (
                        <span className="text-xs text-muted-foreground">
                          R$ {(p.quantity * p.cost_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeProduct(p.product_id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                {totalProductsCost > 0 && (
                  <div className="flex justify-end pt-2 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                      Custo total materiais: <strong>R$ {totalProductsCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Notes */}
        {selectedAppointment && (
          <div className="bg-card rounded-2xl border border-border p-5">
            <Label className="font-semibold mb-2 block">Observações do Técnico</Label>
            <Textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Registre observações sobre o serviço realizado..."
            />
          </div>
        )}

        {/* Finalize */}
        {selectedAppointment && (
          <Button
            className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-base py-6 rounded-2xl shadow-lg shadow-accent/20"
            onClick={handleFinalize}
            disabled={createExecution.isPending}
          >
            <CheckCircle2 className="w-5 h-5 mr-2" />
            {createExecution.isPending ? 'Finalizando...' : 'Finalizar Serviço e Gerar Nota'}
          </Button>
        )}

        {/* Recent executions */}
        {executions.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-accent" />
                Execuções Recentes
              </h3>
            </div>
            <div className="divide-y divide-border">
              {executions.map(ex => (
                <div key={ex.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{ex.client_name}</p>
                    <p className="text-xs text-muted-foreground">{ex.vehicle_info} • {ex.service_names}</p>
                    <p className="text-xs text-muted-foreground">
                      {ex.products_used?.length > 0 ? `${ex.products_used.length} produto(s) usado(s)` : 'Sem produtos'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-bold text-accent">
                      R$ {(ex.total_services_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => setReceiptData(ex)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Ver Nota
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {receiptData && (
        <ServiceReceiptModal
          execution={receiptData}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
}