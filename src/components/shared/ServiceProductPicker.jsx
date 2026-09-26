import React, { useState } from 'react';
import { Package, Wrench, ImageIcon } from 'lucide-react';
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

/**
 * Seleção múltipla de serviços e produtos (mesmo padrão visual do Iniciar serviço).
 */
export default function ServiceProductPicker({
  services = [],
  products = [],
  selectedServiceIds = [],
  selectedProductIds = [],
  onToggleService,
  onToggleProduct,
  isLoading = false,
  emptyServicesText = 'Nenhum serviço cadastrado. Cadastre em Serviços no menu.',
  emptyProductsText = 'Nenhum produto cadastrado. Cadastre em Produtos no menu.',
}) {
  const [tab, setTab] = useState('services');

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
          {selectedServiceIds.length > 0 && (
            <span className="ml-1 text-[10px] font-bold bg-accent/20 text-accent rounded-full px-1.5">
              {selectedServiceIds.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="products" className="gap-1.5">
          <Package className="w-3.5 h-3.5" />
          Produtos
          {selectedProductIds.length > 0 && (
            <span className="ml-1 text-[10px] font-bold bg-accent/20 text-accent rounded-full px-1.5">
              {selectedProductIds.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="services" className="mt-0 space-y-2">
        {services.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{emptyServicesText}</p>
        ) : (
          services.map((service) => {
            const active = selectedServiceIds.includes(service.id);
            return (
              <button
                key={service.id}
                type="button"
                onClick={() => onToggleService(service.id)}
                className={cn(
                  'w-full text-left rounded-xl border p-3 transition-all',
                  active
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                    : 'border-border hover:border-accent/40',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <ItemThumb src={service.image_url} alt={service.name} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{service.name}</p>
                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {service.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-accent shrink-0">
                    R$ {formatMoney(service.price)}
                  </p>
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
            const active = selectedProductIds.includes(product.id);
            const price = product.sale_price ?? product.cost_price ?? 0;
            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onToggleProduct(product.id)}
                className={cn(
                  'w-full text-left rounded-xl border p-3 transition-all',
                  active
                    ? 'border-accent bg-accent/10 ring-1 ring-accent/30'
                    : 'border-border hover:border-accent/40',
                )}
              >
                <div className="flex items-center justify-between gap-3">
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
                    </div>
                  </div>
                  <p className="text-sm font-bold text-accent shrink-0">
                    R$ {formatMoney(price)}
                  </p>
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
  selectedServiceIds = [],
  selectedProductIds = [],
}) {
  const selectedServices = services.filter((s) => selectedServiceIds.includes(s.id));
  const selectedProducts = products.filter((p) => selectedProductIds.includes(p.id));

  const items = [
    ...selectedServices.map((s) => ({
      type: 'service',
      ref_id: s.id,
      name: s.name,
      unit: '',
      quantity: 1,
      unit_price: Number(s.price) || 0,
      total: Number(s.price) || 0,
    })),
    ...selectedProducts.map((p) => {
      const unitPrice = Number(p.sale_price ?? p.cost_price ?? 0) || 0;
      return {
        type: 'product',
        ref_id: p.id,
        name: p.name,
        unit: p.unit || '',
        quantity: 1,
        unit_price: unitPrice,
        total: unitPrice,
      };
    }),
  ];

  const total = items.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
  const names = items.map((i) => i.name).join(', ');

  return { selectedServices, selectedProducts, items, total, names };
}
