import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Calendar, Search, Clock, MoreVertical, Pencil, Trash2, Play, CheckCircle2, XCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import AppointmentFormDialog from '@/components/appointments/AppointmentFormDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  agendado: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20', icon: Clock },
  em_andamento: { label: 'Em Andamento', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20', icon: Play },
  concluido: { label: 'Concluído', color: 'bg-green-500/10 text-green-600 border-green-500/20', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/20', icon: XCircle },
};

export default function Appointments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [formOpen, setFormOpen] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list('-date', 200),
  });

  const { data: clients = [] } = useQuery({ queryKey: ['clients'], queryFn: () => api.entities.Client.list() });
  const { data: vehicles = [] } = useQuery({ queryKey: ['vehicles'], queryFn: () => api.entities.Vehicle.list() });
  const { data: services = [] } = useQuery({ queryKey: ['services'], queryFn: () => api.entities.Service.list() });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Appointment.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Appointment.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); setFormOpen(false); setEditingAppointment(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Appointment.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['appointments'] }); setDeleteTarget(null); },
  });

  const filtered = appointments
    .filter(a => statusFilter === 'todos' || a.status === statusFilter)
    .filter(a =>
      a.client_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.vehicle_info?.toLowerCase().includes(search.toLowerCase()) ||
      a.service_names?.toLowerCase().includes(search.toLowerCase())
    );

  const handleSave = (form) => {
    if (editingAppointment) {
      updateMutation.mutate({ id: editingAppointment.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const quickUpdateStatus = (apt, newStatus) => {
    updateMutation.mutate({ id: apt.id, data: { ...apt, status: newStatus } });
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Agendamentos"
        subtitle={`${appointments.length} agendamento${appointments.length !== 1 ? 's' : ''}`}
        actionLabel="Novo Agendamento"
        onAction={() => { setEditingAppointment(null); setFormOpen(true); }}
      />

      <div className="px-4 md:px-6 py-4">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
          </div>
          <Tabs value={statusFilter} onValueChange={setStatusFilter}>
            <TabsList className="bg-muted h-10">
              <TabsTrigger value="todos" className="text-xs">Todos</TabsTrigger>
              <TabsTrigger value="agendado" className="text-xs">Agendados</TabsTrigger>
              <TabsTrigger value="em_andamento" className="text-xs">Em Andamento</TabsTrigger>
              <TabsTrigger value="concluido" className="text-xs">Concluídos</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title={search || statusFilter !== 'todos' ? 'Nenhum agendamento encontrado' : 'Nenhum agendamento'}
            description="Crie um novo agendamento para começar"
            actionLabel="Novo Agendamento"
            onAction={() => { setEditingAppointment(null); setFormOpen(true); }}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map(apt => {
              const sc = statusConfig[apt.status] || statusConfig.agendado;
              const StatusIcon = sc.icon;
              return (
                <div key={apt.id} className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-all group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <StatusIcon className="w-5 h-5 text-accent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm">{apt.client_name}</p>
                          <Badge variant="outline" className={sc.color + ' text-[10px]'}>{sc.label}</Badge>
                          {apt.payment_status === 'pago' && (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px]">Pago</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{apt.vehicle_info || 'Veículo não informado'}</p>
                        {apt.service_names && (
                          <p className="text-xs text-muted-foreground mt-0.5">{apt.service_names}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-foreground font-medium">
                            {apt.date ? format(new Date(apt.date + 'T12:00:00'), "dd/MM/yyyy", { locale: ptBR }) : ''}
                          </span>
                          <span className="text-xs text-muted-foreground">{apt.time}</span>
                          {apt.total_price > 0 && (
                            <span className="text-xs font-bold text-accent">
                              R$ {apt.total_price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 flex-shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingAppointment(apt); setFormOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {apt.status === 'agendado' && (
                          <DropdownMenuItem onClick={() => quickUpdateStatus(apt, 'em_andamento')}>
                            <Play className="w-4 h-4 mr-2" /> Iniciar Serviço
                          </DropdownMenuItem>
                        )}
                        {apt.status === 'em_andamento' && (
                          <DropdownMenuItem onClick={() => quickUpdateStatus(apt, 'concluido')}>
                            <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir
                          </DropdownMenuItem>
                        )}
                        {apt.status !== 'cancelado' && apt.status !== 'concluido' && (
                          <DropdownMenuItem onClick={() => quickUpdateStatus(apt, 'cancelado')}>
                            <XCircle className="w-4 h-4 mr-2" /> Cancelar
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(apt)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AppointmentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        appointment={editingAppointment}
        clients={clients}
        vehicles={vehicles}
        services={services}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o agendamento de {deleteTarget?.client_name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteMutation.mutate(deleteTarget.id)} className="bg-destructive text-destructive-foreground">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}