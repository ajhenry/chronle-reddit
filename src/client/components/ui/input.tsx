import * as React from 'react';

import { cn } from 'src/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-12 w-full rounded-none border-2 border-input bg-background px-4 py-3 text-base font-medium text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-bold file:text-foreground placeholder:text-muted-foreground focus-visible:outline-4 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm transition-all duration-200 hover:not(:focus):shadow-md hover:not(:focus):transform hover:not(:focus):-translate-x-0.5 hover:not(:focus):-translate-y-0.5',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
