import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Car, CheckCircle2, Clock, Calendar, DollarSign, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  agendado: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  em_andamento: { label: 'Em Andamento', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  concluido: { label: 'Concluído', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export default function ClientHistoryModal({ client, open, onOpenChange }) {
  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments', 'client', client?.id],
    queryFn: () => api.entities.Appointment.filter({ client_id: client.id }, '-date', 50),
    enabled: !!client?.id && open,
  });

  const totalSpent = appointments
    .filter(a => a.status === 'concluido' && a.payment_status === 'pago')
    .reduce((sum, a) => sum + (a.total_price || 0), 0);

  const completedCount = appointments.filter(a => a.status === 'concluido').length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
              <span className="text-sm font-bold text-accent">{client?.name?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div>
              <p className="font-bold">{client?.name}</p>
              <p className="text-xs text-muted-foreground font-normal">{client?.phone}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3 py-2">
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <Calendar className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold">{appointments.length}</p>
            <p className="text-[10px] text-muted-foreground">agendamentos</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto mb-1" />
            <p className="text-lg font-bold">{completedCount}</p>
            <p className="text-[10px] text-muted-foreground">concluídos</p>
          </div>
          <div className="bg-muted/50 rounded-xl p-3 text-center">
            <DollarSign className="w-4 h-4 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold">R$ {totalSpent.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
            <p className="text-[10px] text-muted-foreground">gasto total</p>
          </div>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Wrench className="w-10 h-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum serviço encontrado para este cliente</p>
            </div>
          ) : (
            appointments.map(apt => {
              const statusCfg = statusConfig[apt.status] || statusConfig.agendado;
              return (
                <div key={apt.id} className="bg-card border border-border rounded-xl p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className={`text-[10px] ${statusCfg.color}`}>
                          {statusCfg.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {apt.date ? format(new Date(apt.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : ''}
                          {apt.time ? ` às ${apt.time}` : ''}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{apt.service_names || 'Serviço'}</p>
                      {apt.vehicle_info && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Car className="w-3 h-3" /> {apt.vehicle_info}
                        </p>
                      )}
                    </div>
                    {apt.total_price > 0 && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-foreground">
                          R$ {(apt.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        {apt.payment_status && (
                          <p className={`text-[10px] ${apt.payment_status === 'pago' ? 'text-green-600' : 'text-amber-600'}`}>
                            {apt.payment_status === 'pago' ? 'Pago' : apt.payment_status === 'parcial' ? 'Parcial' : 'Pendente'}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}