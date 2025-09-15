#!/usr/bin/env tsx

import { generateMockGame } from '../src/server/lib/lettered-game-generator';
import { supabase } from '../src/shared/supabase-server';
import { generateSolutionHashMap } from '../src/shared/utils';

// Game categories and phrases for seeding
const GAME_DATA = [
  {
    category: 'Blockbuster Films',
    phrases: [
      'SPIDER MAN NO WAY HOME',
      'AVATAR THE WAY OF WATER',
      'TOP GUN MAVERICK',
      'BLACK PANTHER WAKANDA FOREVER',
      'THE BATMAN DARK KNIGHT',
      'DUNE PART TWO EPIC',
      'GUARDIANS OF THE GALAXY VOL THREE',
      'FAST X FAMILY SAGA',
      'SCREAM SIX HORROR SEQUEL',
      'JOHN WICK CHAPTER FOUR',
      'MISSION IMPOSSIBLE DEAD RECKONING',
      'OPPENHEIMER HISTORICAL DRAMA',
      'BARBIE PINK COMEDY MOVIE',
      'INDIANA JONES DIAL OF DESTINY',
    ],
  },
  {
    category: 'Classic Literature',
    phrases: [
      'WHERE THE CRAWDADS SING',
      'THE SEVEN HUSBANDS OF EVELYN HUGO',
      'EDUCATED TARA WESTOVER MEMOIR',
      'ATOMIC HABITS JAMES CLEAR',
      'THE MIDNIGHT LIBRARY MATT HAIG',
      'KLARA AND THE SUN KAZUO ISHIGURO',
      'THE INVISIBLE BRIDGE JULIE ORRINGER',
      'HAMNET MAGGIE O FARRELL NOVEL',
      'THE VANISHING HALF BRIT BENNETT',
      'CIRCE MADELINE MILLER MYTHOLOGY',
      'NORMAL PEOPLE SALLY ROONEY',
      'THE SILENT PATIENT ALEX MICHAELIDES',
      'IT ENDS WITH US COLLEEN HOOVER',
    ],
  },
  {
    category: 'Famous Catchphrases',
    phrases: [
      'MAY THE FORCE BE WITH YOU',
      'I WILL BE BACK TERMINATOR',
      'SHOW ME THE MONEY JERRY MAGUIRE',
      'JUST KEEP SWIMMING FINDING NEMO',
      'WINTER IS COMING GAME OF THRONES',
      'TO INFINITY AND BEYOND BUZZ',
      'HASTA LA VISTA BABY ARNOLD',
      'NOBODY PUTS BABY IN A CORNER',
      'I AM IRON MAN TONY STARK',
      'WAKANDA FOREVER BLACK PANTHER',
      'GREAT SCOTT BACK TO FUTURE',
      'THAT IS WHAT SHE SAID OFFICE',
    ],
  },
  {
    category: 'Fast Food Items',
    phrases: [
      'MCDONALDS BIG MAC',
      'BURGER KING WHOPPER',
      'WENDYS BACONATOR',
      'TACO BELL CRUNCHWRAP SUPREME',
      'POPEYES SPICY CHICKEN SANDWICH',
      'FIVE GUYS BACON CHEESEBURGER',
      'IN N OUT ANIMAL STYLE',
      'CHICK FIL A DELUXE SANDWICH',
      'KFC ORIGINAL RECIPE',
      'SUBWAY ITALIAN BMT',
      'PIZZA HUT STUFFED CRUST',
      'DOMINOS PEPPERONI PIZZA',
      'DUNKIN ICED COFFEE',
    ],
  },
  {
    category: 'Video Game Titles',
    phrases: [
      'ELDEN RING',
      'TEARS OF THE KINGDOM',
      'GOD OF WAR RAGNAROK',
      'HOGWARTS LEGACY',
      'BALDURS GATE THREE',
      'SPIDER MAN MILES MORALES',
      'HORIZON FORBIDDEN WEST',
      'HALO INFINITE',
      'RESIDENT EVIL FOUR',
      'CYBERPUNK TWENTY SEVENTY SEVEN',
      'GENSHIN IMPACT',
      'VALORANT',
      'FALL GUYS',
    ],
  },
  {
    category: 'Netflix Original Shows',
    phrases: [
      'WEDNESDAY',
      'STRANGER THINGS',
      'SQUID GAME',
      'BRIDGERTON',
      'THE CROWN',
      'OZARK',
      'UMBRELLA ACADEMY',
      'COBRA KAI',
      'THE WITCHER',
      'ORANGE IS THE NEW BLACK',
      'HOUSE OF CARDS',
      'NARCOS',
      'DARK',
    ],
  },
  {
    category: 'Disney Movies',
    phrases: [
      'FROZEN',
      'MOANA',
      'ENCANTO',
      'TOY STORY',
      'THE LION KING',
      'FINDING NEMO',
      'THE INCREDIBLES',
      'COCO',
      'INSIDE OUT',
      'ZOOTOPIA',
      'BIG HERO SIX',
      'WRECK IT RALPH',
      'TANGLED',
    ],
  },
  {
    category: 'Pop Music Hits',
    phrases: [
      'AS IT WAS',
      'ANTI HERO',
      'FLOWERS',
      'UNHOLY',
      'CALM DOWN',
      'SHIVERS',
      'HEAT WAVES',
      'STAY',
      'GOOD FOUR U',
      'MONTERO',
      'PEACHES',
      'LEVITATING',
      'BLINDING LIGHTS',
    ],
  },
  {
    category: 'World Events',
    phrases: [
      'QATAR WORLD CUP',
      'TOKYO OLYMPICS',
      'JAMES WEBB TELESCOPE',
      'QUEEN ELIZABETH JUBILEE',
      'BITCOIN BOOM',
      'SPACEX MARS MISSION',
      'CLIMATE SUMMIT',
      'CHATGPT LAUNCH',
      'ELECTRIC VEHICLE BOOM',
      'SOLAR ENERGY GROWTH',
      'METAVERSE HYPE',
      'TIKTOK TAKEOVER',
    ],
  },
  {
    category: 'Technology Products',
    phrases: [
      'IPHONE FOURTEEN PRO',
      'SAMSUNG GALAXY',
      'TESLA MODEL S',
      'NINTENDO SWITCH',
      'PLAYSTATION FIVE',
      'XBOX SERIES X',
      'MACBOOK PRO',
      'AIRPODS PRO',
      'GOOGLE PIXEL',
      'META QUEST',
      'AMAZON ALEXA',
      'APPLE WATCH',
      'ZOOM MEETINGS',
    ],
  },
  {
    category: 'Social Media Apps',
    phrases: [
      'TIKTOK',
      'INSTAGRAM',
      'SNAPCHAT',
      'YOUTUBE',
      'TWITTER',
      'FACEBOOK',
      'DISCORD',
      'REDDIT',
      'LINKEDIN',
      'PINTEREST',
      'TWITCH',
      'CLUBHOUSE',
      'BEREAL',
    ],
  },
  {
    category: 'Famous Landmarks',
    phrases: [
      'BURJ KHALIFA',
      'TIMES SQUARE',
      'HOLLYWOOD SIGN',
      'GOLDEN GATE BRIDGE',
      'MOUNT RUSHMORE',
      'SPACE NEEDLE',
      'STATUE OF LIBERTY',
      'GRAND CANYON',
      'YELLOWSTONE PARK',
      'NIAGARA FALLS',
      'BROOKLYN BRIDGE',
      'EMPIRE STATE BUILDING',
      'WASHINGTON MONUMENT',
    ],
  },
];

