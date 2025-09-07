#!/usr/bin/env tsx

import { generateMockGame } from '../src/server/lib/lettered-game-generator';
import { createClient } from '@supabase/supabase-js';

// Game categories and phrases for seeding
const GAME_DATA = [
  {
    category: 'Blockbuster Films',
    phrases: [
      'THE MATRIX REVOLUTIONS',
      'STAR WARS A NEW HOPE',
      'HARRY POTTER AND THE SORCERERS STONE',
      'LORD OF THE RINGS FELLOWSHIP OF THE RING',
      'PIRATES OF THE CARIBBEAN',
      'THE DARK KNIGHT RISES',
      'AVENGERS ENDGAME MARVEL MOVIE',
      'JURASSIC PARK DINOSAUR ADVENTURE',
      'BACK TO THE FUTURE TIME TRAVEL MOVIE',
      'THE GODFATHER CLASSIC CRIME DRAMA',
      'FAST AND FURIOUS STREET RACING MOVIE',
      'MISSION IMPOSSIBLE ROGUE NATION',
      'INDIANA JONES RAIDERS OF THE LOST ARK',
      'JAMES BOND CASINO ROYALE',
    ],
  },
  {
    category: 'Classic Literature',
    phrases: [
      'TO KILL A MOCKINGBIRD',
      'THE GREAT GATSBY AMERICAN NOVEL',
      'PRIDE AND PREJUDICE',
      'THE CATCHER IN THE RYE',
      'LORD OF THE FLIES CLASSIC NOVEL',
      'BRAVE NEW WORLD DISTOPIAN NOVEL',
      'THE HOBBIT FANTASY ADVENTURE',
      'THE LITTLE PRINCE',
      'ALICE IN WONDERLAND',
      'THE CHRONICLES OF NARNIA',
      'MOBY DICK WHALING ADVENTURE',
      'WAR AND PEACE HISTORICAL EPIC',
      'JANE EYRE GOTHIC ROMANCE NOVEL',
    ],
  },
  {
    category: 'Musical Legends',
    phrases: [
      'HEY JUDE BEATLES CLASSIC SONG',
      'BILLIE JEAN MICHAEL JACKSON HIT',
      'BOHEMIAN RHAPSODY',
      'COMFORTABLY NUMB PINK FLOYD SONG',
      'BLOWIN IN THE WIND BOB DYLAN FOLK',
      'STAIRWAY TO HEAVEN',
      'LIKE A VIRGIN MADONNA POP SONG',
      'JAILHOUSE ROCK ELVIS PRESLEY HIT',
      'SPACE ODDITY DAVID BOWIE CLASSIC',
      'SMELLS LIKE TEEN SPIRIT',
      'SATISFACTION ROLLING STONES HIT',
      'THUNDERSTRUCK AC DC ROCK ANTHEM',
    ],
  },
  {
    category: 'Championship Moments',
    phrases: [
      'SUPER BOWL CHAMPIONSHIP WIN',
      'WORLD CUP SOCCER VICTORY',
      'OLYMPIC GAMES GOLD MEDAL',
      'NBA BASKETBALL CHAMPIONSHIP',
      'WORLD CUP SOCCER FINAL',
      'GRAND SLAM TENNIS TITLE',
      'FORMULA ONE CHECKERED FLAG',
      'NFL FOOTBALL PLAYOFFS',
      'BASKETBALL CHAMPIONS',
      'OLYMPIC WORLD RECORD SWIM',
      'NHL STANLEY CUP CHAMPIONSHIP',
      'COLLEGE BASKETBALL MARCH MADNESS',
    ],
  },
  {
    category: 'Food and Drinks',
    phrases: [
      'PEANUT BUTTER AND JELLY',
      'CHOCOLATE CHIP COOKIES',
      'NEW YORK STYLE CHEESE PIZZA',
      'FRENCH ONION SOUP WITH CHEESE',
      'CALIFORNIA ROLL SUSHI DINNER',
      'BELGIAN WAFFLES WITH SYRUP',
      'TEXAS STYLE BARBECUE BRISKET',
      'SPAGHETTI CARBONARA',
      'MEXICAN FISH TACOS WITH SLAW',
      'THAI PAD THAI NOODLE DISH',
      'STARBUCKS VANILLA LATTE COFFEE',
      'COCA COLA CLASSIC SOFT DRINK',
      'VANILLA ICE CREAM SUNDAE',
    ],
  },
  {
    category: 'Great Ending to a Game',
    phrases: [
      'WALK OFF GRAND SLAM HOME RUN',
      'GAME WINNING TOUCHDOWN PASS',
      'BUZZER BEATER SHOT FOR WIN',
      'OVERTIME VICTORY IN PLAYOFFS',
      'PENALTY KICK GOAL FOR TITLE',
      'SUDDEN DEATH OVERTIME PERIOD',
    ],
  },
  {
    category: 'Popular TV Shows',
    phrases: [
      'GAME OF THRONES FANTASY EPIC',
      'BREAKING BAD METH COOKING DRAMA',
      'THE OFFICE WORKPLACE COMEDY SHOW',
      'FRIENDS SITUATION COMEDY SERIES',
      'STRANGER THINGS HORROR MYSTERY',
      'THE MANDALORIAN STAR WARS SPINOFF',
      'HOUSE OF CARDS POLITICAL THRILLER',
      'LOST PLANE CRASH MYSTERY SHOW',
      'THE WALKING DEAD ZOMBIE APOCALYPSE',
      'SATURDAY NIGHT LIVE',
      'THE SIMPSONS ANIMATED FAMILY SHOW',
      'SEINFELD ABOUT NOTHING COMEDY',
    ],
  },
  {
    category: 'Famous People',
    phrases: [
      'ALBERT EINSTEIN PHYSICS GENIUS',
      'ABRAHAM LINCOLN AMERICAN PRESIDENT',
      'LEONARDO DA VINCI RENAISSANCE ARTIST',
      'MARTIN LUTHER KING CIVIL RIGHTS LEADER',
      'WINSTON CHURCHILL BRITISH PRIME MINISTER',
      'NELSON MANDELA SOUTH AFRICAN LEADER',
      'STEVE JOBS APPLE COMPUTER FOUNDER',
      'BILL GATES MICROSOFT BILLIONAIRE',
      'OPRAH WINFREY TALK SHOW HOST',
      'TIGER WOODS PROFESSIONAL GOLFER',
      'MICHAEL JORDAN BASKETBALL LEGEND',
      'SERENA WILLIAMS TENNIS CHAMPION',
    ],
  },
  {
    category: 'World Landmarks',
    phrases: [
      'EIFFEL TOWER PARIS FRANCE ICON',
      'STATUE OF LIBERTY NEW YORK HARBOR',
      'GREAT WALL OF CHINA ANCIENT FORTRESS',
      'PYRAMIDS OF GIZA EGYPTIAN WONDERS',
      'MACHU PICCHU PERUVIAN RUINS',
      'COLOSSEUM ROME ANCIENT ARENA',
      'TAJ MAHAL INDIA MAUSOLEUM',
      'MOUNT EVEREST WORLD HIGHEST PEAK',
      'NIAGARA FALLS CANADA WATERFALL',
      'GOLDEN GATE BRIDGE SAN FRANCISCO',
      'BIG BEN LONDON CLOCK TOWER',
      'SYDNEY OPERA HOUSE AUSTRALIA ICON',
    ],
  },
  {
    category: 'Video Games',
    phrases: [
      'SUPER MARIO BROS NINTENDO CLASSIC',
      'THE LEGEND OF ZELDA ADVENTURE GAME',
      'MINECRAFT BUILDING SURVIVAL GAME',
      'GRAND THEFT AUTO ACTION ADVENTURE',
      'CALL OF DUTY FIRST PERSON SHOOTER',
      'WORLD OF WARCRAFT MASSIVE ONLINE RPG',
      'POKEMON GOTTA CATCH THEM ALL',
      'FORTNITE BATTLE ROYALE GAME',
      'TETRIS CLASSIC PUZZLE VIDEO GAME',
      'PAC MAN ARCADE CLASSIC GAME',
      'STREET FIGHTER FIGHTING VIDEO GAME',
      'FINAL FANTASY JAPANESE RPG SERIES',
    ],
  },
  {
    category: 'Pop Culture Icons',
    phrases: [
      'SHAKE IT OFF TAYLOR SWIFT SONG',
      'STARTED FROM THE BOTTOM',
      'SINGLE LADIES BEYONCE MUSIC VIDEO',
      'THANK U NEXT ARIANA GRANDE ALBUM',
      'BAD GUY BILLIE EILISH POP SONG',
      'BLINDING LIGHTS WEEKND HIT SONG',
      'SAY SO DOJA CAT VIRAL TIKTOK SONG',
      'DRIVERS LICENSE OLIVIA RODRIGO HIT',
      'UPTOWN FUNK MARK RONSON BRUNO MARS',
      'POKER FACE LADY GAGA POP ANTHEM',
      'BABY JUSTIN BIEBER DEBUT SINGLE',
      'UMBRELLA RIHANNA ELLA ELLA SONG',
    ],
  },
  {
    category: 'Social Media Trends',
    phrases: [
      'TIKTOK VIRAL DANCE CHALLENGES',
      'INSTAGRAM STORIES AND HIGHLIGHTS',
      'YOUTUBE SUBSCRIBE AND LIKE BUTTONS',
      'TWITTER HASHTAGS AND TRENDING TOPICS',
      'SNAPCHAT DISAPPEARING MESSAGES',
      'FACEBOOK SOCIAL NETWORKING SITE',
      'DISCORD VOICE CHAT GAMING PLATFORM',
      'REDDIT UPVOTES AND DOWNVOTES',
      'LINKEDIN PROFESSIONAL NETWORKING',
      'PINTEREST VISUAL DISCOVERY PLATFORM',
      'TWITCH LIVE STREAMING GAMING SITE',
      'CLUBHOUSE AUDIO SOCIAL NETWORKING',
    ],
  },
  {
    category: 'Internet Memes',
    phrases: [
      'DISTRACTED BOYFRIEND MEME',
      'WOMAN YELLING AT CAT DINNER',
      'THIS IS FINE BURNING DOG',
      'DRAKE POINTING MEME FORMAT',
      'SURPRISED PIKACHU FACE MEME',
      'EXPANDING BRAIN GALAXY MIND',
      'STONKS MEME MARKET PROFITS',
      'KAREN WANTS TO SPEAK MANAGER',
      'OK BOOMER GENERATIONAL HUMOR',
      'RICKROLL NEVER GONNA GIVE UP',
      'DOGE MUCH WOW VERY MEME',
      'GRUMPY CAT INTERNET FAMOUS',
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
        const gameData = generateMockGame(categoryData.category, phrase, 123);

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
            initial_piece_positions: gameData.initialPiecePositions,
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

        // If it's a word length validation error, provide helpful guidance
        if (error instanceof Error && error.message.includes('Words cannot be longer than')) {
          console.error(`     💡 Tip: Split long words or choose shorter alternatives`);
        }

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
