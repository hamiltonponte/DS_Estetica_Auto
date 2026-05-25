import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Car, Calendar, Wrench,
  DollarSign, ChevronLeft, ChevronRight,
  Package, Play, Gift, Settings2, FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStorage } from '@/lib/StorageContext';
import BrandLogo from '@/components/brand/BrandLogo';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Clientes', icon: Users, path: '/clientes' },
  { label: 'Veículos', icon: Car, path: '/veiculos' },
  { label: 'Agendamentos', icon: Calendar, path: '/agendamentos' },
  { label: 'Serviços', icon: Wrench, path: '/servicos' },
  { label: 'Produtos', icon: Package, path: '/produtos' },
  { label: 'Execução', icon: Play, path: '/execucao' },
  { label: 'Financeiro', icon: DollarSign, path: '/financeiro' },
  { label: 'Promoções', icon: Gift, path: '/selos' },
  { label: 'Configurações', icon: Settings2, path: '/configuracoes' },
];

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation();
  const { folderName, changeFolder } = useStorage();

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen bg-sidebar text-sidebar-foreground flex flex-col z-50 transition-all duration-300 border-r border-sidebar-border",
      collapsed ? "w-[72px]" : "w-64"
    )}>
      <div className={cn(
        "flex items-center border-b border-sidebar-border",
        collapsed ? "h-20 justify-center px-2" : "h-20 px-4 gap-3"
      )}>
        <BrandLogo size={collapsed ? 'md' : 'lg'} />
        {!collapsed && (
          <div className="overflow-hidden min-w-0">
            <h1 className="text-base font-brand font-bold tracking-tight text-sidebar-foreground leading-tight">
              DS Estética Auto
            </h1>
            <p className="text-[10px] text-accent font-semibold uppercase tracking-widest">
              Estética Automotiva
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path ||
            (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
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

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {!collapsed && folderName && (
          <p className="px-3 py-1 text-[10px] text-sidebar-foreground/40 truncate" title={folderName}>
            📁 {folderName}
          </p>
        )}
        <button
          onClick={changeFolder}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all w-full"
        >
          <FolderOpen className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>Trocar pasta</span>}
        </button>
      </div>

      <button
        onClick={onToggle}
        className="absolute -right-3 top-24 w-6 h-6 bg-accent text-accent-foreground rounded-full flex items-center justify-center shadow-lg shadow-accent/30 hover:scale-110 transition-transform"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}
