-- Seed daily games for the next week
-- This ensures we have predictable games for testing and initial launch

INSERT INTO daily_games (id, day, topx_game_id) VALUES
(
  'daily_game_20250109',
  '2025-01-09',
  'game_001'  -- Name the top 3 states that eat the most peanut butter
),
(
  'daily_game_20250110', 
  '2025-01-10',
  'game_008'  -- Name the top 4 largest tech companies by market cap
),
(
  'daily_game_20250111',
  '2025-01-11', 
  'game_013'  -- Name the top 3 most popular sports in the world
),
(
  'daily_game_20250112',
  '2025-01-12',
  'game_005'  -- Name the top 4 most popular pizza toppings
),
(
  'daily_game_20250113',
  '2025-01-13',
  'game_018'  -- Name the top 5 most popular car brands worldwide
),
(
  'daily_game_20250114',
  '2025-01-14',
  'game_006'  -- Name the top 5 most streamed artists on Spotify
),
(
  'daily_game_20250115',
  '2025-01-15',
  'game_004'  -- Name the top 3 most visited countries in the world
),
(
  'daily_game_20250116',
  '2025-01-16',
  'game_022'  -- Name the top 5 most popular streaming platforms
),
(
  'daily_game_20250117',
  '2025-01-17',
  'game_012'  -- Name the top 4 most popular ice cream flavors
),
(
  'daily_game_20250118',
  '2025-01-18',
  'game_002'  -- Name the top 5 programming languages by popularity
),
(
  'daily_game_20250119',
  '2025-01-19',
  'game_025'  -- Name the top 3 most popular mobile games
),
(
  'daily_game_20250120',
  '2025-01-20',
  'game_016'  -- Name the top 4 most popular fast food chains in America
),
(
  'daily_game_20250121',
  '2025-01-21',
  'game_007'  -- Name the top 3 most popular dog breeds in America
),
(
  'daily_game_20250122',
  '2025-01-22',
  'game_014'  -- Name the top 5 most popular Netflix shows of all time
),
(
  'daily_game_20250123',
  '2025-01-23',
  'game_003'  -- Name the top 4 social media platforms by users
),
(
  'daily_game_20250124',
  '2025-01-24',
  'game_019'  -- Name the top 3 most popular superhero movies of all time
),
(
  'daily_game_20250125',
  '2025-01-25',
  'game_010'  -- Name the top 5 most popular video game consoles of all time
),
(
  'daily_game_20250126',
  '2025-01-26',
  'game_023'  -- Name the top 3 most popular social media apps among teens
),
(
  'daily_game_20250127',
  '2025-01-27',
  'game_009'  -- Name the top 3 most popular breakfast cereals
),
(
  'daily_game_20250128',
  '2025-01-28',
  'game_020'  -- Name the top 4 most popular coffee drinks
),
(
  'daily_game_20250129',
  '2025-01-29',
  'game_011'  -- Name the top 3 most spoken languages in the world
),
(
  'daily_game_20250130',
  '2025-01-30',
  'game_024'  -- Name the top 4 most popular holiday destinations
),
(
  'daily_game_20250131',
  '2025-01-31',
  'game_015'  -- Name the top 3 most valuable cryptocurrencies
),
(
  'daily_game_20250201',
  '2025-02-01',
  'game_017'  -- Name the top 3 largest oceans in the world
),
(
  'daily_game_20250202',
  '2025-02-02',
  'game_021'  -- Name the top 3 most popular board games
);
