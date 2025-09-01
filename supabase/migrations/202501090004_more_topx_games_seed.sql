-- Add more seed data for TopX games
INSERT INTO topx_games (id, prompt, suggestions, category, count, solution) VALUES
(
  'game_004',
  'Name the top 3 most visited countries in the world',
  ARRAY[
    'France', 'Spain', 'United States', 'China', 'Italy', 'Turkey', 'Mexico',
    'Thailand', 'Germany', 'United Kingdom', 'Japan', 'Austria', 'Greece',
    'Malaysia', 'Russia', 'Canada', 'Poland', 'Netherlands', 'Ukraine', 'Portugal'
  ],
  'countries',
  3,
  ARRAY['France', 'Spain', 'United States']
),
(
  'game_005',
  'Name the top 4 most popular pizza toppings',
  ARRAY[
    'Pepperoni', 'Mushrooms', 'Sausage', 'Cheese', 'Peppers', 'Onions', 'Olives',
    'Ham', 'Pineapple', 'Bacon', 'Anchovies', 'Spinach', 'Tomatoes', 'Chicken',
    'Beef', 'Jalapeños', 'Garlic', 'Basil'
  ],
  'food',
  4,
  ARRAY['Pepperoni', 'Mushrooms', 'Sausage', 'Extra Cheese']
),
(
  'game_006',
  'Name the top 5 most streamed artists on Spotify',
  ARRAY[
    'Drake', 'Ed Sheeran', 'Post Malone', 'Ariana Grande', 'Eminem', 'Justin Bieber',
    'The Weeknd', 'Billie Eilish', 'Taylor Swift', 'Bad Bunny', 'J Balvin',
    'Dua Lipa', 'Travis Scott', 'Khalid', 'Rihanna', 'Bruno Mars'
  ],
  'music artists',
  5,
  ARRAY['Drake', 'Bad Bunny', 'The Weeknd', 'Taylor Swift', 'Ariana Grande']
),
(
  'game_007',
  'Name the top 3 most popular dog breeds in America',
  ARRAY[
    'Labrador Retriever', 'Golden Retriever', 'German Shepherd', 'French Bulldog',
    'Bulldog', 'Poodle', 'Beagle', 'Rottweiler', 'German Shorthaired Pointer',
    'Yorkshire Terrier', 'Dachshund', 'Siberian Husky', 'Boxer', 'Boston Terrier'
  ],
  'dog breeds',
  3,
  ARRAY['Labrador Retriever', 'Golden Retriever', 'German Shepherd']
),
(
  'game_008',
  'Name the top 4 largest tech companies by market cap',
  ARRAY[
    'Apple', 'Microsoft', 'Amazon', 'Google', 'Meta', 'Tesla', 'NVIDIA',
    'Samsung', 'Taiwan Semiconductor', 'Oracle', 'Salesforce', 'Adobe',
    'Netflix', 'PayPal', 'Intel', 'Cisco', 'IBM', 'Sony'
  ],
  'tech companies',
  4,
  ARRAY['Apple', 'Microsoft', 'Amazon', 'Google']
),
(
  'game_009',
  'Name the top 3 most popular breakfast cereals',
  ARRAY[
    'Cheerios', 'Frosted Flakes', 'Honey Nut Cheerios', 'Lucky Charms',
    'Froot Loops', 'Cinnamon Toast Crunch', 'Rice Krispies', 'Cocoa Puffs',
    'Trix', 'Fruity Pebbles', 'Captain Crunch', 'Corn Flakes', 'Special K'
  ],
  'breakfast cereals',
  3,
  ARRAY['Cheerios', 'Frosted Flakes', 'Honey Nut Cheerios']
),
(
  'game_010',
  'Name the top 5 most popular video game consoles of all time',
  ARRAY[
    'PlayStation 2', 'Nintendo DS', 'Nintendo Switch', 'Game Boy', 'PlayStation 4',
    'PlayStation', 'Nintendo Wii', 'PlayStation 3', 'Xbox 360', 'Game Boy Advance',
    'PlayStation Portable', 'Nintendo Entertainment System', 'Xbox One', 'Super Nintendo'
  ],
  'gaming consoles',
  5,
  ARRAY['PlayStation 2', 'Nintendo DS', 'Nintendo Switch', 'Game Boy', 'PlayStation 4']
),
(
  'game_011',
  'Name the top 3 most spoken languages in the world',
  ARRAY[
    'Mandarin Chinese', 'English', 'Hindi', 'Spanish', 'French', 'Standard Arabic',
    'Bengali', 'Russian', 'Portuguese', 'Indonesian', 'Urdu', 'German',
    'Japanese', 'Swahili', 'Marathi', 'Telugu', 'Turkish', 'Korean'
  ],
  'languages',
  3,
  ARRAY['Mandarin Chinese', 'English', 'Hindi']
),
(
  'game_012',
  'Name the top 4 most popular ice cream flavors',
  ARRAY[
    'Vanilla', 'Chocolate', 'Strawberry', 'Mint Chip', 'Cookies and Cream',
    'Rocky Road', 'Neapolitan', 'Butter Pecan', 'Cookie Dough', 'Pistachio',
    'Rum Raisin', 'Sherbet', 'Caramel', 'Coffee', 'Chocolate Chip'
  ],
  'ice cream flavors',
  4,
  ARRAY['Vanilla', 'Chocolate', 'Strawberry', 'Mint Chip']
),
(
  'game_013',
  'Name the top 3 most popular sports in the world',
  ARRAY[
    'Soccer', 'Basketball', 'Cricket', 'Tennis', 'Field Hockey', 'Volleyball',
    'Table Tennis', 'Baseball', 'Golf', 'American Football', 'Boxing',
    'Rugby', 'Swimming', 'Badminton', 'Athletics', 'Wrestling'
  ],
  'sports',
  3,
  ARRAY['Soccer', 'Basketball', 'Cricket']
),
(
  'game_014',
  'Name the top 5 most popular Netflix shows of all time',
  ARRAY[
    'Stranger Things', 'Squid Game', 'Wednesday', 'Bridgerton', 'Money Heist',
    'The Crown', 'Ozark', 'The Witcher', 'You', 'Tiger King', 'Orange Is the New Black',
    'House of Cards', 'Narcos', 'Black Mirror', 'The Umbrella Academy', 'Lupin'
  ],
  'Netflix shows',
  5,
  ARRAY['Stranger Things', 'Squid Game', 'Wednesday', 'Bridgerton', 'Money Heist']
),
(
  'game_015',
  'Name the top 3 most valuable cryptocurrencies',
  ARRAY[
    'Bitcoin', 'Ethereum', 'Tether', 'BNB', 'Solana', 'XRP', 'USDC', 'Stablecoin',
    'Cardano', 'Dogecoin', 'Avalanche', 'Polygon', 'Chainlink', 'Litecoin',
    'Bitcoin Cash', 'Uniswap', 'Cosmos', 'Algorand'
  ],
  'cryptocurrencies',
  3,
  ARRAY['Bitcoin', 'Ethereum', 'Tether']
),
(
  'game_016',
  'Name the top 4 most popular fast food chains in America',
  ARRAY[
    'McDonalds', 'Subway', 'Starbucks', 'KFC', 'Burger King', 'Pizza Hut',
    'Dominos', 'Dunkin', 'Taco Bell', 'Chick-fil-A', 'Sonic', 'Arbys',
    'Wendys', 'Dairy Queen', 'Papa Johns', 'Little Caesars'
  ],
  'fast food chains',
  4,
  ARRAY['McDonalds', 'Subway', 'Starbucks', 'KFC']
),
(
  'game_017',
  'Name the top 3 largest oceans in the world',
  ARRAY[
    'Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean', 'Southern Ocean',
    'Arctic Ocean', 'Mediterranean Sea', 'Caribbean Sea', 'South China Sea',
    'Bering Sea', 'Gulf of Mexico', 'Sea of Okhotsk', 'East China Sea'
  ],
  'oceans',
  3,
  ARRAY['Pacific Ocean', 'Atlantic Ocean', 'Indian Ocean']
),
(
  'game_018',
  'Name the top 5 most popular car brands worldwide',
  ARRAY[
    'Toyota', 'Volkswagen', 'Ford', 'Honda', 'Nissan', 'Chevrolet', 'Hyundai',
    'Kia', 'Mercedes-Benz', 'BMW', 'Audi', 'Mazda', 'Subaru', 'Lexus',
    'Jeep', 'Volvo', 'Tesla', 'Porsche', 'Jaguar', 'Land Rover'
  ],
  'car brands',
  5,
  ARRAY['Toyota', 'Volkswagen', 'Ford', 'Honda', 'Nissan']
),
(
  'game_019',
  'Name the top 3 most popular superhero movies of all time',
  ARRAY[
    'Avengers Endgame', 'Avengers Infinity War', 'Spider-Man No Way Home',
    'The Dark Knight', 'Avengers', 'Black Panther', 'Iron Man', 'Wonder Woman',
    'Guardians of the Galaxy', 'Thor Ragnarok', 'Captain America Civil War',
    'Doctor Strange', 'Ant-Man', 'Captain Marvel', 'Aquaman', 'Justice League'
  ],
  'superhero movies',
  3,
  ARRAY['Avengers Endgame', 'Avengers Infinity War', 'Spider-Man No Way Home']
),
(
  'game_020',
  'Name the top 4 most popular coffee drinks',
  ARRAY[
    'Espresso', 'Americano', 'Latte', 'Cappuccino', 'Macchiato', 'Mocha',
    'Frappuccino', 'Cold Brew', 'Iced Coffee', 'Flat White', 'Cortado',
    'Affogato', 'Red Eye', 'Black Eye', 'Drip Coffee', 'French Press'
  ],
  'coffee drinks',
  4,
  ARRAY['Espresso', 'Americano', 'Latte', 'Cappuccino']
),
(
  'game_021',
  'Name the top 3 most popular board games',
  ARRAY[
    'Monopoly', 'Scrabble', 'Chess', 'Checkers', 'Risk', 'Clue', 'Backgammon',
    'Trivial Pursuit', 'The Game of Life', 'Sorry', 'Yahtzee', 'Uno',
    'Connect Four', 'Battleship', 'Twister', 'Pictionary', 'Charades'
  ],
  'board games',
  3,
  ARRAY['Monopoly', 'Scrabble', 'Chess']
),
(
  'game_022',
  'Name the top 5 most popular streaming platforms',
  ARRAY[
    'Netflix', 'YouTube', 'Amazon Prime Video', 'Disney+', 'Hulu', 'HBO Max',
    'Apple TV+', 'Paramount+', 'Peacock', 'Tubi', 'Crunchyroll', 'Funimation',
    'Twitch', 'ESPN+', 'Discovery+', 'Starz', 'Showtime', 'Vudu'
  ],
  'streaming platforms',
  5,
  ARRAY['Netflix', 'YouTube', 'Amazon Prime Video', 'Disney+', 'Hulu']
),
(
  'game_023',
  'Name the top 3 most popular social media apps among teens',
  ARRAY[
    'TikTok', 'Instagram', 'Snapchat', 'YouTube', 'Discord', 'WhatsApp',
    'Twitter', 'Facebook', 'Reddit', 'Pinterest', 'Telegram', 'Signal',
    'BeReal', 'VSCO', 'Tumblr', 'LinkedIn', 'Twitch', 'Clubhouse'
  ],
  'social media apps',
  3,
  ARRAY['TikTok', 'Instagram', 'Snapchat']
),
(
  'game_024',
  'Name the top 4 most popular holiday destinations',
  ARRAY[
    'Paris', 'London', 'New York', 'Rome', 'Barcelona', 'Tokyo', 'Dubai',
    'Amsterdam', 'Istanbul', 'Las Vegas', 'Los Angeles', 'Prague', 'Vienna',
    'Venice', 'Florence', 'Athens', 'Santorini', 'Bali', 'Hawaii', 'Thailand'
  ],
  'holiday destinations',
  4,
  ARRAY['Paris', 'London', 'New York', 'Rome']
),
(
  'game_025',
  'Name the top 3 most popular mobile games',
  ARRAY[
    'Candy Crush Saga', 'Pokemon GO', 'Fortnite', 'PUBG Mobile', 'Among Us',
    'Clash of Clans', 'Clash Royale', 'Subway Surfers', 'Temple Run',
    'Angry Birds', 'Words with Friends', 'Brawl Stars', 'Call of Duty Mobile',
    'Genshin Impact', 'Roblox', 'Minecraft', 'Fall Guys', 'Wordle'
  ],
  'mobile games',
  3,
  ARRAY['Candy Crush Saga', 'Pokemon GO', 'Fortnite']
);
