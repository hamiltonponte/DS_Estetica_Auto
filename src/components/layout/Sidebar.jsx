import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Car, Calendar, Wrench,
  DollarSign, ChevronLeft, ChevronRight,
  Package, Play, Gift, Settings2, Database, Download, Smartphone,
  FileText, Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import BrandLogo from '@/components/brand/BrandLogo';
import { useBranding } from '@/lib/BrandingContext';
import StorageHelpDialog from '@/components/help/StorageHelpDialog';
import CloudSyncPanel from '@/components/cloud/CloudSyncPanel';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Veículos', icon: Car, path: '/veiculos' },
  { label: 'Agendamentos', icon: Calendar, path: '/agendamentos' },
  { label: 'Serviços', icon: Wrench, path: '/servicos' },
  { label: 'Produtos', icon: Package, path: '/produtos' },
  { label: 'Execução', icon: Play, path: '/execucao' },
  { label: 'Orçamentos', icon: FileText, path: '/orcamentos' },
  { label: 'Lembretes', icon: Bell, path: '/lembretes' },
  { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
  { label: 'Promoções', icon: Gift, path: '/selos' },
  { label: 'Configurações', icon: Settings2, path: '/configuracoes' },
];

const helpItems = [
  { id: 'storage', label: 'Como os dados são salvos', icon: Database },
  { id: 'backup', label: 'Como fazer backup', icon: Download },
  { id: 'install', label: 'Instalar na tela inicial', icon: Smartphone },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { businessName, businessTagline } = useBranding();
  const [helpTopic, setHelpTopic] = useState(null);

  return (
    <>
      <aside className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 transition-all duration-300 border-r border-sidebar-border",
        collapsed ? "w-[72px]" : "w-64"
      )}>
        <div className={cn(
          "flex items-center border-b border-sidebar-border shrink-0",
          collapsed ? "h-20 justify-center px-2" : "h-20 px-4 gap-3"
        )}>
          <BrandLogo size={collapsed ? 'md' : 'lg'} />
          {!collapsed && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-base font-brand font-bold tracking-tight text-sidebar-foreground leading-tight truncate">
                {businessName}
              </h1>
              <p className="text-[10px] text-accent font-semibold uppercase tracking-widest truncate">
                {businessTagline}
              </p>
            </div>
          )}
        </div>

        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto min-h-0">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path ||
              (item.path !== '/' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-accent text-accent-foreground shadow-lg shadow-accent/25"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive && "drop-shadow-sm")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-3 space-y-2">
          <CloudSyncPanel collapsed={collapsed} />
          {!collapsed && (
            <p className="text-[10px] uppercase tracking-wider text-sidebar-foreground/40 px-3 pb-1">
              Ajuda
            </p>
          )}
          {helpItems.map((item) => (
            <button
              key={item.id}
              type="button"
              title={collapsed ? item.label : undefined}
              onClick={() => setHelpTopic(item.id)}
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all"
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span className="truncate text-left text-xs">{item.label}</span>}
            </button>
          ))}
        </div>

        <button
          onClick={onToggle}
          className="absolute -right-3 top-24 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-lg shadow-accent/30 hover:scale-110 transition-transform"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </aside>

      <StorageHelpDialog
        open={!!helpTopic}
        onOpenChange={(open) => !open && setHelpTopic(null)}
        topic={helpTopic}
      />
    </>
  );
}
