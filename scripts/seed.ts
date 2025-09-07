#!/usr/bin/env tsx

import { generateMockGame } from '../src/server/lib/lettered-game-generator';
import { createClient } from '@supabase/supabase-js';

// Game categories and phrases for seeding
const GAME_DATA = [
  {
    category: 'movies',
    phrases: [
      'KEANU REEVS IN THE MATRIX ',
      'STAR WARS THE CLONE WARS',
      'HARRY POTTER AND THE DEATHLY HALLOWS',
      'LORD OF THE RINGS THE RETURN OF THE KING',
      'PIRATES OF THE CARIBBEAN',
      'JOKER AND THE DARK KNIGHT RISES',
      'AVENGERS ENDGAME',
      'JURASSIC PARK',
      'BACK TO THE FUTURE',
      'THE GODFATHER',
    ],
  },
  {
    category: 'books',
    phrases: [
      'TO KILL A MOCKINGBIRD',
      'THE GREAT GATSBY',
      'PRIDE AND PREJUDICE',
      'THE CATCHER IN THE RYE',
      'LORD OF THE FLIES',
      'BRAVE NEW WORLD',
      'THE HOBBIT',
      'THE LITTLE PRINCE',
      'ALICE IN WONDERLAND',
      'THE CHRONICLES OF NARNIA',
    ],
  },
  {
    category: 'music',
    phrases: [
      'BEATLES ABBEY ROAD',
      'MICHAEL JACKSON THRILLER',
      'QUEEN BOHEMIAN RHAPSODY',
      'PINK FLOYD DARK SIDE OF THE MOON',
      'BOB DYLAN BLOWIN IN THE WIND',
      'LED ZEPPELIN STAIRWAY TO HEAVEN',
      'MADONNA LIKE A VIRGIN',
      'ELVIS PRESLEY JAILHOUSE ROCK',
      'DAVID BOWIE SPACE ODDITY',
      'NIRVANA SMELLS LIKE TEEN SPIRIT',
    ],
  },
  {
    category: 'sports',
    phrases: [
      'SUPER BOWL CHAMPIONS',
      'WORLD CUP WINNERS',
      'OLYMPIC GAMES',
      'NBA CHAMPIONSHIP',
      'SOCCER WORLD CUP',
      'TENNIS GRAND SLAM',
      'FORMULA ONE RACING',
      'NFL FOOTBALL',
      'BASKETBALL NBA',
      'SWIMMING OLYMPICS',
    ],
  },
  {
    category: 'food',
    phrases: [
      'PEANUT BUTTER SANDWICH',
      'CHOCOLATE CHIP COOKIES',
      'NEW YORK STYLE PIZZA',
      'FRENCH ONION SOUP',
      'CALIFORNIA ROLL SUSHI',
      'BELGIAN WAFFLES',
      'TEXAS BARBECUE',
      'ITALIAN PASTA CARBONARA',
      'MEXICAN TACOS AL PASTOR',
      'THAI PAD THAI',
    ],
  },
];

async function seedLetteredGames() {
  console.log('🚀 Starting lettered games seeding process...');

  // Initialize Supabase client (same config as server)
  const supabaseUrl = 'http://127.0.0.1:54321';
  const supabaseServiceKey =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  console.log('📊 Connected to Supabase');

  let totalGames = 0;
  let successCount = 0;
  let errorCount = 0;

  // Generate and insert games
  for (const categoryData of GAME_DATA) {
    console.log(`\n📂 Processing category: ${categoryData.category}`);

    for (const phrase of categoryData.phrases) {
      totalGames++;

      try {
        console.log(`  🎮 Generating game for: "${phrase}"`);

        // Generate the game using the utilities
        const gameData = generateMockGame(categoryData.category, phrase);

        // Insert into database
        const { data, error } = await supabase
          .from('lettered_games')
          .insert({
            category: gameData.category,
            phrase: gameData.phrase,
            grid: gameData.grid,
            rows: gameData.rows,
            cols: gameData.cols,
            pieces: gameData.pieces,
            solution: gameData.solution,
            solution_hash: gameData.solutionHash,
          })
          .select()
          .single();

        if (error) {
          console.error(`  ❌ Failed to insert game for "${phrase}":`, error.message);
          errorCount++;
        } else {
          console.log(`  ✅ Successfully inserted game: ${data.id}`);
          successCount++;
        }
      } catch (error) {
        console.error(`  ❌ Error generating game for "${phrase}":`, error);
        errorCount++;
      }
    }
  }

  console.log('\n📈 Seeding Summary:');
  console.log(`   Total games processed: ${totalGames}`);
  console.log(`   Successfully inserted: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log(
      '\n⚠️  Some games failed to generate. This is normal due to the complexity of the lettered game generation algorithm.'
    );
    console.log('   Failed games may need manual review or different phrases.');
  }

  console.log('\n🎉 Lettered games seeding completed!');
}

// Run the seeding process
seedLetteredGames().catch((error) => {
  console.error('💥 Fatal error during seeding:', error);
  process.exit(1);
});
