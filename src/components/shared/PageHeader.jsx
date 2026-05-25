import React from 'react';
import { Button } from '@/components/ui/button';
import { Plus, Menu } from 'lucide-react';
import { useOutletContext } from 'react-router-dom';

export default function PageHeader({ title, subtitle, actionLabel, onAction, children }) {
  const context = useOutletContext();

  return (
    <div className="bg-card/80 backdrop-blur-xl border-b border-border sticky top-0 z-30">
      <div className="px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => context?.setMobileOpen?.(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {children}
          {actionLabel && onAction && (
            <Button onClick={onAction} className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg shadow-accent/20">
              <Plus className="w-4 h-4 mr-2" />
              {actionLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}