// Utility function to shuffle an array
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// TopX game data for seeding
const TOPX_GAME_DATA = [
  {
    prompt: 'Name the top 5 most popular programming languages in 2024',
    suggestions: [
      'JavaScript',
      'Python',
      'TypeScript',
      'Java',
      'C++',
      'C#',
      'PHP',
      'Go',
      'Rust',
      'Swift',
      'Kotlin',
      'Dart',
      'Ruby',
      'Scala',
      'R',
      'Julia',
      'Perl',
      'Haskell',
    ],
    category: 'programming languages',
    count: 5,
    maxAttempts: 4,
    solution: ['JavaScript', 'Python', 'TypeScript', 'Java', 'C#'],
  },
  {
    prompt: 'Name the top 4 most popular social media platforms in 2024',
    suggestions: [
      'YouTube',
      'WhatsApp',
      'Instagram',
      'Facebook',
      'TikTok',
      'WeChat',
      'Telegram',
      'Snapchat',
      'Twitter',
      'LinkedIn',
      'Pinterest',
      'Reddit',
      'Discord',
      'BeReal',
      'Threads',
    ],
    category: 'social media platforms',
    count: 4,
    maxAttempts: 4,
    solution: ['YouTube', 'WhatsApp', 'Instagram', 'Facebook'],
  },
  {
    prompt: 'Name the top 3 most visited tourist destinations in 2024',
    suggestions: [
      'Paris',
      'London',
      'Dubai',
      'Bangkok',
      'Singapore',
      'New York City',
      'Istanbul',
      'Tokyo',
      'Antalya',
      'Rome',
      'Miami',
      'Barcelona',
      'Amsterdam',
      'Las Vegas',
      'Prague',
      'Vienna',
      'Los Angeles',
      'Madrid',
      'Berlin',
      'Athens',
    ],
    category: 'tourist destinations',
    count: 3,
    maxAttempts: 4,
    solution: ['Paris', 'London', 'Dubai'],
  },
  {
    prompt: 'Name the top 4 most popular pizza toppings in America',
    suggestions: [
      'Pepperoni',
      'Sausage',
      'Mushrooms',
      'Extra Cheese',
      'Peppers',
      'Onions',
      'Black Olives',
      'Ham',
      'Pineapple',
      'Bacon',
      'Ground Beef',
      'Spinach',
      'Tomatoes',
      'Chicken',
      'Jalapeños',
      'Garlic',
      'Basil',
      'Anchovies',
    ],
    category: 'food',
    count: 4,
    maxAttempts: 4,
    solution: ['Pepperoni', 'Sausage', 'Mushrooms', 'Extra Cheese'],
  },
  {
    prompt: 'Name the top 5 most streamed artists on Spotify in 2024',
    suggestions: [
      'Taylor Swift',
      'Bad Bunny',
      'The Weeknd',
      'Drake',
      'Peso Pluma',
      'Feid',
      'Travis Scott',
      'Lana Del Rey',
      'Billie Eilish',
      'Ariana Grande',
      'Ed Sheeran',
      'Post Malone',
      'Dua Lipa',
      'Olivia Rodrigo',
      'Harry Styles',
      'Justin Bieber',
    ],
    category: 'music artists',
    count: 5,
    maxAttempts: 4,
    solution: ['Taylor Swift', 'Bad Bunny', 'The Weeknd', 'Drake', 'Peso Pluma'],
  },
  {
    prompt: 'Name the top 3 most popular dog breeds in America in 2024',
    suggestions: [
      'French Bulldog',
      'Labrador Retriever',
      'Golden Retriever',
      'German Shepherd',
      'Poodle',
      'Bulldog',
      'Rottweiler',
      'Beagle',
      'Dachshund',
      'German Shorthaired Pointer',
      'Yorkshire Terrier',
      'Siberian Husky',
      'Boxer',
      'Boston Terrier',
      'Cocker Spaniel',
      'Border Collie',
    ],
    category: 'dog breeds',
    count: 3,
    maxAttempts: 4,
    solution: ['French Bulldog', 'Labrador Retriever', 'Golden Retriever'],
  },
  {
    prompt: 'Name the top 4 largest tech companies by market cap in 2024',
    suggestions: [
      'Microsoft',
      'Apple',
      'NVIDIA',
      'Alphabet',
      'Amazon',
      'Meta',
      'Tesla',
      'Berkshire Hathaway',
      'Taiwan Semiconductor',
      'Samsung',
      'ASML',
      'Oracle',
      'Salesforce',
      'Adobe',
      'Netflix',
      'PayPal',
      'Intel',
      'Cisco',
    ],
    category: 'tech companies',
    count: 4,
    maxAttempts: 4,
    solution: ['Microsoft', 'Apple', 'NVIDIA', 'Alphabet'],
  },
  {
    prompt: 'Name the top 5 most popular video game consoles in 2024',
    suggestions: [
      'PlayStation 5',
      'Xbox Series X',
      'Nintendo Switch',
      'PlayStation 4',
      'Xbox Series S',
      'Steam Deck',
      'Nintendo Switch OLED',
      'PlayStation 2',
      'Xbox One',
      'Nintendo DS',
      'PlayStation 3',
      'Xbox 360',
      'Nintendo Wii',
      'Game Boy',
      'Super Nintendo',
      'Nintendo Entertainment System',
    ],
    category: 'gaming consoles',
    count: 5,
    maxAttempts: 4,
    solution: [
      'PlayStation 5',
      'Xbox Series X',
      'Nintendo Switch',
      'PlayStation 4',
      'Xbox Series S',
    ],
  },
  {
    prompt: 'Name the top 3 most spoken languages in the world',
    suggestions: [
      'Mandarin Chinese',
      'English',
      'Hindi',
      'Spanish',
      'French',
      'Standard Arabic',
      'Bengali',
      'Russian',
      'Portuguese',
      'Indonesian',
      'Urdu',
      'German',
      'Japanese',
      'Swahili',
      'Marathi',
      'Telugu',
      'Turkish',
      'Korean',
    ],
    category: 'languages',
    count: 3,
    maxAttempts: 4,
    solution: ['Mandarin Chinese', 'English', 'Hindi'],
  },
  {
    prompt: 'Name the top 4 most popular ice cream flavors in America',
    suggestions: [
      'Vanilla',
      'Chocolate',
      'Cookies and Cream',
      'Mint Chocolate Chip',
      'Strawberry',
      'Cookie Dough',
      'Rocky Road',
      'Butter Pecan',
      'Neapolitan',
      'Chocolate Chip',
      'Pistachio',
      'Caramel',
      'Coffee',
      'Rum Raisin',
      'Sherbet',
      'Birthday Cake',
    ],
    category: 'ice cream flavors',
    count: 4,
    maxAttempts: 4,
    solution: ['Vanilla', 'Chocolate', 'Cookies and Cream', 'Mint Chocolate Chip'],
  },
  {
    prompt: 'Name the top 3 most popular sports worldwide',
    suggestions: [
      'Soccer',
      'Cricket',
      'Basketball',
      'Field Hockey',
      'Tennis',
      'Volleyball',
      'Table Tennis',
      'Baseball',
      'Golf',
      'American Football',
      'Boxing',
      'Rugby',
      'Swimming',
      'Badminton',
      'Athletics',
      'Wrestling',
    ],
    category: 'sports',
    count: 3,
    maxAttempts: 4,
    solution: ['Soccer', 'Cricket', 'Basketball'],
  },
  {
    prompt: 'Name the top 5 most popular Netflix shows in 2024',
    suggestions: [
      'Wednesday',
      'Stranger Things',
      'Bridgerton',
      'The Night Agent',
      'Ginny and Georgia',
      'You',
      'The Diplomat',
      'Queen Charlotte',
      'Outer Banks',
      'The Crown',
      'Ozark',
      'The Witcher',
      'Squid Game',
      'Money Heist',
      'Emily in Paris',
      'Tiger King',
    ],
    category: 'Netflix shows',
    count: 5,
    maxAttempts: 4,
    solution: [
      'Wednesday',
      'Stranger Things',
      'Bridgerton',
      'The Night Agent',
      'Ginny and Georgia',
    ],
  },
  {
    prompt: 'Name the top 3 most valuable cryptocurrencies in 2024',
    suggestions: [
      'Bitcoin',
      'Ethereum',
      'Tether',
      'BNB',
      'Solana',
      'XRP',
      'USDC',
      'Cardano',
      'Dogecoin',
      'Avalanche',
      'Polygon',
      'Chainlink',
      'Litecoin',
      'Shiba Inu',
      'Bitcoin Cash',
      'Uniswap',
      'Cosmos',
      'Algorand',
    ],
    category: 'cryptocurrencies',
    count: 3,
    maxAttempts: 4,
    solution: ['Bitcoin', 'Ethereum', 'Tether'],
  },
  {
    prompt: 'Name the top 4 most popular fast food chains in America',
    suggestions: [
      'McDonalds',
      'Starbucks',
      'Chick-fil-A',
      'Taco Bell',
      'Burger King',
      'Subway',
      'Wendys',
      'Dunkin',
      'Pizza Hut',
      'KFC',
      'Dominos',
      'Chipotle',
      'Sonic',
      'Arbys',
      'Dairy Queen',
      'Papa Johns',
    ],
    category: 'fast food chains',
    count: 4,
    maxAttempts: 4,
    solution: ['McDonalds', 'Starbucks', 'Chick-fil-A', 'Taco Bell'],
  },
  {
    prompt: 'Name the top 3 largest oceans in the world',
    suggestions: [
      'Pacific Ocean',
      'Atlantic Ocean',
      'Indian Ocean',
      'Southern Ocean',
      'Arctic Ocean',
      'Mediterranean Sea',
      'Caribbean Sea',
      'South China Sea',
      'Bering Sea',
      'Gulf of Mexico',
      'Sea of Okhotsk',
      'East China Sea',
    ],
    category: 'oceans',
    count: 3,
    maxAttempts: 4,
    solution: ['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean'],
  },
  {
    prompt: 'Name the top 5 best-selling car brands worldwide in 2024',
    suggestions: [
      'Toyota',
      'BYD',
      'Volkswagen',
      'Ford',
      'Honda',
      'Nissan',
      'Chevrolet',
      'Hyundai',
      'Kia',
      'Mercedes-Benz',
      'BMW',
      'Tesla',
      'Audi',
      'Mazda',
      'Subaru',
      'Lexus',
      'Jeep',
      'Volvo',
    ],
    category: 'car brands',
    count: 5,
    maxAttempts: 4,
    solution: ['Toyota', 'BYD', 'Volkswagen', 'Ford', 'Honda'],
  },
  {
    prompt: 'Name the top 3 highest-grossing superhero movies of all time',
    suggestions: [
      'Avengers Endgame',
      'Spider-Man No Way Home',
      'Avengers Infinity War',
      'Avengers Age of Ultron',
      'Black Panther',
      'Avengers',
      'Iron Man 3',
      'Captain America Civil War',
      'Aquaman',
      'Captain Marvel',
      'Transformers Dark Moon',
      'The Dark Knight Rises',
      'Joker',
      'Spider-Man Far From Home',
      'The Dark Knight',
      'Wonder Woman',
    ],
    category: 'superhero movies',
    count: 3,
    maxAttempts: 4,
    solution: ['Avengers Endgame', 'Spider-Man No Way Home', 'Avengers Infinity War'],
  },
  {
    prompt: 'Name the top 4 most popular coffee drinks worldwide',
    suggestions: [
      'Latte',
      'Cappuccino',
      'Americano',
      'Espresso',
      'Flat White',
      'Macchiato',
      'Mocha',
      'Cold Brew',
      'Iced Coffee',
      'Frappuccino',
      'Cortado',
      'Turkish Coffee',
      'French Press',
      'Pour Over',
      'Affogato',
      'Red Eye',
    ],
    category: 'coffee drinks',
    count: 4,
    maxAttempts: 4,
    solution: ['Latte', 'Cappuccino', 'Americano', 'Espresso'],
  },
  {
    prompt: 'Name the top 5 most popular streaming platforms in 2024',
    suggestions: [
      'Netflix',
      'YouTube',
      'Amazon Prime Video',
      'Disney Plus',
      'Hulu',
      'HBO Max',
      'Apple TV Plus',
      'Paramount Plus',
      'Peacock',
      'Tubi',
      'Crunchyroll',
      'ESPN Plus',
      'Discovery Plus',
      'Starz',
      'Showtime',
      'Pluto TV',
      'Roku Channel',
      'Vudu',
    ],
    category: 'streaming platforms',
    count: 5,
    maxAttempts: 4,
    solution: ['Netflix', 'YouTube', 'Amazon Prime Video', 'Disney Plus', 'Hulu'],
  },
  {
    prompt: 'Name the top 3 most popular mobile games in 2024',
    suggestions: [
      'Candy Crush Saga',
      'Pokemon GO',
      'Roblox',
      'Coin Master',
      'Garena Free Fire',
      'Among Us',
      'Clash of Clans',
      'Clash Royale',
      'Subway Surfers',
      'PUBG Mobile',
      'Genshin Impact',
      'Call of Duty Mobile',
      'Minecraft',
      'Fortnite',
      'Brawl Stars',
      'Royal Match',
      'Monopoly GO',
      'Wordle',
    ],
    category: 'mobile games',
    count: 3,
    maxAttempts: 4,
    solution: ['Candy Crush Saga', 'Pokemon GO', 'Roblox'],
  },
];

