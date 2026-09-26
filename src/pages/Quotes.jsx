import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { FileText, MessageCircle, Trash2, Search } from 'lucide-react';
import { api } from '@/api/apiClient';
import PageHeader from '@/components/shared/PageHeader';
import EmptyState from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { openWhatsApp, formatMoney } from '@/lib/whatsapp';

export default function Quotes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ['quotes'],
    queryFn: () => api.entities.Quote.list('-created_date', 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.entities.Quote.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast({ title: 'Orçamento excluído' });
    },
  });

  const filtered = quotes.filter((q) => {
    const term = search.toLowerCase();
    if (!term) return true;
    return (
      q.client_name?.toLowerCase().includes(term)
      || q.message?.toLowerCase().includes(term)
      || String(q.total || '').includes(term)
    );
  });

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Orçamentos"
        subtitle={`${quotes.length} orçamento${quotes.length !== 1 ? 's' : ''} neste aparelho`}
        actionLabel="Novo orçamento"
        onAction={() => navigate('/orcamento')}
      />

      <div className="px-4 md:px-6 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={search ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento salvo'}
            description="Selecione serviços e produtos e envie pelo WhatsApp — o orçamento fica salvo neste aparelho"
            actionLabel={!search ? 'Criar orçamento' : undefined}
            onAction={!search ? () => navigate('/orcamento') : undefined}
          />
        ) : (
          <div className="grid gap-3">
            {filtered.map((quote) => (
              <div key={quote.id} className="bg-card rounded-2xl border border-border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{quote.client_name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {quote.date
                        ? format(parseISO(quote.date), 'dd/MM/yyyy')
                        : quote.created_date
                          ? format(new Date(quote.created_date), 'dd/MM/yyyy')
                          : '—'}
                      {' · '}
                      {(quote.items || []).length} item(ns)
                    </p>
                    <p className="text-sm font-bold text-accent mt-2">
                      R$ {formatMoney(quote.total)}
                    </p>
                    {(quote.items || []).slice(0, 3).map((item, i) => (
                      <p key={i} className="text-xs text-muted-foreground truncate">
                        • {item.quantity > 1 ? `${item.quantity}x ` : ''}{item.name}
                      </p>
                    ))}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="bg-green-500 hover:bg-green-600 text-white"
                      onClick={() => openWhatsApp({
                        phone: quote.client_whatsapp || quote.client_phone,
                        message: quote.message,
                      })}
                    >
                      <MessageCircle className="w-4 h-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(quote.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
