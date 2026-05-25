import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Wrench, Search, MoreVertical, Pencil, Trash2, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import ServiceFormDialog from '@/components/services/ServiceFormDialog';

const categoryLabels = {
  polimento: 'Polimento', lavagem: 'Lavagem', higienizacao: 'Higienização',
  protecao: 'Proteção', vitrificacao: 'Vitrificação', outros: 'Outros',
};

const categoryColors = {
  polimento: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  lavagem: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
  higienizacao: 'bg-green-500/10 text-green-600 border-green-500/20',
  protecao: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  vitrificacao: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  outros: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

export default function Services() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ['services'],
    queryFn: () => api.entities.Service.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Service.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); setFormOpen(false); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Service.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); setFormOpen(false); setEditingService(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Service.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['services'] }); setDeleteTarget(null); },
  });

  const filtered = services.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (form) => {
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Serviços"
        subtitle={`${services.length} serviço${services.length !== 1 ? 's' : ''} cadastrado${services.length !== 1 ? 's' : ''}`}
        actionLabel="Novo Serviço"
        onAction={() => { setEditingService(null); setFormOpen(true); }}
      />

      <div className="px-4 md:px-6 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar serviço..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Wrench}
            title={search ? 'Nenhum serviço encontrado' : 'Nenhum serviço cadastrado'}
            description={search ? 'Tente buscar por outro termo' : 'Cadastre seus serviços e preços'}
            actionLabel={!search ? 'Cadastrar Serviço' : undefined}
            onAction={!search ? () => { setEditingService(null); setFormOpen(true); } : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(s => (
              <div key={s.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all group">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="outline" className={categoryColors[s.category] + ' text-[10px]'}>
                    {categoryLabels[s.category] || s.category}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditingService(s); setFormOpen(true); }}>
                        <Pencil className="w-4 h-4 mr-2" /> Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(s)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{s.name}</h3>
                {s.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{s.description}</p>}
                <div className="flex items-center justify-between mt-auto pt-3 border-t border-border">
                  <span className="text-lg font-bold text-accent">
                    R$ {(s.price || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  {s.duration_minutes && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {s.duration_minutes} min
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ServiceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        service={editingService}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir "{deleteTarget?.name}"?
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