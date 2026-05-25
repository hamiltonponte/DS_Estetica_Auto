import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Save, Building2, Phone, CreditCard, Bell, FolderOpen, FileSpreadsheet } from 'lucide-react';
import { useStorage } from '@/lib/StorageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/shared/PageHeader';
import { toast } from '@/components/ui/use-toast';

const DEFAULT_REMINDER = `Olá {nome}! 👋

Passando para lembrar que sua mensalidade DS Estética Auto no valor de *R$ {valor}* vence em *{vencimento}*.

Para efetuar o pagamento via PIX:
🔑 Chave: *{pix}*

Qualquer dúvida estamos à disposição! 😊
— DS Estética Auto`;

export default function Settings() {
  const queryClient = useQueryClient();
  const { folderName, changeFolder } = useStorage();
  const [form, setForm] = useState(null);

  const { data: configs = [] } = useQuery({
    queryKey: ['business-config'],
    queryFn: () => api.entities.BusinessConfig.list(),
  });

  const config = configs[0];

  useEffect(() => {
    if (config) {
      setForm({ ...config });
    } else {
      setForm({
        business_name: 'DS Estética Auto',
        owner_name: '',
        phone: '',
        whatsapp: '',
        pix_key: '',
        pix_key_type: 'cpf',
        address: '',
        instagram: '',
        opening_hours: '',
        reminder_days_before: 3,
        whatsapp_reminder_message: DEFAULT_REMINDER,
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: (data) => config?.id
      ? api.entities.BusinessConfig.update(config.id, data)
      : api.entities.BusinessConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-config'] });
      toast({ title: 'Configurações salvas com sucesso!' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, reminder_days_before: Number(form.reminder_days_before) });
  };

  if (!form) return null;

  const Section = ({ icon: SectionIcon, title, children }) => (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-foreground">
        <SectionIcon className="w-4 h-4 text-accent" /> {title}
      </h3>
      {children}
    </div>
  );

  return (
    <div className="min-h-screen">
      <PageHeader title="Configurações" subtitle="Dados do negócio e preferências do sistema" />
      <form onSubmit={handleSubmit} className="px-4 md:px-6 py-6 max-w-2xl space-y-6">

        <Section icon={FolderOpen} title="Armazenamento local">
          <p className="text-sm text-muted-foreground">
            Pasta atual: <strong>{folderName || '—'}</strong>
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            O arquivo <code className="bg-muted px-1 rounded">ds-estetica-dados.xlsx</code> é atualizado automaticamente na pasta.
          </p>
          <Button type="button" variant="outline" onClick={changeFolder}>
            <FolderOpen className="w-4 h-4 mr-2" /> Trocar pasta de dados
          </Button>
        </Section>

        <Section icon={Building2} title="Dados do Negócio">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Estabelecimento *</Label>
              <Input value={form.business_name} onChange={e => setForm({ ...form, business_name: e.target.value })} required />
            </div>
            <div className="space-y-1.5">
              <Label>Nome do Proprietário</Label>
              <Input value={form.owner_name || ''} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Rua, número, bairro, cidade" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Horário de Funcionamento</Label>
              <Input value={form.opening_hours || ''} onChange={e => setForm({ ...form, opening_hours: e.target.value })} placeholder="Seg-Sex 8h às 18h" />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input value={form.instagram || ''} onChange={e => setForm({ ...form, instagram: e.target.value })} placeholder="@dsesteticaauto" />
            </div>
          </div>
        </Section>

        <Section icon={Phone} title="Contato">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp do Negócio</Label>
              <Input value={form.whatsapp || ''} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="5511999999999" />
            </div>
          </div>
        </Section>

        <Section icon={CreditCard} title="Pagamento via PIX">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo da Chave PIX</Label>
              <Select value={form.pix_key_type || 'cpf'} onValueChange={v => setForm({ ...form, pix_key_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpf">CPF</SelectItem>
                  <SelectItem value="cnpj">CNPJ</SelectItem>
                  <SelectItem value="telefone">Telefone</SelectItem>
                  <SelectItem value="email">E-mail</SelectItem>
                  <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Chave PIX</Label>
              <Input value={form.pix_key || ''} onChange={e => setForm({ ...form, pix_key: e.target.value })} placeholder="Sua chave PIX" />
            </div>
          </div>
        </Section>

        <Section icon={Bell} title="Lembretes de Assinatura">
          <div className="space-y-1.5">
            <Label>Enviar lembrete quantos dias antes do vencimento?</Label>
            <Input type="number" min="1" max="30" value={form.reminder_days_before || 3} onChange={e => setForm({ ...form, reminder_days_before: e.target.value })} className="w-32" />
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem de Lembrete via WhatsApp</Label>
            <p className="text-xs text-muted-foreground">Use: <code className="bg-muted px-1 rounded">&#123;nome&#125;</code>, <code className="bg-muted px-1 rounded">&#123;valor&#125;</code>, <code className="bg-muted px-1 rounded">&#123;vencimento&#125;</code>, <code className="bg-muted px-1 rounded">&#123;pix&#125;</code></p>
            <Textarea
              value={form.whatsapp_reminder_message || DEFAULT_REMINDER}
              onChange={e => setForm({ ...form, whatsapp_reminder_message: e.target.value })}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        </Section>

        <div className="flex justify-end pb-8">
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground px-8" disabled={saveMutation.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? 'Salvando...' : 'Salvar Configurações'}
          </Button>
        </div>
      </form>
    </div>
  );
}