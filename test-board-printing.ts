import { generateMockGame, printBoard } from './src/server/lib/lettered-game-generator';

// Test the board printing functionality
console.log('Testing board printing with various phrases...\n');

const testPhrases = ['BREAK A LEG OUT THERE'];

for (const phrase of testPhrases) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing phrase: "${phrase}"`);
    console.log(`${'='.repeat(60)}\n`);

    const gameData = generateMockGame('test', phrase, 123); // Use a fixed seed for reproducible results

    // Print the board
    printBoard(gameData.grid, `Board - "${phrase}"`);

    // Print piece information
    console.log(`\nGenerated ${gameData.pieces.length} pieces:`);
    gameData.pieces.forEach((piece, i) => {
      console.log(`  Piece ${i + 1}: "${piece.letters.join('')}" (${piece.shape.length} letters)`);
    });
  } catch (error) {
    console.error(`Error with phrase "${phrase}":`, error);
  }
}
