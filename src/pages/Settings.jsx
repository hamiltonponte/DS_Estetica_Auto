import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/apiClient';
import { Save, Building2, Phone, CreditCard, Bell, FileSpreadsheet, Upload, Trash2, Palette, Check, Database, Cloud, FolderOpen } from 'lucide-react';
import { isStorageReady } from '@/lib/storage/entityStore';
import { syncWorkbook, downloadWorkbook } from '@/lib/storage/excelSync';
import { downloadBackup, exportBackup, importBackup, parseBackupFile } from '@/lib/storage/backup';
import { extractColorsFromImage, generateThemeOptions } from '@/lib/utils/colorExtractor';
import { applyThemeFromColors } from '@/lib/theme/applyTheme';
import { useBranding } from '@/lib/BrandingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import MaskedInput from '@/components/ui/masked-input';
import PageHeader from '@/components/shared/PageHeader';
import DataFolderPanel from '@/components/storage/DataFolderPanel';
import { CloudSyncSettingsSection } from '@/components/cloud/CloudSyncPanel';
import { isCloudEnabled } from '@/lib/cloud/cloudConfig';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { applyMask, maskPhone } from '@/lib/masks';

const DEFAULT_REMINDER = `Olá {nome}! 👋

Passando para lembrar que sua mensalidade DS Estética Auto no valor de *R$ {valor}* vence em *{vencimento}*.

Para efetuar o pagamento via PIX:
🔑 Chave: *{pix}*

Qualquer dúvida estamos à disposição! 😊
— DS Estética Auto`;

const DEFAULT_LOGO = `${import.meta.env.BASE_URL}brand/logo-ds.jpg`;

