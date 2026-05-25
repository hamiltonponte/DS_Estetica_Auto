import React from 'react';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useStorage } from '@/lib/StorageContext';

export default function TopBar({ title, subtitle, onMobileMenuToggle }) {
  const { folderName } = useStorage();

  return (
    <header className="h-16 bg-card/80 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={onMobileMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 max-w-[200px]">
        <span className="text-[10px] text-muted-foreground truncate" title={folderName}>
          📁 {folderName}
        </span>
      </div>
    </header>
  );
}
