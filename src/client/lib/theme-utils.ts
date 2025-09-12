// Theme utility functions for Podium app

export type GameTheme = 'topx' | 'game2' | 'game3' | 'default';

export interface GameThemeConfig {
  id: GameTheme;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  available: boolean;
}

/**
 * Get the CSS class for a game theme
 */
export function getGameThemeClass(theme: GameTheme): string {
  return theme !== 'default' ? `game-${theme}` : '';
}

/**
 * Apply a game theme to the document root
 */
export function applyGameTheme(theme: GameTheme): void {
  // Remove any existing game theme classes
  document.documentElement.classList.remove('game-topx', 'game-game2', 'game-game3');

  // Apply the new theme class
  if (theme !== 'default') {
    document.documentElement.classList.add(`game-${theme}`);
  }
}

/**
 * Remove all game themes and reset to default
 */
export function resetGameTheme(): void {
  document.documentElement.classList.remove('game-topx', 'game-game2', 'game-game3');
}

/**
 * Check if dark mode is currently active
 */
export function isDarkMode(): boolean {
  return document.documentElement.classList.contains('dark');
}

/**
 * Toggle between light and dark mode
 */
export function toggleDarkMode(): void {
  document.documentElement.classList.toggle('dark');
}

/**
 * Set dark mode state
 */
export function setDarkMode(enabled: boolean): void {
  if (enabled) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

/**
 * Get all available game themes configuration
 */
export function getGameThemes(): GameThemeConfig[] {
  return [
    {
      id: 'topx',
      name: 'Top X',
      description: 'Guess the top answers to trivia questions',
      primaryColor: 'hsl(var(--game-topx-primary))',
      secondaryColor: 'hsl(var(--game-topx-secondary))',
      backgroundColor: 'hsl(var(--game-topx-background))',
      available: true,
    },
    {
      id: 'game2',
      name: 'GAME 2',
      description: 'Epic new game mode coming soon!',
      primaryColor: 'hsl(var(--game-game2-primary))',
      secondaryColor: 'hsl(var(--game-game2-secondary))',
      backgroundColor: 'hsl(var(--game-game2-background))',
      available: false,
    },
    {
      id: 'game3',
      name: 'GAME 3',
      description: 'Another awesome game mode coming soon!',
      primaryColor: 'hsl(var(--game-game3-primary))',
      secondaryColor: 'hsl(var(--game-game3-secondary))',
      backgroundColor: 'hsl(var(--game-game3-background))',
      available: false,
    },
  ];
}

/**
 * Get a specific game theme configuration
 */
export function getGameTheme(theme: GameTheme): GameThemeConfig | undefined {
  return getGameThemes().find((t) => t.id === theme);
}

// ===== NEO-BRUTALIST THEME UTILITIES =====

/**
 * Neo-brutalist styling classes for consistent application
 */
export const neobrutalistClasses = {
  // Base neo-brutalist styles
  base: 'border-4 border-border bg-card text-card-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px]',

  // Button styles
  button:
    'bg-primary text-primary-foreground font-black border-4 border-border shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:duration-75',

  // Input styles
  input:
    'border-4 border-border bg-input shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] focus:translate-x-[-4px] focus:translate-y-[-4px] focus:ring-2 focus:ring-ring transition-all duration-200',

  // Badge styles
  badge:
    'border-2 bg-card text-card-foreground border-border font-black px-3 py-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all duration-200',

  // Alert styles
  alert:
    'border-4 border-border bg-card text-card-foreground shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all duration-300 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px]',

  // Hover effects
  hover:
    'transition-all duration-200 ease-out hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-4px] hover:translate-y-[-4px]',

  // Active/pressed effects
  active:
    'active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[2px] active:translate-y-[2px] active:duration-75',

  // Disabled styles
  disabled:
    'opacity-60 cursor-not-allowed hover:translate-x-0 hover:translate-y-0 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
};

/**
 * Apply neo-brutalist styles to a component className
 */
export function applyNeobrutalistStyles(
  baseClasses: string,
  neobrutalistType?: keyof typeof neobrutalistClasses
): string {
  if (!neobrutalistType) return baseClasses;

  const neoClasses = neobrutalistClasses[neobrutalistType];
  return `${baseClasses} ${neoClasses}`.trim();
}

/**
 * Get neo-brutalist button classes with size variations
 */
export function getNeobrutalistButtonClasses(size: 'sm' | 'md' | 'lg' = 'md'): string {
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-4 text-xl',
    lg: 'px-8 py-6 text-2xl',
  };

  return `${neobrutalistClasses.button} ${sizeClasses[size]}`.trim();
}

/**
 * Get neo-brutalist card classes
 */
export function getNeobrutalistCardClasses(): string {
  return neobrutalistClasses.base;
}

/**
 * Get neo-brutalist input classes
 */
export function getNeobrutalistInputClasses(): string {
  return `${neobrutalistClasses.input} p-4 text-lg font-bold`;
}

/**
 * Get neo-brutalist badge classes
 */
export function getNeobrutalistBadgeClasses(): string {
  return neobrutalistClasses.badge;
}
