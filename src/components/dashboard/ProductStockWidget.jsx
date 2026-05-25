import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Package, AlertTriangle, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function ProductStockWidget() {
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.entities.Product.list(),
  });

  const { data: executions = [] } = useQuery({
    queryKey: ['service-executions'],
    queryFn: () => api.entities.ServiceExecution.list('-created_date', 200),
  });

  // Calculate profit per product from executions
  const profitMap = {};
  executions.forEach(ex => {
    (ex.products_used || []).forEach(pu => {
      if (!profitMap[pu.product_id]) profitMap[pu.product_id] = 0;
      // profit is revenue attributed minus cost. We track cost used.
      profitMap[pu.product_id] += (pu.quantity || 0) * (pu.cost_price || 0);
    });
  });

  const sortedByProfit = [...products]
    .filter(p => p.cost_price > 0)
    .sort((a, b) => (profitMap[b.id] || 0) - (profitMap[a.id] || 0))
    .slice(0, 5);

  const lowStock = products.filter(p => (p.stock_quantity || 0) <= 5 && p.stock_quantity != null);

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-accent" /> Estoque de Produtos
        </h3>
        <Link to="/produtos" className="text-xs text-accent font-medium hover:underline flex items-center gap-1">
          Gerenciar <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Low stock alerts */}
      {lowStock.length > 0 && (
        <div className="px-4 py-3 bg-amber-500/5 border-b border-amber-500/10">
          <p className="text-xs text-amber-600 font-semibold flex items-center gap-1 mb-2">
            <AlertTriangle className="w-3.5 h-3.5" /> Estoque baixo
          </p>
          <div className="space-y-1">
            {lowStock.map(p => (
              <div key={p.id} className="flex justify-between text-xs">
                <span className="text-foreground">{p.name}</span>
                <span className="text-amber-600 font-bold">{p.stock_quantity} {p.unit}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All products stock */}
      <div className="divide-y divide-border max-h-48 overflow-y-auto">
        {products.slice(0, 8).map(p => {
          const pct = p.stock_quantity > 0 ? Math.min((p.stock_quantity / 100) * 100, 100) : 0;
          return (
            <div key={p.id} className="px-4 py-2.5 flex items-center justify-between">
              <span className="text-sm text-foreground truncate flex-1">{p.name}</span>
              <span className={`text-sm font-bold ml-2 ${(p.stock_quantity || 0) <= 5 ? 'text-amber-500' : 'text-foreground'}`}>
                {p.stock_quantity ?? 0} {p.unit}
              </span>
            </div>
          );
        })}
        {products.length === 0 && (
          <div className="p-6 text-center text-muted-foreground text-sm">Nenhum produto cadastrado</div>
        )}
      </div>

      {/* Most used / profitable */}
      {sortedByProfit.length > 0 && (
        <>
          <div className="p-4 border-t border-border">
            <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-accent" /> Mais utilizados (custo total)
            </p>
            <div className="space-y-1.5">
              {sortedByProfit.map((p, i) => (
                <div key={p.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-accent/10 text-accent font-bold flex items-center justify-center text-[10px]">{i + 1}</span>
                    <span className="text-foreground">{p.name}</span>
                  </div>
                  <span className="text-muted-foreground">R$ {(profitMap[p.id] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}