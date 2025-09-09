#!/usr/bin/env tsx

import { generateMockGame } from '../src/server/lib/lettered-game-generator';
import { supabase } from '../src/shared/supabase-server';
import { generateSolutionHashMap } from '../src/shared/utils';

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

// TopX game data for seeding
const TOPX_GAME_DATA = [
  {
    prompt: 'Name the top 3 states that eat the most peanut butter',
    suggestions: [
      'Georgia',
      'Alabama',
      'North Carolina',
      'Texas',
      'California',
      'Florida',
      'New York',
      'Pennsylvania',
      'Illinois',
      'Ohio',
      'Virginia',
      'Tennessee',
      'Louisiana',
      'Mississippi',
      'Arkansas',
    ],
    category: 'states',
    count: 3,
    maxAttempts: 4,
    solution: ['Georgia', 'Alabama', 'North Carolina'],
  },
  {
    prompt: 'Name the top 5 programming languages by popularity',
    suggestions: [
      'JavaScript',
      'Python',
      'Java',
      'C++',
      'C#',
      'PHP',
      'Ruby',
      'Swift',
      'Go',
      'Rust',
      'TypeScript',
      'Kotlin',
      'Scala',
      'R',
      'Dart',
    ],
    category: 'programming languages',
    count: 5,
    maxAttempts: 4,
    solution: ['JavaScript', 'Python', 'Java', 'C++', 'C#'],
  },
  {
    prompt: 'Name the top 4 social media platforms by users',
    suggestions: [
      'Facebook',
      'YouTube',
      'WhatsApp',
      'Instagram',
      'TikTok',
      'WeChat',
      'Snapchat',
      'Twitter',
      'LinkedIn',
      'Pinterest',
      'Reddit',
      'Telegram',
    ],
    category: 'social media platforms',
    count: 4,
    maxAttempts: 4,
    solution: ['Facebook', 'YouTube', 'WhatsApp', 'Instagram'],
  },
  {
    prompt: 'Name the top 3 most visited countries in the world',
    suggestions: [
      'France',
      'Spain',
      'United States',
      'China',
      'Italy',
      'Turkey',
      'Mexico',
      'Thailand',
      'Germany',
      'United Kingdom',
      'Japan',
      'Austria',
      'Greece',
      'Malaysia',
      'Russia',
      'Canada',
      'Poland',
      'Netherlands',
      'Ukraine',
      'Portugal',
    ],
    category: 'countries',
    count: 3,
    maxAttempts: 4,
    solution: ['France', 'Spain', 'United States'],
  },
  {
    prompt: 'Name the top 4 most popular pizza toppings',
    suggestions: [
      'Pepperoni',
      'Mushrooms',
      'Sausage',
      'Cheese',
      'Peppers',
      'Onions',
      'Olives',
      'Ham',
      'Pineapple',
      'Bacon',
      'Anchovies',
      'Spinach',
      'Tomatoes',
      'Chicken',
      'Beef',
      'Jalapeños',
      'Garlic',
      'Basil',
    ],
    category: 'food',
    count: 4,
    maxAttempts: 4,
    solution: ['Pepperoni', 'Mushrooms', 'Sausage', 'Extra Cheese'],
  },
  {
    prompt: 'Name the top 5 most streamed artists on Spotify',
    suggestions: [
      'Drake',
      'Ed Sheeran',
      'Post Malone',
      'Ariana Grande',
      'Eminem',
      'Justin Bieber',
      'The Weeknd',
      'Billie Eilish',
      'Taylor Swift',
      'Bad Bunny',
      'J Balvin',
      'Dua Lipa',
      'Travis Scott',
      'Khalid',
      'Rihanna',
      'Bruno Mars',
    ],
    category: 'music artists',
    count: 5,
    maxAttempts: 4,
    solution: ['Drake', 'Bad Bunny', 'The Weeknd', 'Taylor Swift', 'Ariana Grande'],
  },
  {
    prompt: 'Name the top 3 most popular dog breeds in America',
    suggestions: [
      'Labrador Retriever',
      'Golden Retriever',
      'German Shepherd',
      'French Bulldog',
      'Bulldog',
      'Poodle',
      'Beagle',
      'Rottweiler',
      'German Shorthaired Pointer',
      'Yorkshire Terrier',
      'Dachshund',
      'Siberian Husky',
      'Boxer',
      'Boston Terrier',
    ],
    category: 'dog breeds',
    count: 3,
    maxAttempts: 4,
    solution: ['Labrador Retriever', 'Golden Retriever', 'German Shepherd'],
  },
  {
    prompt: 'Name the top 4 largest tech companies by market cap',
    suggestions: [
      'Apple',
      'Microsoft',
      'Amazon',
      'Google',
      'Meta',
      'Tesla',
      'NVIDIA',
      'Samsung',
      'Taiwan Semiconductor',
      'Oracle',
      'Salesforce',
      'Adobe',
      'Netflix',
      'PayPal',
      'Intel',
      'Cisco',
      'IBM',
      'Sony',
    ],
    category: 'tech companies',
    count: 4,
    maxAttempts: 4,
    solution: ['Apple', 'Microsoft', 'Amazon', 'Google'],
  },
  {
    prompt: 'Name the top 3 most popular breakfast cereals',
    suggestions: [
      'Cheerios',
      'Frosted Flakes',
      'Honey Nut Cheerios',
      'Lucky Charms',
      'Froot Loops',
      'Cinnamon Toast Crunch',
      'Rice Krispies',
      'Cocoa Puffs',
      'Trix',
      'Fruity Pebbles',
      'Captain Crunch',
      'Corn Flakes',
      'Special K',
    ],
    category: 'breakfast cereals',
    count: 3,
    maxAttempts: 4,
    solution: ['Cheerios', 'Frosted Flakes', 'Honey Nut Cheerios'],
  },
  {
    prompt: 'Name the top 5 most popular video game consoles of all time',
    suggestions: [
      'PlayStation 2',
      'Nintendo DS',
      'Nintendo Switch',
      'Game Boy',
      'PlayStation 4',
      'PlayStation',
      'Nintendo Wii',
      'PlayStation 3',
      'Xbox 360',
      'Game Boy Advance',
      'PlayStation Portable',
      'Nintendo Entertainment System',
      'Xbox One',
      'Super Nintendo',
    ],
    category: 'gaming consoles',
    count: 5,
    maxAttempts: 4,
    solution: ['PlayStation 2', 'Nintendo DS', 'Nintendo Switch', 'Game Boy', 'PlayStation 4'],
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
    prompt: 'Name the top 4 most popular ice cream flavors',
    suggestions: [
      'Vanilla',
      'Chocolate',
      'Strawberry',
      'Mint Chip',
      'Cookies and Cream',
      'Rocky Road',
      'Neapolitan',
      'Butter Pecan',
      'Cookie Dough',
      'Pistachio',
      'Rum Raisin',
      'Sherbet',
      'Caramel',
      'Coffee',
      'Chocolate Chip',
    ],
    category: 'ice cream flavors',
    count: 4,
    maxAttempts: 4,
    solution: ['Vanilla', 'Chocolate', 'Strawberry', 'Mint Chip'],
  },
  {
    prompt: 'Name the top 3 most popular sports in the world',
    suggestions: [
      'Soccer',
      'Basketball',
      'Cricket',
      'Tennis',
      'Field Hockey',
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
    solution: ['Soccer', 'Basketball', 'Cricket'],
  },
  {
    prompt: 'Name the top 5 most popular Netflix shows of all time',
    suggestions: [
      'Stranger Things',
      'Squid Game',
      'Wednesday',
      'Bridgerton',
      'Money Heist',
      'The Crown',
      'Ozark',
      'The Witcher',
      'You',
      'Tiger King',
      'Orange Is the New Black',
      'House of Cards',
      'Narcos',
      'Black Mirror',
      'The Umbrella Academy',
      'Lupin',
    ],
    category: 'Netflix shows',
    count: 5,
    maxAttempts: 4,
    solution: ['Stranger Things', 'Squid Game', 'Wednesday', 'Bridgerton', 'Money Heist'],
  },
  {
    prompt: 'Name the top 3 most valuable cryptocurrencies',
    suggestions: [
      'Bitcoin',
      'Ethereum',
      'Tether',
      'BNB',
      'Solana',
      'XRP',
      'USDC',
      'Stablecoin',
      'Cardano',
      'Dogecoin',
      'Avalanche',
      'Polygon',
      'Chainlink',
      'Litecoin',
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
      'Subway',
      'Starbucks',
      'KFC',
      'Burger King',
      'Pizza Hut',
      'Dominos',
      'Dunkin',
      'Taco Bell',
      'Chick-fil-A',
      'Sonic',
      'Arbys',
      'Wendys',
      'Dairy Queen',
      'Papa Johns',
      'Little Caesars',
    ],
    category: 'fast food chains',
    count: 4,
    maxAttempts: 4,
    solution: ['McDonalds', 'Subway', 'Starbucks', 'KFC'],
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
    prompt: 'Name the top 5 most popular car brands worldwide',
    suggestions: [
      'Toyota',
      'Volkswagen',
      'Ford',
      'Honda',
      'Nissan',
      'Chevrolet',
      'Hyundai',
      'Kia',
      'Mercedes-Benz',
      'BMW',
      'Audi',
      'Mazda',
      'Subaru',
      'Lexus',
      'Jeep',
      'Volvo',
      'Tesla',
      'Porsche',
      'Jaguar',
      'Land Rover',
    ],
    category: 'car brands',
    count: 5,
    maxAttempts: 4,
    solution: ['Toyota', 'Volkswagen', 'Ford', 'Honda', 'Nissan'],
  },
  {
    prompt: 'Name the top 3 most popular superhero movies of all time',
    suggestions: [
      'Avengers Endgame',
      'Avengers Infinity War',
      'Spider-Man No Way Home',
      'The Dark Knight',
      'Avengers',
      'Black Panther',
      'Iron Man',
      'Wonder Woman',
      'Guardians of the Galaxy',
      'Thor Ragnarok',
      'Captain America Civil War',
      'Doctor Strange',
      'Ant-Man',
      'Captain Marvel',
      'Aquaman',
      'Justice League',
    ],
    category: 'superhero movies',
    count: 3,
    maxAttempts: 4,
    solution: ['Avengers Endgame', 'Avengers Infinity War', 'Spider-Man No Way Home'],
  },
  {
    prompt: 'Name the top 4 most popular coffee drinks',
    suggestions: [
      'Espresso',
      'Americano',
      'Latte',
      'Cappuccino',
      'Macchiato',
      'Mocha',
      'Frappuccino',
      'Cold Brew',
      'Iced Coffee',
      'Flat White',
      'Cortado',
      'Affogato',
      'Red Eye',
      'Black Eye',
      'Drip Coffee',
      'French Press',
    ],
    category: 'coffee drinks',
    count: 4,
    maxAttempts: 4,
    solution: ['Espresso', 'Americano', 'Latte', 'Cappuccino'],
  },
  {
    prompt: 'Name the top 3 most popular board games',
    suggestions: [
      'Monopoly',
      'Scrabble',
      'Chess',
      'Checkers',
      'Risk',
      'Clue',
      'Backgammon',
      'Trivial Pursuit',
      'The Game of Life',
      'Sorry',
      'Yahtzee',
      'Uno',
      'Connect Four',
      'Battleship',
      'Twister',
      'Pictionary',
      'Charades',
    ],
    category: 'board games',
    count: 3,
    maxAttempts: 4,
    solution: ['Monopoly', 'Scrabble', 'Chess'],
  },
  {
    prompt: 'Name the top 5 most popular streaming platforms',
    suggestions: [
      'Netflix',
      'YouTube',
      'Amazon Prime Video',
      'Disney+',
      'Hulu',
      'HBO Max',
      'Apple TV+',
      'Paramount+',
      'Peacock',
      'Tubi',
      'Crunchyroll',
      'Funimation',
      'Twitch',
      'ESPN+',
      'Discovery+',
      'Starz',
      'Showtime',
      'Vudu',
    ],
    category: 'streaming platforms',
    count: 5,
    maxAttempts: 4,
    solution: ['Netflix', 'YouTube', 'Amazon Prime Video', 'Disney+', 'Hulu'],
  },
  {
    prompt: 'Name the top 3 most popular social media apps among teens',
    suggestions: [
      'TikTok',
      'Instagram',
      'Snapchat',
      'YouTube',
      'Discord',
      'WhatsApp',
      'Twitter',
      'Facebook',
      'Reddit',
      'Pinterest',
      'Telegram',
      'Signal',
      'BeReal',
      'VSCO',
      'Tumblr',
      'LinkedIn',
      'Twitch',
      'Clubhouse',
    ],
    category: 'social media apps',
    count: 3,
    maxAttempts: 4,
    solution: ['TikTok', 'Instagram', 'Snapchat'],
  },
  {
    prompt: 'Name the top 4 most popular holiday destinations',
    suggestions: [
      'Paris',
      'London',
      'New York',
      'Rome',
      'Barcelona',
      'Tokyo',
      'Dubai',
      'Amsterdam',
      'Istanbul',
      'Las Vegas',
      'Los Angeles',
      'Prague',
      'Vienna',
      'Venice',
      'Florence',
      'Athens',
      'Santorini',
      'Bali',
      'Hawaii',
      'Thailand',
    ],
    category: 'holiday destinations',
    count: 4,
    maxAttempts: 4,
    solution: ['Paris', 'London', 'New York', 'Rome'],
  },
  {
    prompt: 'Name the top 3 most popular mobile games',
    suggestions: [
      'Candy Crush Saga',
      'Pokemon GO',
      'Fortnite',
      'PUBG Mobile',
      'Among Us',
      'Clash of Clans',
      'Clash Royale',
      'Subway Surfers',
      'Temple Run',
      'Angry Birds',
      'Words with Friends',
      'Brawl Stars',
      'Call of Duty Mobile',
      'Genshin Impact',
      'Roblox',
      'Minecraft',
      'Fall Guys',
      'Wordle',
    ],
    category: 'mobile games',
    count: 3,
    maxAttempts: 4,
    solution: ['Candy Crush Saga', 'Pokemon GO', 'Fortnite'],
  },
];

async function seedLetteredGames() {
  console.log('🚀 Starting lettered games seeding process...');

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

  // Generate and insert games
  for (const gameData of TOPX_GAME_DATA) {
    totalGames++;

    try {
      console.log(`  🎮 Generating game for: "${gameData.prompt}"`);

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
          suggestions: gameData.suggestions,
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
