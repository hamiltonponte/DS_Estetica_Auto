import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { useOutletContext } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { 
  Users, Calendar, DollarSign, TrendingUp, Car,
  Clock, CheckCircle2, AlertCircle, ArrowRight, Menu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/brand/BrandLogo';
import { Badge } from '@/components/ui/badge';
import StatCard from '@/components/shared/StatCard';
import ProductStockWidget from '@/components/dashboard/ProductStockWidget';
import TopClientsWidget from '@/components/dashboard/TopClientsWidget';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusConfig = {
  agendado: { label: 'Agendado', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  em_andamento: { label: 'Em Andamento', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  concluido: { label: 'Concluído', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  cancelado: { label: 'Cancelado', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export default function Dashboard() {
  const context = useOutletContext();
  const today = format(new Date(), 'yyyy-MM-dd');

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list(),
  });

  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list('-date', 100),
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => api.entities.Vehicle.list(),
  });

  const todayAppointments = appointments.filter(a => a.date === today);
  const monthRevenue = appointments
    .filter(a => a.status === 'concluido' && a.payment_status === 'pago' && a.date?.startsWith(format(new Date(), 'yyyy-MM')))
    .reduce((sum, a) => sum + (a.total_price || 0), 0);
  const pendingPayments = appointments
    .filter(a => a.status === 'concluido' && a.payment_status === 'pendente')
    .reduce((sum, a) => sum + (a.total_price || 0), 0);

  const upcomingAppointments = appointments
    .filter(a => a.date >= today && a.status !== 'cancelado')
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''))
    .slice(0, 5);

  const recentCompleted = appointments
    .filter(a => a.status === 'concluido')
    .slice(0, 5);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="brand-hero text-foreground">
        <div className="px-4 md:px-6 py-6 md:py-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden hover:bg-accent/10"
                onClick={() => context?.setMobileOpen?.(true)}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <BrandLogo size="lg" className="hidden sm:block" />
              <div>
                <p className="text-sm font-semibold text-accent font-brand uppercase tracking-wider mb-1">
                  DS Estética Auto
                </p>
                <h1 className="text-2xl md:text-3xl font-brand font-bold capitalize">
                  {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h1>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">Hoje</span>
              </div>
              <p className="text-2xl font-bold">{todayAppointments.length}</p>
              <p className="text-xs text-muted-foreground">agendamentos</p>
            </div>
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">Clientes</span>
              </div>
              <p className="text-2xl font-bold">{clients.length}</p>
              <p className="text-xs text-muted-foreground">cadastrados</p>
            </div>
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-accent" />
                <span className="text-xs text-muted-foreground">Faturamento</span>
              </div>
              <p className="text-2xl font-bold">R$ {monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">este mês</p>
            </div>
            <div className="bg-card/60 backdrop-blur-sm rounded-2xl p-4 border border-accent/20">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-muted-foreground">Pendente</span>
              </div>
              <p className="text-2xl font-bold">R$ {pendingPayments.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
              <p className="text-xs text-muted-foreground">a receber</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 md:px-6 py-6 space-y-6">
        {/* Upcoming */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Próximos Agendamentos</h3>
            <Link to="/agendamentos" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
              Ver todos <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {upcomingAppointments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum agendamento próximo
            </div>
          ) : (
            <div className="divide-y divide-border">
              {upcomingAppointments.map((apt) => (
                <div key={apt.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                        <Clock className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{apt.client_name}</p>
                        <p className="text-xs text-muted-foreground">{apt.vehicle_info || 'Veículo não informado'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{apt.time}</p>
                      <p className="text-xs text-muted-foreground">
                        {apt.date === today ? 'Hoje' : format(new Date(apt.date + 'T12:00:00'), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  {apt.service_names && (
                    <p className="text-xs text-muted-foreground mt-2 ml-[52px]">{apt.service_names}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Products + Top Clients */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ProductStockWidget />
          <TopClientsWidget />
        </div>

        {/* Recent Completed */}
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Serviços Recentes</h3>
            <Link to="/financeiro" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
              Ver financeiro <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentCompleted.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Nenhum serviço concluído ainda
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentCompleted.map((apt) => (
                <div key={apt.id} className="p-4 hover:bg-muted/50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{apt.client_name}</p>
                      <p className="text-xs text-muted-foreground">{apt.service_names || 'Serviço'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      R$ {(apt.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="outline" className={statusConfig[apt.payment_status === 'pago' ? 'concluido' : 'agendado']?.color + ' text-[10px]'}>
                      {apt.payment_status === 'pago' ? 'Pago' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}