import { cn } from '@/lib/utils';

const logoSrc = `${import.meta.env.BASE_URL}brand/logo-ds.jpg`;

const sizeMap = {
  xs: 'w-8 h-8',
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
  '2xl': 'w-32 h-32',
};

export default function BrandLogo({ size = 'md', className, showRing = true }) {
  return (
    <img
      src={logoSrc}
      alt="DS Estética Auto"
      className={cn(
        sizeMap[size] ?? sizeMap.md,
        'rounded-full object-cover shrink-0',
        showRing && 'ring-2 ring-accent/50 shadow-[0_0_20px_hsl(var(--accent)/0.25)]',
        className,
      )}
    />
  );
}
