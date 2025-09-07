/**
 * Shared score decay utilities for consistent score calculation across client and server
 */

/**
 * Default initial score for all games (Lettered and TopX)
 */
export const DEFAULT_INITIAL_SCORE = 5000;

export interface DecayCalculationParams {
  initialScore: number;
  elapsedSeconds: number;
  gameType: 'lettered' | 'topx';
  placedPieces?: number; // For Lettered games
  incorrectCount?: number; // For TopX games
}

export interface DecayConfig {
  gameType: 'lettered' | 'topx';
  // For TopX games
  topXBaseDecayRate?: number; // Base multiplier for TopX (default: 1.5)
  // For Lettered games
  letteredBaseDecayRate?: number; // Base decay rate for Lettered (default: 3)
  letteredPieceMultiplier?: number; // Multiplier for pieces placed (default: 1.1)
}

/**
 * Default decay configurations for each game type
 */
export const DEFAULT_DECAY_CONFIGS: Record<string, DecayConfig> = {
  lettered: {
    gameType: 'lettered',
    letteredBaseDecayRate: 3,
    letteredPieceMultiplier: 1.1,
  },
  topx: {
    gameType: 'topx',
    topXBaseDecayRate: 1.5,
  },
};

/**
 * Calculate current score after applying decay
 */
export function calculateDecayedScore(params: DecayCalculationParams): number {
  const { initialScore, elapsedSeconds, gameType, placedPieces, incorrectCount } = params;

  if (gameType === 'lettered') {
    // Lettered game decay: base rate * piece multiplier^placed pieces
    const config = DEFAULT_DECAY_CONFIGS.lettered;
    if (!config) return initialScore;
    const baseRate = config.letteredBaseDecayRate!;
    const pieceMultiplier = config.letteredPieceMultiplier!;
    const multiplier = Math.pow(pieceMultiplier, placedPieces ?? 0);
    const decayAmount = Math.floor(elapsedSeconds * baseRate * multiplier);
    return Math.max(0, initialScore - decayAmount);
  } else if (gameType === 'topx') {
    // TopX game decay: base rate^incorrect count
    const config = DEFAULT_DECAY_CONFIGS.topx;
    if (!config) return initialScore;
    const baseRate = config.topXBaseDecayRate!;
    const multiplier = Math.pow(baseRate, incorrectCount ?? 0);
    const decayAmount = Math.floor(elapsedSeconds * multiplier);
    return Math.max(0, initialScore - decayAmount);
  }

  // Fallback - no decay
  return initialScore;
}

/**
 * Calculate decay amount for a given time period
 */
export function calculateDecayAmount(
  gameType: 'lettered' | 'topx',
  elapsedSeconds: number,
  placedPieces?: number,
  incorrectCount?: number
): number {
  const initialScore = 10000; // Dummy value, we only care about the decay amount
  const decayedScore = calculateDecayedScore({
    initialScore,
    elapsedSeconds,
    gameType,
    placedPieces: placedPieces ?? 0,
    incorrectCount: incorrectCount ?? 0,
  });
  return initialScore - decayedScore;
}

/**
 * Get the decay rate for a given game state
 */
export function getDecayRate(
  gameType: 'lettered' | 'topx',
  placedPieces?: number,
  incorrectCount?: number
): number {
  if (gameType === 'lettered') {
    const config = DEFAULT_DECAY_CONFIGS.lettered;
    if (!config) return 0;
    const baseRate = config.letteredBaseDecayRate!;
    const pieceMultiplier = config.letteredPieceMultiplier!;
    return baseRate * Math.pow(pieceMultiplier, placedPieces ?? 0);
  } else if (gameType === 'topx') {
    const config = DEFAULT_DECAY_CONFIGS.topx;
    if (!config) return 0;
    const baseRate = config.topXBaseDecayRate!;
    return Math.pow(baseRate, incorrectCount ?? 0);
  }

  return 0;
}

/**
 * Calculate time remaining until score reaches zero
 */
export function calculateTimeToZero(currentScore: number, decayRate: number): number {
  if (decayRate <= 0) return Infinity;
  return Math.floor(currentScore / decayRate);
}

/**
 * Create a custom decay configuration
 */
export function createDecayConfig(
  config: Partial<DecayConfig> & { gameType: 'lettered' | 'topx' }
): DecayConfig {
  const defaults = DEFAULT_DECAY_CONFIGS[config.gameType];
  return { ...defaults, ...config };
}
