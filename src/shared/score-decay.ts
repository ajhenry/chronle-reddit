/**
 * Shared score decay utilities for consistent score calculation across client and server
 */

/**
 * Default initial score for Lettered games
 */
export const DEFAULT_INITIAL_SCORE = 250;

export interface DecayCalculationParams {
  initialScore: number;
  elapsedSeconds: number;
  gameType: 'lettered';
  placedPieces?: number; // For Lettered games
}

export interface DecayConfig {
  gameType: 'lettered';
  letteredBaseDecayRate?: number; // Base decay rate for Lettered (default: 3)
  letteredPieceMultiplier?: number; // Multiplier for pieces placed (default: 1.1)
}

/**
 * Default decay configurations for Lettered game
 */
export const DEFAULT_DECAY_CONFIGS: Record<string, DecayConfig> = {
  lettered: {
    gameType: 'lettered',
    letteredBaseDecayRate: 1.5,
    letteredPieceMultiplier: 1,
  },
};

/**
 * Calculate current score after applying decay
 */
export function calculateDecayedScore(params: DecayCalculationParams): number {
  const { initialScore, elapsedSeconds, placedPieces } = params;

  // Lettered game decay: base rate * piece multiplier^placed pieces
  const config = DEFAULT_DECAY_CONFIGS.lettered;
  if (!config) return initialScore;
  const baseRate = config.letteredBaseDecayRate!;
  const pieceMultiplier = config.letteredPieceMultiplier!;
  const multiplier = Math.pow(pieceMultiplier, placedPieces ?? 0);
  const decayAmount = Math.floor(elapsedSeconds * baseRate * multiplier);
  return Math.max(0, initialScore - decayAmount);
}

/**
 * Calculate decay amount for a given time period
 */
export function calculateDecayAmount(
  elapsedSeconds: number,
  placedPieces?: number
): number {
  const initialScore = 10000; // Dummy value, we only care about the decay amount
  const decayedScore = calculateDecayedScore({
    initialScore,
    elapsedSeconds,
    gameType: 'lettered',
    placedPieces: placedPieces ?? 0,
  });
  return initialScore - decayedScore;
}

/**
 * Get the decay rate for a given game state
 */
export function getDecayRate(placedPieces?: number): number {
  const config = DEFAULT_DECAY_CONFIGS.lettered;
  if (!config) return 0;
  const baseRate = config.letteredBaseDecayRate!;
  const pieceMultiplier = config.letteredPieceMultiplier!;
  return baseRate * Math.pow(pieceMultiplier, placedPieces ?? 0);
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
export function createDecayConfig(config: Partial<DecayConfig>): DecayConfig {
  const defaults = DEFAULT_DECAY_CONFIGS.lettered;
  return { ...defaults, ...config, gameType: 'lettered' };
}
