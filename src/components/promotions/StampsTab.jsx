import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Gift, Star, Users, Plus, Minus, Check, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export default function StampsTab() {
  const [editingConfig, setEditingConfig] = useState(false);
  const [configForm, setConfigForm] = useState(null);
  const queryClient = useQueryClient();

  const { data: configs = [] } = useQuery({
    queryKey: ['loyalty-config'],
    queryFn: () => api.entities.LoyaltyConfig.list(),
  });

  const { data: loyalties = [] } = useQuery({
    queryKey: ['client-loyalty'],
    queryFn: () => api.entities.ClientLoyalty.list('-stamps', 50),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => api.entities.Client.list(),
  });

  const config = configs[0] || { services_required: 10, reward_description: 'Serviço grátis', campaign_name: 'Programa de Selos', active: true };

  const saveConfig = useMutation({
    mutationFn: (data) => config.id
      ? api.entities.LoyaltyConfig.update(config.id, data)
      : api.entities.LoyaltyConfig.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loyalty-config'] }); setEditingConfig(false); },
  });

  const updateLoyalty = useMutation({
    mutationFn: ({ id, data }) => api.entities.ClientLoyalty.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-loyalty'] }),
  });

  const createLoyalty = useMutation({
    mutationFn: (data) => api.entities.ClientLoyalty.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-loyalty'] }),
  });

  const handleAddStamp = (loyalty) => {
    const newStamps = (loyalty.stamps || 0) + 1;
    const required = config.services_required || 10;
    if (newStamps >= required) {
      updateLoyalty.mutate({ id: loyalty.id, data: { stamps: 0, total_redeemed: (loyalty.total_redeemed || 0) + 1 } });
    } else {
      updateLoyalty.mutate({ id: loyalty.id, data: { stamps: newStamps } });
    }
  };

  const handleRemoveStamp = (loyalty) => {
    if ((loyalty.stamps || 0) <= 0) return;
    updateLoyalty.mutate({ id: loyalty.id, data: { stamps: (loyalty.stamps || 0) - 1 } });
  };

  const handleAddClient = (client) => {
    const exists = loyalties.find(l => l.client_id === client.id);
    if (!exists) createLoyalty.mutate({ client_id: client.id, client_name: client.name, stamps: 0, total_redeemed: 0 });
  };

  const enrolledIds = new Set(loyalties.map(l => l.client_id));
  const unenrolledClients = clients.filter(c => !enrolledIds.has(c.id));

  return (
    <div className="space-y-6">
      {/* Config */}
      <div className="bg-card rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Configuração da Campanha</h3>
          {!editingConfig && (
            <Button variant="outline" size="sm" onClick={() => { setConfigForm({ ...config }); setEditingConfig(true); }}>
              <Edit2 className="w-3.5 h-3.5 mr-1" /> Editar
            </Button>
          )}
        </div>
        {editingConfig && configForm ? (
          <form onSubmit={(e) => { e.preventDefault(); saveConfig.mutate({ ...configForm, services_required: Number(configForm.services_required) }); }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Nome da Campanha</Label>
                <Input value={configForm.campaign_name || ''} onChange={e => setConfigForm({ ...configForm, campaign_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Selos para ganhar recompensa</Label>
                <Input type="number" min="1" value={configForm.services_required} onChange={e => setConfigForm({ ...configForm, services_required: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição da Recompensa</Label>
              <Textarea value={configForm.reward_description || ''} onChange={e => setConfigForm({ ...configForm, reward_description: e.target.value })} rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={configForm.active ?? true} onCheckedChange={v => setConfigForm({ ...configForm, active: v })} />
              <Label>Campanha ativa</Label>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setEditingConfig(false)}>Cancelar</Button>
              <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={saveConfig.isPending}>
                <Save className="w-4 h-4 mr-1" /> Salvar
              </Button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <Star className="w-5 h-5 text-accent mx-auto mb-1" />
              <p className="text-2xl font-bold">{config.services_required}</p>
              <p className="text-xs text-muted-foreground">selos p/ recompensa</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <Gift className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-sm font-semibold mt-1">{config.reward_description || '—'}</p>
              <p className="text-xs text-muted-foreground">recompensa</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3 text-center">
              <Badge variant="outline" className={config.active ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}>
                {config.active ? 'Ativa' : 'Inativa'}
              </Badge>
              <p className="text-xs text-muted-foreground mt-2">status</p>
            </div>
          </div>
        )}
      </div>

      {/* Enrolled */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold flex items-center gap-2">
            <Users className="w-4 h-4 text-accent" /> Clientes com Selos ({loyalties.length})
          </h3>
        </div>
        {loyalties.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Inscreva clientes abaixo para começar.</div>
        ) : (
          <div className="divide-y divide-border">
            {loyalties.map(loyalty => {
              const required = config.services_required || 10;
              const stamps = loyalty.stamps || 0;
              return (
                <div key={loyalty.id} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-semibold text-sm">{loyalty.client_name}</p>
                      <p className="text-xs text-muted-foreground">{loyalty.total_redeemed || 0} recompensa(s) resgatada(s)</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleRemoveStamp(loyalty)} disabled={stamps <= 0}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="text-sm font-bold w-14 text-center">{stamps}/{required}</span>
                      <Button size="icon" className="h-7 w-7 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => handleAddStamp(loyalty)}>
                        {stamps >= required - 1 ? <Gift className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {Array.from({ length: required }).map((_, i) => (
                      <div key={i} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${i < stamps ? 'bg-accent border-accent text-accent-foreground' : 'border-border'}`}>
                        {i < stamps ? <Star className="w-3 h-3" /> : ''}
                      </div>
                    ))}
                  </div>
                  {stamps >= required && (
                    <div className="mt-2 flex items-center gap-2 text-green-600 text-xs font-semibold">
                      <Check className="w-4 h-4" /> Recompensa disponível: {config.reward_description}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add clients */}
      {unenrolledClients.length > 0 && (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <p className="font-semibold text-sm text-muted-foreground">Inscrever clientes na campanha</p>
          </div>
          <div className="divide-y divide-border">
            {unenrolledClients.map(client => (
              <div key={client.id} className="p-3 flex items-center justify-between">
                <span className="text-sm">{client.name}</span>
                <Button size="sm" variant="outline" onClick={() => handleAddClient(client)}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Inscrever
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}