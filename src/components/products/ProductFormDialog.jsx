import React, { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import ImageUploadField from '@/components/shared/ImageUploadField';

const DEFAULT_CATEGORIES = [
  { value: 'abrasivo', label: 'Abrasivo' },
  { value: 'quimico', label: 'Químico' },
  { value: 'protecao', label: 'Proteção' },
  { value: 'microfibra', label: 'Microfibra' },
  { value: 'acessorio', label: 'Acessório' },
  { value: 'outros', label: 'Outros' },
];

const UNITS = ['ml', 'L', 'g', 'kg', 'un', 'm²', 'JG'];

const emptyForm = {
  name: '',
  description: '',
  unit: 'un',
  stock_quantity: '',
  cost_price: '',
  sale_price: '',
  category: 'outros',
  image_url: '',
};

export default function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSave,
  isSaving,
  existingCategories = [],
}) {
  const [form, setForm] = useState(emptyForm);
  const [customCategory, setCustomCategory] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);

  const categories = useMemo(() => {
    const map = new Map(DEFAULT_CATEGORIES.map((c) => [c.value, c]));
    existingCategories.forEach((raw) => {
      const value = String(raw || '').trim();
      if (!value) return;
      const key = value.toLowerCase().replace(/\s+/g, '_');
      if (!map.has(key) && !map.has(value)) {
        map.set(key, { value: key, label: value });
      }
    });
    if (form.category && !map.has(form.category)) {
      map.set(form.category, {
        value: form.category,
        label: form.category.replace(/_/g, ' '),
      });
    }
    return Array.from(map.values());
  }, [existingCategories, form.category]);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        unit: product.unit || 'un',
        stock_quantity: product.stock_quantity ?? '',
        cost_price: product.cost_price ?? '',
        sale_price: product.sale_price ?? '',
        category: product.category || 'outros',
        image_url: product.image_url || '',
      });
    } else {
      setForm(emptyForm);
    }
    setCustomCategory('');
    setAddingCategory(false);
  }, [product, open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...form,
      stock_quantity: form.stock_quantity !== '' ? Number(form.stock_quantity) : 0,
      cost_price: form.cost_price !== '' ? Number(form.cost_price) : 0,
      sale_price: form.sale_price !== '' ? Number(form.sale_price) : 0,
      image_url: form.image_url || '',
      active: true,
    });
  };

  const commitCustomCategory = () => {
    const label = customCategory.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s+/g, '_');
    setForm((prev) => ({ ...prev, category: value }));
    setAddingCategory(false);
    setCustomCategory('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? 'Editar Produto' : 'Novo Produto'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <ImageUploadField
            label="Imagem do produto"
            value={form.image_url}
            onChange={(url) => setForm((prev) => ({ ...prev, image_url: url }))}
            disabled={isSaving}
            hint="Opcional · aparece na lista e na seleção de produtos"
          />

          <div className="space-y-2">
            <Label>Nome do Produto *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Categoria</Label>
              {!addingCategory ? (
                <div className="flex gap-2">
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    title="Nova categoria"
                    onClick={() => setAddingCategory(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Nome da categoria"
                    autoFocus
                  />
                  <Button type="button" variant="outline" onClick={commitCustomCategory}>
                    Ok
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Unidade *</Label>
              <Select value={form.unit} onValueChange={(v) => setForm({ ...form, unit: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u === 'JG' ? 'JG (Jogo)' : u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Estoque Atual</Label>
              <Input
                type="number"
                step="0.01"
                value={form.stock_quantity}
                onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Valor de Custo (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.cost_price}
                onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                placeholder="0,00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Valor de Venda (R$)</Label>
            <Input
              type="number"
              step="0.01"
              value={form.sale_price}
              onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
              placeholder="0,00"
            />
            <p className="text-xs text-muted-foreground">
              Usado em orçamentos. O custo continua para controle interno.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export { DEFAULT_CATEGORIES, UNITS };
