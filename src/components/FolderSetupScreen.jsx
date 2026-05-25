import React from 'react';
import { FolderOpen, HardDrive, FileSpreadsheet, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStorage } from '@/lib/StorageContext';

export default function FolderSetupScreen() {
  const { loading, error, unsupported, selectFolder } = useStorage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-card border border-border rounded-3xl p-8 shadow-xl space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">DS Estética Auto</h1>
            <p className="text-sm text-muted-foreground">PWA — dados no seu aparelho</p>
          </div>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed">
          Ao iniciar, escolha uma pasta no dispositivo. Todos os cadastros serão salvos nela em arquivos JSON
          e o app criará automaticamente o arquivo <strong>ds-estetica-dados.xlsx</strong> com abas para
          clientes, produtos, serviços, financeiro e agendamentos.
        </p>

        <ul className="space-y-3 text-sm">
          <li className="flex gap-3 items-start">
            <FolderOpen className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <span>Selecione ou crie uma pasta (ex.: Documentos/DS_Estetica_Auto)</span>
          </li>
          <li className="flex gap-3 items-start">
            <HardDrive className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <span>Dados salvos localmente — funciona offline após configurar</span>
          </li>
          <li className="flex gap-3 items-start">
            <FileSpreadsheet className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <span>Planilha Excel atualizada a cada alteração</span>
          </li>
          <li className="flex gap-3 items-start">
            <Shield className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <span>Sem login — acesso direto ao painel</span>
          </li>
        </ul>

        {unsupported && (
          <p className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            Pasta local requer Chrome ou Edge (desktop/Android). No iPhone os dados podem ser limitados pelo sistema.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            {error}
          </p>
        )}

        <Button
          className="w-full h-12 bg-accent hover:bg-accent/90 text-accent-foreground text-base"
          onClick={selectFolder}
          disabled={loading || unsupported}
        >
          <FolderOpen className="w-5 h-5 mr-2" />
          {loading ? 'Aguarde...' : 'Selecionar pasta de dados'}
        </Button>
      </div>
    </div>
  );
}
