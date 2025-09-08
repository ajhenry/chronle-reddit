import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// API configuration for local development
export const getApiBaseUrl = (): string => {
  // Check if we're running in local development mode
  // This can be determined by checking if the current hostname is localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'http://localhost:3001';
  }

  // For production/Devvit mode, use relative URLs
  return '';
};

export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const baseUrl = getApiBaseUrl();
  const url = baseUrl + endpoint;

  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
};

/**
 * Creates a hash for an answer combination using SHA-256
 */
export async function hashCombination(combination: string[]): Promise<string> {
  const normalized = combination.map((s) => s.toLowerCase().trim()).join('|');
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Checks if a combination is valid by hashing it and checking against the solution hash map
 */
export async function isValidCombination(
  combination: string[],
  solutionHash: Record<string, boolean>
): Promise<boolean> {
  const hash = await hashCombination(combination);
  return solutionHash[hash] === true;
}

/**
 * Tries to find a valid position for a suggested answer by testing all possible combinations
 * Returns the position (1-indexed) if valid, or null if no valid position found
 */
export async function findValidAnswerPosition(
  suggestion: string,
  currentAnswers: string[], // Current state with empty strings for unfilled positions
  solutionHash: Record<string, boolean>
): Promise<number | null> {
  // Find all empty positions (represented by empty strings)
  const emptyPositions: number[] = [];
  for (let i = 0; i < currentAnswers.length; i++) {
    if (currentAnswers[i] === '') {
      emptyPositions.push(i);
    }
  }

  // Try placing the suggestion in each empty position
  for (const position of emptyPositions) {
    const testCombination = [...currentAnswers];
    testCombination[position] = suggestion;

    console.log(`🔍 Testing combination: [${testCombination.join(', ')}]`);

    if (await isValidCombination(testCombination, solutionHash)) {
      console.log(`✅ Valid combination found at position ${position + 1}`);
      return position + 1; // Return 1-indexed position
    }
  }

  console.log(`❌ No valid position found for "${suggestion}"`);
  return null;
}
