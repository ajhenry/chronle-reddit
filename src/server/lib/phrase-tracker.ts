/**
 * Phrase tracker for managing sequential game creation
 * Uses Redis to track which phrase index to use next
 */

import { getRedisClient } from './redis-provider';
import { LETTERED_PHRASES, type PhraseData } from './phrase-lists';

const LETTERED_INDEX_KEY = 'daily:lettered:phrase_index';

/**
 * Gets the next lettered phrase in sequential order
 * Wraps around to the beginning if we reach the end
 */
export async function getNextLetteredPhrase(): Promise<PhraseData> {
  try {
    const redis = await getRedisClient();

    const currentIndexStr = await redis.get(LETTERED_INDEX_KEY);
    const currentIndex = currentIndexStr ? parseInt(currentIndexStr, 10) : 0;

    const nextIndex = currentIndex % LETTERED_PHRASES.length;
    const phrase = LETTERED_PHRASES[nextIndex]!;

    const newIndex = (currentIndex + 1) % LETTERED_PHRASES.length;
    await redis.set(LETTERED_INDEX_KEY, newIndex.toString());

    console.log(
      `Selected lettered phrase at index ${nextIndex}: "${phrase.phrase}" (${phrase.category})`
    );
    console.log(`Next index will be: ${newIndex}`);

    return phrase;
  } catch (error) {
    console.error('Error getting next lettered phrase:', error);
    return LETTERED_PHRASES[0]!;
  }
}

/**
 * Gets the current lettered phrase index without incrementing
 */
export async function getCurrentLetteredIndex(): Promise<number> {
  try {
    const redis = await getRedisClient();
    const currentIndexStr = await redis.get(LETTERED_INDEX_KEY);
    return currentIndexStr ? parseInt(currentIndexStr, 10) : 0;
  } catch (error) {
    console.error('Error getting current lettered index:', error);
    return 0;
  }
}

/**
 * Resets the lettered phrase index (useful for testing or manual resets)
 */
export async function resetLetteredIndex(index: number = 0): Promise<void> {
  try {
    const redis = await getRedisClient();
    await redis.set(LETTERED_INDEX_KEY, index.toString());
    console.log(`Reset lettered phrase index to ${index}`);
  } catch (error) {
    console.error('Error resetting lettered index:', error);
  }
}

/**
 * Gets info about the phrase lists
 */
export function getPhraseListInfo() {
  return {
    letteredPhrases: {
      total: LETTERED_PHRASES.length,
      categories: [...new Set(LETTERED_PHRASES.map((p) => p.category))],
    },
  };
}
