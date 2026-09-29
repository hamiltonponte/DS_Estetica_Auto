import React, { useState } from 'react';
import { Package, Wrench, ImageIcon, Minus, Plus } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/whatsapp';
import MediaImage from '@/components/vehicles/MediaImage';

function ItemThumb({ src, alt }) {
  return (
    <div className="w-12 h-12 rounded-lg border border-border overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center">
      {src ? (
        <MediaImage
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
          fallbackClassName="w-full h-full bg-muted"
        />
      ) : (
        <ImageIcon className="w-4 h-4 text-muted-foreground/40" />
      )}
    </div>
  );
}

function QuantityStepper({ value, onChange, className }) {
  const qty = Math.max(1, Number(value) || 1);

  const bump = (delta, e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const next = Math.min(9999, Math.max(1, qty + delta));
    onChange(next);
  };

  const onInput = (e) => {
    e.stopPropagation();
    const raw = e.target.value.replace(/\D/g, '');
    if (raw === '') {
      onChange(1);
      return;
    }
    onChange(Math.min(9999, Math.max(1, Number(raw))));
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg border border-border bg-background p-0.5',
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        aria-label="Diminuir quantidade"
        className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted disabled:opacity-40"
        disabled={qty <= 1}
        onClick={(e) => bump(-1, e)}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Quantidade"
        value={qty}
        onChange={onInput}
        onClick={(e) => e.stopPropagation()}
        className="w-10 h-8 text-center text-sm font-semibold bg-transparent outline-none"
      />
      <button
        type="button"
        aria-label="Aumentar quantidade"
        className="w-8 h-8 rounded-md flex items-center justify-center hover:bg-muted"
        onClick={(e) => bump(1, e)}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Define quantidade; 0 remove o item do mapa. */
export function setItemQuantity(map, id, qty) {
  const next = { ...map };
  const n = Math.floor(Number(qty) || 0);
  if (n <= 0) {
    delete next[id];
  } else {
    next[id] = Math.min(9999, n);
  }
  return next;
}

/** Alterna seleção: se já tem, remove; senão define 1. */
export function toggleItemQuantity(map, id) {
  if ((map[id] || 0) > 0) {
    const next = { ...map };
    delete next[id];
    return next;
  }
  return { ...map, [id]: 1 };
}

export function quantityMapCount(map = {}) {
  return Object.values(map).filter((q) => Number(q) > 0).length;
}

/**
 * Seleção múltipla de serviços e produtos com quantidade.
 * Não altera cadastros — só a seleção temporária do orçamento/serviço.
 */
export default function ServiceProductPicker({
  services = [],
  products = [],
  serviceQuantities = {},
  productQuantities = {},
  onServiceQuantityChange,
  onProductQuantityChange,
  isLoading = false,
  emptyServicesText = 'Nenhum serviço cadastrado. Cadastre em Serviços no menu.',
  emptyProductsText = 'Nenhum produto cadastrado. Cadastre em Produtos no menu.',
}) {
  const [tab, setTab] = useState('services');

  const selectedServiceCount = quantityMapCount(serviceQuantities);
  const selectedProductCount = quantityMapCount(productQuantities);

  if (isLoading) {
    return (
      <div className="py-10 flex justify-center">
        <div className="w-8 h-8 border-4 border-accent/20 border-t-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-3">
        <TabsTrigger value="services" className="gap-1.5">
          <Wrench className="w-3.5 h-3.5" />
          Serviços
          {selectedServiceCount > 0 && (
            <span className="ml-1 text-[10px] font-bold bg-accent/20 text-accent rounded-full px-1.5">
              {selectedServiceCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="products" className="gap-1.5">
          <Package className="w-3.5 h-3.5" />
          Produtos
          {selectedProductCount > 0 && (
            <span className="ml-1 text-[10px] font-bold bg-accent/20 text-accent rounded-full px-1.5">
              {selectedProductCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="services" className="mt-0 space-y-2">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{emptyServicesText}</p>
        ) : (
          services.map((service) => {
            const qty = Number(serviceQuantities[service.id]) || 0;
            const active = qty > 0;
            const unitPrice = Number(service.price) || 0;
            const lineTotal = unitPrice * (qty || 1);

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => {
                  if (active) onServiceQuantityChange?.(service.id, 0);
                  else onServiceQuantityChange?.(service.id, 1);
                }}
                className={cn(
                  'w-full text-left rounded-xl border p-3 transition-all',
                  active
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                    : 'border-border hover:border-accent/40',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemThumb src={service.image_url} alt={service.name} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        R$ {formatMoney(unitPrice)}
                        {active && qty > 1 ? ` × ${qty}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-sm font-bold text-accent">
                      R$ {formatMoney(active ? lineTotal : unitPrice)}
                    </p>
                    {active && (
                      <QuantityStepper
                        value={qty}
                        onChange={(next) => onServiceQuantityChange?.(service.id, next)}
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </TabsContent>

      <TabsContent value="products" className="mt-0 space-y-2">
        {products.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{emptyProductsText}</p>
        ) : (
          products.map((product) => {
            const qty = Number(productQuantities[product.id]) || 0;
            const active = qty > 0;
            const unitPrice = Number(product.sale_price ?? product.cost_price ?? 0) || 0;
            const lineTotal = unitPrice * (qty || 1);

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => {
                  if (active) onProductQuantityChange?.(product.id, 0);
                  else onProductQuantityChange?.(product.id, 1);
                }}
                className={cn(
                  'w-full text-left rounded-xl border p-3 transition-all',
                  active
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                    : 'border-border hover:border-accent/40',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemThumb src={product.image_url} alt={product.name} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">
                        {product.name}
                        {product.unit ? (
                          <span className="text-muted-foreground font-normal"> · {product.unit}</span>
                        ) : null}
                      </p>
                      {product.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        R$ {formatMoney(unitPrice)}
                        {product.unit ? ` / ${product.unit}` : ''}
                        {active && qty > 1 ? ` × ${qty}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <p className="text-sm font-bold text-accent">
                      R$ {formatMoney(active ? lineTotal : unitPrice)}
                    </p>
                    {active && (
                      <QuantityStepper
                        value={qty}
                        onChange={(next) => onProductQuantityChange?.(product.id, next)}
                      />
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </TabsContent>
    </Tabs>
  );
}

export function buildSelectionSummary({
  services = [],
  products = [],
  serviceQuantities = {},
  productQuantities = {},
  // Compatibilidade com chamadas antigas (qty = 1)
  selectedServiceIds = [],
  selectedProductIds = [],
}) {
  const svcQty = { ...serviceQuantities };
  const prodQty = { ...productQuantities };

  selectedServiceIds.forEach((id) => {
    if (!svcQty[id]) svcQty[id] = 1;
  });
  selectedProductIds.forEach((id) => {
    if (!prodQty[id]) prodQty[id] = 1;
  });

  const selectedServices = services.filter((s) => (svcQty[s.id] || 0) > 0);
  const selectedProducts = products.filter((p) => (prodQty[p.id] || 0) > 0);

  const items = [
    ...selectedServices.map((s) => {
      const quantity = Math.max(1, Number(svcQty[s.id]) || 1);
      const unit_price = Number(s.price) || 0;
      return {
        type: 'service',
        ref_id: s.id,
        name: s.name,
        unit: '',
        quantity,
        unit_price,
        total: unit_price * quantity,
      };
    }),
    ...selectedProducts.map((p) => {
      const quantity = Math.max(1, Number(prodQty[p.id]) || 1);
      const unit_price = Number(p.sale_price ?? p.cost_price ?? 0) || 0;
      return {
        type: 'product',
        ref_id: p.id,
        name: p.name,
        unit: p.unit || '',
        quantity,
        unit_price,
        total: unit_price * quantity,
      };
    }),
  ];

  const total = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const names = items
    .map((i) => (i.quantity > 1 ? `${i.quantity}x ${i.name}` : i.name))
    .join(', ');

  const selectedServiceIdsOut = selectedServices.map((s) => s.id);
  const selectedProductIdsOut = selectedProducts.map((p) => p.id);

  return {
    selectedServices,
    selectedProducts,
    selectedServiceIds: selectedServiceIdsOut,
    selectedProductIds: selectedProductIdsOut,
    items,
    total,
    names,
  };
}
