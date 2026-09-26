import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Package, Search, MoreVertical, Pencil, Trash2, AlertTriangle, ImageIcon } from 'lucide-react';
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
import ProductFormDialog from '@/components/products/ProductFormDialog';
import MediaImage from '@/components/vehicles/MediaImage';

const categoryLabels = {
  abrasivo: 'Abrasivo',
  quimico: 'Químico',
  protecao: 'Proteção',
  microfibra: 'Microfibra',
  acessorio: 'Acessório',
  outros: 'Outros',
};
const categoryColors = {
  abrasivo: 'bg-red-500/10 text-red-600 border-red-500/20',
  quimico: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  protecao: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  microfibra: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  acessorio: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  outros: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
};

function categoryLabel(value) {
  if (!value) return 'Outros';
  return categoryLabels[value] || value.replace(/_/g, ' ');
}

export default function Products() {
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => api.entities.Product.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setFormOpen(false); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => api.entities.Product.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setFormOpen(false); setEditingProduct(null); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Product.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['products'] }); setDeleteTarget(null); },
  });

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (form) => {
    if (editingProduct) updateMutation.mutate({ id: editingProduct.id, data: form });
    else createMutation.mutate(form);
  };

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Produtos"
        subtitle={`${products.length} produto${products.length !== 1 ? 's' : ''} cadastrado${products.length !== 1 ? 's' : ''}`}
        actionLabel="Novo Produto"
        onAction={() => { setEditingProduct(null); setFormOpen(true); }}
      />

      <div className="px-4 md:px-6 py-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title={search ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado'}
            description="Cadastre os produtos usados nos serviços para controle de estoque"
            actionLabel={!search ? 'Cadastrar Produto' : undefined}
            onAction={!search ? () => { setEditingProduct(null); setFormOpen(true); } : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(p => (
              <div key={p.id} className="bg-card rounded-2xl border border-border p-5 hover:shadow-md transition-all group">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-14 h-14 rounded-xl border border-border overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center">
                    {p.image_url ? (
                      <MediaImage
                        src={p.image_url}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        fallbackClassName="w-full h-full bg-muted"
                      />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-2">
                    <Badge variant="outline" className={(categoryColors[p.category] || categoryColors.outros) + ' text-[10px]'}>
                      {categoryLabel(p.category)}
                    </Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 shrink-0">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditingProduct(p); setFormOpen(true); }}>
                          <Pencil className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(p)}>
                          <Trash2 className="w-4 h-4 mr-2" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{p.name}</h3>
                {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}
                <div className="flex items-center justify-between pt-3 border-t border-border gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {(p.stock_quantity <= 0 || p.stock_quantity == null) ? (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : null}
                    <span className={`text-sm font-bold ${p.stock_quantity <= 0 ? 'text-amber-500' : 'text-foreground'}`}>
                      {p.stock_quantity ?? 0} {p.unit}
                    </span>
                  </div>
                  <div className="text-right text-xs space-y-0.5">
                    {p.sale_price > 0 && (
                      <p className="font-semibold text-accent">
                        Venda R$ {Number(p.sale_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                    {p.cost_price > 0 && (
                      <p className="text-muted-foreground">
                        Custo R$ {Number(p.cost_price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ProductFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        product={editingProduct}
        onSave={handleSave}
        isSaving={createMutation.isPending || updateMutation.isPending}
        existingCategories={products.map((p) => p.category).filter(Boolean)}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir "{deleteTarget?.name}"?</AlertDialogDescription>
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