const isDevelopment = () => process.env.LOCAL_MODE === 'true';

/**
 * Generates all valid combinations of a solution array with empty slots allowed.
 * For solution ["A", "B", "C"], this generates:
 * - ["A", "B", "C"] (full solution)
 * - ["A", "B", ""]  (missing last)
 * - ["A", "", "C"]  (missing middle)
 * - ["", "B", "C"]  (missing first)
 * - etc.
 */
export function generateSolutionCombinations(solution: string[]): string[][] {
  const combinations: string[][] = [];

  // Generate all subsets of positions to fill (from 1 to solution.length)
  for (let mask = 1; mask < 1 << solution.length; mask++) {
    const combination = solution.map((answer, index) => {
      return (mask & (1 << index)) !== 0 ? answer : '';
    });
    combinations.push(combination);
  }

  return combinations;
}

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
 * Generates a map of hashes for all valid solution combinations
 */
export async function generateSolutionHashMap(
  solution: string[]
): Promise<Record<string, boolean>> {
  const combinations = generateSolutionCombinations(solution);
  const hashMap: Record<string, boolean> = {};

  for (const combination of combinations) {
    const hash = await hashCombination(combination);
    hashMap[hash] = true;
  }

  return hashMap;
}

export { isDevelopment };
