import React from 'react';
import { Star, Gift } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Cartão de selos (bolinhas com estrela) — mesmo visual do programa de promoções.
 */
export default function StampsProgress({
  stamps = 0,
  required = 10,
  rewardDescription = '',
  campaignName = 'Programa de Selos',
  justCompleted = false,
  className,
  printMode = false,
}) {
  const total = Math.max(1, Number(required) || 10);
  const filled = Math.min(Math.max(0, Number(stamps) || 0), total);

  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-3',
        printMode
          ? 'border-black bg-white text-black'
          : 'border-accent/20 bg-accent/5',
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className={cn('text-sm font-semibold', printMode ? 'text-black' : 'text-foreground')}>
            {campaignName}
          </p>
          <p className={cn('text-xs', printMode ? 'text-neutral-600' : 'text-muted-foreground')}>
            {filled}/{total} selos
          </p>
        </div>
        {justCompleted && (
          <span
            className={cn(
              'text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full flex items-center gap-1',
              printMode
                ? 'border border-black'
                : 'bg-green-500/15 text-green-600 border border-green-500/30',
            )}
          >
            <Gift className="w-3 h-3" />
            Completo
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: total }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <div
              key={i}
              className={cn(
                'w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all',
                isFilled
                  ? printMode
                    ? 'bg-black border-black text-white'
                    : 'bg-accent border-accent text-accent-foreground'
                  : printMode
                    ? 'border-neutral-400 bg-white'
                    : 'border-border bg-background',
              )}
            >
              {isFilled ? <Star className="w-3.5 h-3.5" /> : null}
            </div>
          );
        })}
      </div>

      {justCompleted ? (
        <p className={cn('text-xs font-semibold', printMode ? 'text-black' : 'text-green-600')}>
          Cartão completo! Recompensa: {rewardDescription || 'disponível'}
        </p>
      ) : rewardDescription ? (
        <p className={cn('text-xs', printMode ? 'text-neutral-600' : 'text-muted-foreground')}>
          Faltam {total - filled} para: {rewardDescription}
        </p>
      ) : null}
    </div>
  );
}
