import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Crown, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function TopClientsWidget() {
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments'],
    queryFn: () => api.entities.Appointment.list('-date', 500),
  });

  const { data: loyalties = [] } = useQuery({
    queryKey: ['client-loyalty'],
    queryFn: () => api.entities.ClientLoyalty.list(),
  });

  // Aggregate per client
  const clientStats = {};
  appointments.filter(a => a.status === 'concluido').forEach(a => {
    if (!a.client_name) return;
    const key = a.client_id || a.client_name;
    if (!clientStats[key]) clientStats[key] = { name: a.client_name, client_id: a.client_id, total: 0, count: 0 };
    clientStats[key].total += a.total_price || 0;
    clientStats[key].count += 1;
  });

  const topClients = Object.values(clientStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Crown className="w-4 h-4 text-accent" /> Melhores Clientes
        </h3>
        <Link to="/selos" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
          Selos <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {topClients.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Nenhum serviço concluído ainda</div>
      ) : (
        <div className="divide-y divide-border">
          {topClients.map((client, i) => {
            const loyalty = loyalties.find(l => l.client_id === client.client_id);
            const stamps = loyalty?.stamps || 0;
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div key={client.client_id || client.name} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{medals[i] || `${i + 1}°`}</span>
                  <div>
                    <p className="text-sm font-semibold">{client.name}</p>
                    <p className="text-xs text-muted-foreground">{client.count} serviço(s) • {stamps} selos</p>
                  </div>
                </div>
                <span className="text-sm font-bold text-accent">
                  R$ {client.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}