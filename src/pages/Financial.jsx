import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const paymentMethodLabels = {
  dinheiro: 'Dinheiro', pix: 'PIX', cartao_credito: 'Crédito', cartao_debito: 'Débito',
};

export default function Financial() {
  const [period, setPeriod] = useState('mes');

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list('-date', 500),
  });

  const now = new Date();
  const getFilteredByPeriod = () => {
    const completed = appointments.filter(a => a.status === 'concluido');
    if (period === 'mes') {
      const start = format(startOfMonth(now), 'yyyy-MM-dd');
      const end = format(endOfMonth(now), 'yyyy-MM-dd');
      return completed.filter(a => a.date >= start && a.date <= end);
    }
    if (period === 'semana') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      return completed.filter(a => a.date >= format(d, 'yyyy-MM-dd'));
    }
    return completed;
  };

  const periodAppointments = getFilteredByPeriod();
  const totalRevenue = periodAppointments.filter(a => a.payment_status === 'pago').reduce((s, a) => s + (a.total_price || 0), 0);
  const pendingRevenue = periodAppointments.filter(a => a.payment_status === 'pendente').reduce((s, a) => s + (a.total_price || 0), 0);
  const totalServices = periodAppointments.length;

  const chartData = Array.from({ length: 6 }, (_, i) => {
    const d = subMonths(now, 5 - i);
    const monthStr = format(d, 'yyyy-MM');
    const monthAppts = appointments.filter(a => a.status === 'concluido' && a.payment_status === 'pago' && a.date?.startsWith(monthStr));
    return {
      month: format(d, 'MMM', { locale: ptBR }),
      receita: monthAppts.reduce((s, a) => s + (a.total_price || 0), 0),
    };
  });

  const paidAppointments = periodAppointments
    .filter(a => a.payment_status === 'pago')
    .sort((a, b) => b.date?.localeCompare(a.date));

  const pendingAppointments = periodAppointments
    .filter(a => a.payment_status === 'pendente')
    .sort((a, b) => b.date?.localeCompare(a.date));

  return (
    <div className="min-h-screen">
      <PageHeader title="Financeiro" subtitle="Controle de receitas e pagamentos" />

      <div className="px-4 md:px-6 py-4 space-y-6">
        <Tabs value={period} onValueChange={setPeriod}>
          <TabsList className="bg-muted">
            <TabsTrigger value="semana">Última Semana</TabsTrigger>
            <TabsTrigger value="mes">Este Mês</TabsTrigger>
            <TabsTrigger value="todos">Todos</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard title="Receita Recebida" value={`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={TrendingUp} />
          <StatCard title="A Receber" value={`R$ ${pendingRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} icon={AlertCircle} />
          <StatCard title="Serviços Concluídos" value={totalServices} icon={CheckCircle2} />
        </div>

        <div className="bg-card rounded-2xl border border-border p-5">
          <h3 className="font-semibold mb-4">Receita Mensal</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  formatter={(value) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Receita']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                />
                <Bar dataKey="receita" fill="hsl(38, 92%, 50%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {pendingAppointments.length > 0 && (
          <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Pagamentos Pendentes ({pendingAppointments.length})
              </h3>
            </div>
            <div className="divide-y divide-border">
              {pendingAppointments.map(apt => (
                <div key={apt.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{apt.client_name}</p>
                    <p className="text-xs text-muted-foreground">{apt.service_names} • {apt.date ? format(new Date(apt.date + 'T12:00:00'), 'dd/MM/yyyy') : ''}</p>
                  </div>
                  <span className="font-bold text-sm text-amber-600">
                    R$ {(apt.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              Pagamentos Recebidos ({paidAppointments.length})
            </h3>
          </div>
          {paidAppointments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Nenhum pagamento recebido no período</div>
          ) : (
            <div className="divide-y divide-border">
              {paidAppointments.map(apt => (
                <div key={apt.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div>
                    <p className="font-medium text-sm">{apt.client_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-muted-foreground">{apt.service_names}</p>
                      {apt.payment_method && (
                        <Badge variant="outline" className="text-[10px]">
                          {paymentMethodLabels[apt.payment_method] || apt.payment_method}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-green-600">
                      R$ {(apt.total_price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                    <p className="text-[10px] text-muted-foreground">
                      {apt.date ? format(new Date(apt.date + 'T12:00:00'), 'dd/MM/yyyy') : ''}
                    </p>
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