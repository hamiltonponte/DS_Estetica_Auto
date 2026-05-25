import React from 'react';
import { FolderOpen, HardDrive, FileSpreadsheet, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStorage } from '@/lib/StorageContext';
import BrandLogo from '@/components/brand/BrandLogo';

export default function FolderSetupScreen() {
  const { loading, error, unsupported, selectFolder } = useStorage();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-lg w-full brand-panel p-8 space-y-6">
        <div className="flex flex-col items-center text-center gap-4">
          <BrandLogo size="2xl" />
          <div>
            <h1 className="text-2xl font-brand font-bold">DS Estética Auto</h1>
            <p className="text-sm text-muted-foreground mt-1">PWA — dados no seu aparelho</p>
          </div>
        </div>

        <p className="text-muted-foreground text-sm leading-relaxed text-center">
          Ao iniciar, escolha uma pasta no dispositivo. Todos os cadastros serão salvos nela em arquivos JSON
          e o app criará automaticamente o arquivo <strong className="text-foreground">ds-estetica-dados.xlsx</strong> com abas para
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
          <p className="text-sm text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
            Pasta local requer Chrome ou Edge (desktop/Android). No iPhone os dados podem ser limitados pelo sistema.
          </p>
        )}

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
            {error}
          </p>
        )}

        <Button
          className="w-full h-12 btn-brand text-base"
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