async function seedLetteredGames() {
  console.log('🚀 Starting lettered games seeding process...');

  console.log('📊 Connected to Supabase');

  let totalGames = 0;
  let successCount = 0;
  let errorCount = 0;

  // Shuffle the categories for randomized order
  const shuffledCategories = shuffleArray(GAME_DATA);

  // Generate and insert games
  for (const categoryData of shuffledCategories) {
    console.log(`\n📂 Processing category: ${categoryData.category}`);

    // Shuffle phrases within each category for randomized order
    const shuffledPhrases = shuffleArray(categoryData.phrases);

    for (const phrase of shuffledPhrases) {
      totalGames++;

      try {
        console.log(`  🎮 Generating game for: "${phrase}"`);

        // Generate the game using the utilities
        const gameData = generateMockGame(
          categoryData.category,
          phrase,
          Math.floor(Math.random() * 1000000)
        );

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
            solution: gameData.solution || {},
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

async function seedTopXGames() {
  console.log('🚀 Starting TopX games seeding process...');

  console.log('📊 Connected to Supabase');

  let totalGames = 0;
  let successCount = 0;
  let errorCount = 0;

  // Shuffle the TopX games for randomized order
  const shuffledTopXGames = shuffleArray(TOPX_GAME_DATA);

  // Generate and insert games
  for (const gameData of shuffledTopXGames) {
    totalGames++;

    try {
      console.log(`  🎮 Generating game for: "${gameData.prompt}"`);

      // Shuffle suggestions for randomized order
      const shuffledSuggestions = shuffleArray(gameData.suggestions);

      // Generate solution hash map for secure validation
      const solutionHash = await generateSolutionHashMap(gameData.solution);

      // Insert into database
      const { data, error } = await supabase
        .from('topx_games')
        .insert({
          prompt: gameData.prompt,
          solution: gameData.solution,
          category: gameData.category,
          count: gameData.count,
          max_attempts: gameData.maxAttempts,
          suggestions: shuffledSuggestions,
          solution_hash: solutionHash,
        })
        .select()
        .single();

      if (error) {
        console.error(`  ❌ Failed to insert TopX game for "${gameData.prompt}":`, error.message);
        errorCount++;
      } else {
        console.log(`  ✅ Successfully inserted TopX game: ${data.id}`);
        successCount++;
      }
    } catch (error) {
      console.error(`  ❌ Error generating TopX game for "${gameData.prompt}":`, error);
      errorCount++;
    }
  }

  console.log('\n📈 TopX Games Seeding Summary:');
  console.log(`   Total games processed: ${totalGames}`);
  console.log(`   Successfully inserted: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);

  console.log('\n🎉 TopX games seeding completed!');
}

// Run the seeding process
async function runSeeding() {
  try {
    console.log('🌱 Starting complete seeding process...\n');

    await seedLetteredGames();
    console.log('\n' + '='.repeat(50) + '\n');
    await seedTopXGames();

    console.log('\n🎉 All seeding completed successfully!');
  } catch (error) {
    console.error('💥 Fatal error during seeding:', error);
    process.exit(1);
  }
}

runSeeding();
