import { cn } from 'src/lib/utils';

interface ChronleLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function ChronleLogo({ size = 'md', className }: ChronleLogoProps) {
  const sizeClasses = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-5xl',
  };

  return (
    <h1 className={cn('bevan font-black tracking-tight text-primary', sizeClasses[size], className)}>
      Chronle
    </h1>
  );
}
