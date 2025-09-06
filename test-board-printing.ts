import { generateMockGame, printBoardWithPieces } from './src/server/lib/lettered-game-generator';

// Test the board printing functionality
console.log('Testing board printing with various phrases...\n');

const testPhrases = ['CHEESE', 'BOOKKEEPER', 'COMMITTEE', 'LETTER'];

for (const phrase of testPhrases) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing phrase: "${phrase}"`);
    console.log(`${'='.repeat(60)}\n`);

    const gameData = generateMockGame('test', phrase, 12345); // Use a fixed seed for reproducible results

    // Print the board with pieces overlaid
    printBoardWithPieces(gameData.grid, gameData.pieces, `Board with Pieces - "${phrase}"`);
  } catch (error) {
    console.error(`Error with phrase "${phrase}":`, error);
  }
}
