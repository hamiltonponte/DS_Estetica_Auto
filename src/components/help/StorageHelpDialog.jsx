import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Database, Download, Smartphone } from 'lucide-react';

const CONTENT = {
  storage: {
    title: 'Como os dados são salvos',
    icon: Database,
    sections: [
      {
        heading: 'Onde ficam os dados',
        body: 'Por padrão tudo fica no navegador (IndexedDB). Em Configurações você pode criar a pasta DS_Estetica_Auto_Dados no celular/PC — aí clientes, produtos, serviços, veículos e o financeiro são gravados automaticamente nessa pasta (JSON + Excel).',
      },
      {
        heading: 'Pasta de dados (recomendado)',
        list: [
          'Abra Configurações → Pasta de dados no aparelho.',
          'Toque em Criar pasta de dados e escolha Documentos ou Downloads.',
          'O app cria a pasta DS_Estetica_Auto_Dados e passa a atualizá-la sozinho.',
          'Disponível no Chrome/Edge (Android e PC). No iPhone use o backup completo.',
        ],
      },
      {
        heading: 'O que é guardado',
        list: [
          'Clientes, veículos, produtos e serviços',
          'Agendamentos, execuções e orçamentos',
          'Financeiro (atualizado ao finalizar serviço)',
          'Configurações (nome, logo, PIX, cores)',
          'Planilha Excel e arquivos JSON na pasta',
        ],
      },
      {
        heading: 'Quando grava',
        body: 'Cada cadastro, edição ou exclusão salva no navegador e, se a pasta estiver conectada, também na pasta. Ao finalizar um serviço, o financeiro é atualizado.',
      },
      {
        heading: 'Importante no iPhone',
        list: [
          'Use sempre o mesmo navegador (de preferência Safari).',
          'Limpar dados do site apaga tudo.',
          'Modo anônimo pode não guardar os dados.',
          'Após muito tempo sem usar, o iOS pode liberar espaço — faça backup da planilha.',
        ],
      },
      {
        heading: 'Importante no Android / PC',
        list: [
          'Chrome e Edge guardam por site (endereço do app).',
          'Trocar de navegador = dados diferentes.',
          'Limpar cache/dados do site apaga tudo.',
        ],
      },
    ],
  },
  backup: {
    title: 'Como fazer backup',
    icon: Download,
    sections: [
      {
        heading: 'Por que fazer backup',
        body: 'Os dados ficam só no aparelho. Se você limpar o navegador, trocar de celular ou formatar, pode perder tudo. O backup protege seu negócio.',
      },
      {
        heading: 'Backup recomendado (planilha)',
        list: [
          'Abra Configurações no menu.',
          'Na seção "Dados e planilha", toque em Baixar ds-estetica-dados.xlsx.',
          'Guarde o arquivo na nuvem (Google Drive, iCloud, WhatsApp) ou no PC.',
          'Repita com frequência (ex.: semanal ou após muitos cadastros).',
        ],
      },
      {
        heading: 'Backup completo para trocar de aparelho',
        list: [
          'Abra Configurações e vá em "Backup e restauração completa".',
          'Toque em "Baixar backup completo (.json)".',
          'No aparelho novo, abra o app e toque em "Restaurar backup".',
          'Selecione o arquivo .json salvo na nuvem (iCloud/Drive).',
        ],
      },
      {
        heading: 'O que vem na planilha',
        body: 'Abas com clientes, produtos, serviços, agendamentos e resumo financeiro. É uma cópia para consulta e arquivo.',
      },
      {
        heading: 'Diferença entre planilha e backup completo',
        list: [
          'Planilha (.xlsx): boa para relatório e arquivo.',
          'Backup completo (.json): usado para restaurar 100% do app em outro aparelho.',
        ],
      },
      {
        heading: 'Dica no iPhone',
        body: 'Após baixar, use Compartilhar → Salvar em Arquivos ou enviar para você mesmo no WhatsApp/e-mail.',
      },
      {
        heading: 'Dica no Android / PC',
        body: 'O download vai para a pasta de Downloads. Copie para um pendrive ou nuvem se quiser mais segurança.',
      },
    ],
  },
  install: {
    title: 'Instalar o app na tela inicial',
    icon: Smartphone,
    sections: [
      {
        heading: 'iPhone (Safari)',
        list: [
          'Abra o site no Safari (não só no Chrome).',
          'Toque em Compartilhar (ícone com seta para cima).',
          'Escolha "Adicionar à Tela de Início".',
          'Confirme. O ícone abrirá como app.',
        ],
      },
      {
        heading: 'Android (Chrome)',
        list: [
          'Abra o site no Chrome.',
          'Menu (⋮) → "Instalar app" ou "Adicionar à tela inicial".',
          'Se não aparecer, use "Adicionar à tela inicial" no menu.',
        ],
      },
      {
        heading: 'Computador (Chrome / Edge)',
        body: 'Procure o ícone de instalação na barra de endereço (⊕ ou monitor com seta) e clique em Instalar.',
      },
      {
        heading: 'URL do app',
        body: 'https://hamiltonponte.github.io/DS_Estetica_Auto/',
      },
      {
        heading: 'Login e nuvem (próxima etapa)',
        body: 'Com login ativo, os dados sincronizam com o servidor Contabo. Ao trocar de iPhone, entre com e-mail/senha e use Restaurar da nuvem em Configurações.',
      },
    ],
  },
};

function SectionBlock({ section }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold text-foreground">{section.heading}</h4>
      {section.body && (
        <p className="text-sm text-muted-foreground leading-relaxed">{section.body}</p>
      )}
      {section.list && (
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc pl-4">
          {section.list.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StorageHelpDialog({ open, onOpenChange, topic }) {
  const content = CONTENT[topic];
  if (!content) return null;

  const Icon = content.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-left">
            <Icon className="w-5 h-5 text-accent shrink-0" />
            {content.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5 pr-1">
          {content.sections.map((section) => (
            <SectionBlock key={section.heading} section={section} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