function ThemePaletteCard({ option, selected, onSelect }) {
  const { accent, primary, secondary } = option.colors;
  return (
    <button
      type="button"
      onClick={() => onSelect(option)}
      className={cn(
        'rounded-xl border p-3 text-left transition-all w-full',
        selected
          ? 'border-accent ring-2 ring-accent/40 bg-accent/5'
          : 'border-border hover:border-accent/50',
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="font-semibold text-sm">{option.name}</span>
        {selected && <Check className="w-4 h-4 text-accent shrink-0" />}
      </div>
      <p className="text-xs text-muted-foreground mb-3">{option.description}</p>
      <div className="flex gap-1.5">
        <span className="w-8 h-8 rounded-full border border-border" style={{ background: accent }} title="Destaque" />
        <span className="w-8 h-8 rounded-full border border-border" style={{ background: primary }} title="Principal" />
        <span className="w-8 h-8 rounded-full border border-border" style={{ background: secondary }} title="Secundária" />
      </div>
    </button>
  );
}

function SettingsSection({ icon: SectionIcon, title, children }) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 space-y-4">
      <h3 className="font-semibold flex items-center gap-2 text-foreground">
        <SectionIcon className="w-4 h-4 text-accent" /> {title}
      </h3>
      {children}
    </div>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { refresh: refreshBranding } = useBranding();
  const [form, setForm] = useState(null);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingBackup, setExportingBackup] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [themeOptions, setThemeOptions] = useState([]);

  const handleExportExcel = async () => {
    if (!isStorageReady()) return;
    setExportingExcel(true);
    try {
      const buffer = await syncWorkbook();
      downloadWorkbook(buffer);
      toast({ title: 'Planilha baixada: ds-estetica-dados.xlsx' });
    } catch (err) {
      toast({ title: err.message || 'Erro ao gerar planilha', variant: 'destructive' });
    } finally {
      setExportingExcel(false);
    }
  };

  const handleExportBackup = async () => {
    if (!isStorageReady()) return;
    setExportingBackup(true);
    try {
      const backup = await exportBackup();
      downloadBackup(backup);
      toast({ title: 'Backup completo baixado (.json)' });
    } catch (err) {
      toast({ title: err.message || 'Erro ao exportar backup', variant: 'destructive' });
    } finally {
      setExportingBackup(false);
    }
  };

  const handleImportBackup = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isStorageReady()) {
      toast({ title: 'Aguarde o app terminar de carregar', variant: 'destructive' });
      return;
    }

    const confirmed = window.confirm(
      'Restaurar backup substitui os dados atuais deste aparelho. Deseja continuar?',
    );
    if (!confirmed) return;

    setImportingBackup(true);
    try {
      const payload = await parseBackupFile(file);
      await importBackup(payload, { replace: true });
      await refreshBranding();
      queryClient.invalidateQueries();
      toast({ title: 'Backup restaurado com sucesso!' });
    } catch (err) {
      toast({ title: err.message || 'Erro ao restaurar backup', variant: 'destructive' });
    } finally {
      setImportingBackup(false);
    }
  };

  const selectTheme = (option) => {
    setForm((prev) => ({
      ...prev,
      theme_preset: option.id,
      theme_colors: option.colors,
    }));
    applyThemeFromColors(option.colors);
  };

  const loadPalettesFromLogo = async (logoUrl) => {
    try {
      const colors = await extractColorsFromImage(logoUrl, 5);
      const options = generateThemeOptions(colors);
      setThemeOptions(options);
      return options;
    } catch {
      setThemeOptions([]);
      return [];
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isStorageReady()) {
      toast({ title: 'Aguarde o app terminar de carregar', variant: 'destructive' });
      return;
    }

    const maxSizeMb = 5;
    if (file.size > maxSizeMb * 1024 * 1024) {
      toast({ title: `Imagem muito grande. Limite: ${maxSizeMb}MB`, variant: 'destructive' });
      return;
    }

    setUploadingLogo(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file, storage: 'inline' });
      const options = await loadPalettesFromLogo(file_url);
      const first = options[0];

      setForm((prev) => ({
        ...prev,
        business_logo_url: file_url,
        theme_preset: first?.id || 'classico',
        theme_colors: first?.colors || prev.theme_colors,
      }));

      if (first?.colors) {
        applyThemeFromColors(first.colors);
      }

      toast({ title: 'Logo carregada. Escolha uma paleta e salve as configurações.' });
    } catch (err) {
      toast({ title: err.message || 'Erro ao carregar imagem', variant: 'destructive' });
    } finally {
      setUploadingLogo(false);
    }
  };

  const { data: configs = [] } = useQuery({
    queryKey: ['business-config'],
    queryFn: () => api.entities.BusinessConfig.list(),
  });

  const config = configs[0];

  useEffect(() => {
    if (config) {
      const pixType = config.pix_key_type || 'cpf';
      setForm({
        ...config,
        phone: maskPhone(config.phone || ''),
        whatsapp: maskPhone(config.whatsapp || ''),
        pix_key: ['cpf', 'cnpj', 'telefone'].includes(pixType)
          ? applyMask(pixType === 'telefone' ? 'phone' : pixType, config.pix_key || '')
          : (config.pix_key || ''),
      });
      if (config.business_logo_url) {
        loadPalettesFromLogo(config.business_logo_url).then((options) => {
          if (config.theme_preset && options.length) {
            const match = options.find((o) => o.id === config.theme_preset);
            if (match) applyThemeFromColors(match.colors);
            else if (config.theme_colors) applyThemeFromColors(config.theme_colors);
          } else if (config.theme_colors) {
            applyThemeFromColors(config.theme_colors);
          }
        });
      } else if (config.theme_colors) {
        applyThemeFromColors(config.theme_colors);
      }
    } else if (configs !== undefined) {
      setForm({
        business_name: 'DS Estética Auto',
        business_tagline: 'Estética Automotiva',
        owner_name: '',
        phone: '',
        whatsapp: '',
        pix_key: '',
        pix_key_type: 'cpf',
        pix_city: '',
        address: '',
        instagram: '',
        opening_hours: '',
        reminder_days_before: 3,
        whatsapp_reminder_message: DEFAULT_REMINDER,
        business_logo_url: '',
        theme_preset: 'classico',
        theme_colors: null,
      });
    }
    // Só recarrega o formulário quando o registro do banco muda (id),
    // não a cada re-render — evita perder foco ao digitar o nome.
  }, [config?.id]);

  const saveMutation = useMutation({
    mutationFn: (data) => config?.id
      ? api.entities.BusinessConfig.update(config.id, data)
      : api.entities.BusinessConfig.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['business-config'] });
      refreshBranding();
      toast({ title: 'Configurações salvas! Logo, nome e cores aplicados no app.' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({ ...form, reminder_days_before: Number(form.reminder_days_before) });
  };

  if (!form) return null;

  const logoPreview = form.business_logo_url || DEFAULT_LOGO;
  const selectedPreset = form.theme_preset;
  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen">
      <PageHeader title="Configurações" subtitle="Dados do negócio, identidade visual e preferências" />
      <form onSubmit={handleSubmit} className="px-4 md:px-6 py-6 max-w-2xl space-y-6">

        <SettingsSection icon={FolderOpen} title="Pasta de dados no aparelho">
          <DataFolderPanel />
        </SettingsSection>

        <SettingsSection icon={FileSpreadsheet} title="Dados e planilha">
          <p className="text-sm text-muted-foreground">
            Os cadastros ficam no navegador e, se a pasta de dados estiver ativa, também na pasta do aparelho.
            Use o botão abaixo para baixar uma cópia da planilha a qualquer momento.
          </p>
          <Button type="button" variant="outline" onClick={handleExportExcel} disabled={exportingExcel}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            {exportingExcel ? 'Gerando...' : 'Baixar ds-estetica-dados.xlsx'}
          </Button>
        </SettingsSection>

        <SettingsSection icon={Database} title="Backup e restauração completa">
          <p className="text-sm text-muted-foreground">
            Use backup completo para trocar de aparelho e recuperar 100% dos dados
            (cadastros, agendamentos, execuções, configurações, logo e tema).
          </p>
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="text-xs text-amber-200">
              Atenção: restaurar backup substitui os dados atuais deste aparelho.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleExportBackup} disabled={exportingBackup}>
              <Database className="w-4 h-4 mr-2" />
              {exportingBackup ? 'Gerando backup...' : 'Baixar backup completo (.json)'}
            </Button>
            <Button type="button" variant="outline" asChild disabled={importingBackup}>
              <label className="cursor-pointer flex items-center">
                <Upload className="w-4 h-4 mr-2" />
                {importingBackup ? 'Restaurando...' : 'Restaurar backup'}
                <input
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleImportBackup}
                />
              </label>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Dica: salve o arquivo no iCloud, Google Drive ou WhatsApp para usar em outro aparelho.
          </p>
        </SettingsSection>

        <SettingsSection icon={Building2} title="Dados do Negócio e identidade visual">
          <div className="space-y-2">
            <Label>Logo do negócio</Label>
            <div className="flex items-center gap-3">
              <img
                src={logoPreview}
                alt={form.business_name || 'Logo'}
                className="w-16 h-16 rounded-full object-cover border border-border"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" asChild disabled={uploadingLogo}>
                  <label className="cursor-pointer flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    {uploadingLogo ? 'Carregando...' : 'Enviar imagem'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                    />
                  </label>
                </Button>
                {form.business_logo_url && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setForm({ ...form, business_logo_url: '', theme_colors: null, theme_preset: 'classico' });
                      setThemeOptions([]);
                    }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A logo aparece na barra lateral, no dashboard e na nota de serviço após salvar.
            </p>
          </div>

          {themeOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-accent" />
                Paleta de cores (até 3 opções da logo)
              </Label>
              <p className="text-xs text-muted-foreground">
                Escolha uma paleta para personalizar botões, destaques e a nota de serviço.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {themeOptions.map((option) => (
                  <ThemePaletteCard
                    key={option.id}
                    option={option}
                    selected={selectedPreset === option.id}
                    onSelect={selectTheme}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Nome do Estabelecimento *</Label>
              <Input
                value={form.business_name}
                onChange={e => updateField('business_name', e.target.value)}
                required
                className="font-brand"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subtítulo / ramo</Label>
              <Input
                value={form.business_tagline || ''}
                onChange={e => updateField('business_tagline', e.target.value)}
                placeholder="Estética Automotiva"
                className="font-brand text-sm"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nome do Proprietário</Label>
            <Input value={form.owner_name || ''} onChange={e => updateField('owner_name', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={form.address || ''} onChange={e => updateField('address', e.target.value)} placeholder="Rua, número, bairro, cidade" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Horário de Funcionamento</Label>
              <Input value={form.opening_hours || ''} onChange={e => updateField('opening_hours', e.target.value)} placeholder="Seg-Sex 8h às 18h" />
            </div>
            <div className="space-y-1.5">
              <Label>Instagram</Label>
              <Input value={form.instagram || ''} onChange={e => updateField('instagram', e.target.value)} placeholder="@dsesteticaauto" />
            </div>
          </div>

          <div className="rounded-xl border border-border p-4 bg-muted/30">
            <p className="text-xs text-muted-foreground mb-2">Prévia do cabeçalho (mesma fonte do app)</p>
            <div className="flex items-center gap-3">
              <img src={logoPreview} alt="" className="w-12 h-12 rounded-full object-cover border border-accent/30" />
              <div>
                <p className="font-brand font-bold text-base leading-tight">{form.business_name || 'Nome do negócio'}</p>
                <p className="text-[10px] text-accent font-semibold uppercase tracking-widest">
                  {form.business_tagline || 'Estética Automotiva'}
                </p>
              </div>
            </div>
          </div>
        </SettingsSection>

        <SettingsSection icon={Phone} title="Contato">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <MaskedInput
                mask="phone"
                value={form.phone || ''}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1.5">
              <Label>WhatsApp do Negócio</Label>
              <MaskedInput
                mask="whatsapp"
                value={form.whatsapp || ''}
                onChange={(e) => updateField('whatsapp', e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>
          </div>
        </SettingsSection>

        <SettingsSection icon={CreditCard} title="Pagamento via PIX">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo da Chave PIX</Label>
              <Select
                value={form.pix_key_type || 'cpf'}
                onValueChange={(v) => {
                  updateField('pix_key_type', v);
                  if (['cpf', 'cnpj', 'telefone'].includes(v) && form.pix_key) {
                    updateField(
                      'pix_key',
                      applyMask(v === 'telefone' ? 'phone' : v, form.pix_key),
                    );
                  }
                }}
              >
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
              {['cpf', 'cnpj', 'telefone'].includes(form.pix_key_type || 'cpf') ? (
                <MaskedInput
                  mask={(form.pix_key_type || 'cpf') === 'telefone' ? 'phone' : (form.pix_key_type || 'cpf')}
                  value={form.pix_key || ''}
                  onChange={(e) => updateField('pix_key', e.target.value)}
                  placeholder={
                    form.pix_key_type === 'cnpj'
                      ? '00.000.000/0000-00'
                      : form.pix_key_type === 'telefone'
                        ? '(11) 99999-9999'
                        : '000.000.000-00'
                  }
                />
              ) : (
                <Input
                  value={form.pix_key || ''}
                  onChange={(e) => updateField('pix_key', e.target.value)}
                  placeholder={form.pix_key_type === 'email' ? 'email@exemplo.com' : 'Sua chave PIX'}
                />
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Cidade (para QR Code PIX)</Label>
            <Input
              value={form.pix_city || ''}
              onChange={e => updateField('pix_city', e.target.value)}
              placeholder="Ex: Sao Paulo (máx. 15 caracteres)"
              maxLength={15}
            />
            <p className="text-xs text-muted-foreground">
              Usada no padrão BR Code dos bancos. Se vazio, tentamos extrair do endereço.
            </p>
          </div>
        </SettingsSection>

        <SettingsSection icon={Bell} title="Lembretes de Assinatura">
          <div className="space-y-1.5">
            <Label>Enviar lembrete quantos dias antes do vencimento?</Label>
            <Input type="number" min="1" max="30" value={form.reminder_days_before || 3} onChange={e => updateField('reminder_days_before', e.target.value)} className="w-32" />
          </div>
          <div className="space-y-1.5">
            <Label>Mensagem de Lembrete via WhatsApp</Label>
            <p className="text-xs text-muted-foreground">Use: <code className="bg-muted px-1 rounded">&#123;nome&#125;</code>, <code className="bg-muted px-1 rounded">&#123;valor&#125;</code>, <code className="bg-muted px-1 rounded">&#123;vencimento&#125;</code>, <code className="bg-muted px-1 rounded">&#123;pix&#125;</code></p>
            <Textarea
              value={form.whatsapp_reminder_message || DEFAULT_REMINDER}
              onChange={e => updateField('whatsapp_reminder_message', e.target.value)}
              rows={8}
              className="font-mono text-xs"
            />
          </div>
        </SettingsSection>

        <SettingsSection icon={Cloud} title="Conta e sincronização na nuvem">
          {isCloudEnabled() ? (
            <>
              <p className="text-sm text-muted-foreground">
                Seus dados são salvos offline neste aparelho e sincronizados com o servidor seguro.
                Ao trocar de iPhone, faça login e use &quot;Restaurar da nuvem&quot;.
              </p>
              <CloudSyncSettingsSection />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Este build ainda não está apontando para o servidor na nuvem. Configure
              {' '}
              <code className="bg-muted px-1 rounded">VITE_CLOUD_API_URL</code>
              {' '}
              no deploy.
            </p>
          )}
        </SettingsSection>

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
