# Database Setup for Season System

This document describes how to set up the database tables and functions required for the season system and leaderboards.

## Prerequisites

You need to have Supabase set up with the existing `users` and `counters` tables as described in the main README.

## Setup Instructions

1. **Run the Season Schema SQL**

   Execute the contents of `/database/seasons_schema.sql` in your Supabase SQL Editor. This will create:

   - `seasons` table - manages game seasons with start/end dates
   - Database functions for leaderboard calculations
   - Row Level Security policies
   - Indexes for optimal performance

2. **Verify Tables Created**

   After running the SQL, you should see these new tables in your Supabase dashboard:

   ```
   seasons
   ├── id (UUID, Primary Key)
   ├── name (TEXT)
   ├── start_date (TIMESTAMP WITH TIME ZONE)
   ├── end_date (TIMESTAMP WITH TIME ZONE)
   ├── is_active (BOOLEAN)
   ├── game_type (TEXT)
   ├── created_at (TIMESTAMP WITH TIME ZONE)
   └── updated_at (TIMESTAMP WITH TIME ZONE)


   ```

3. **Database Functions**

   The setup creates these utility functions:

   - `get_season_leaderboard(season_id, limit, offset)` - Returns ranked players with stats
   - `get_user_rank(user_id, season_id)` - Returns a user's rank in a season
   - `manage_season_transitions()` - Automatically handles season end/start
   - `can_user_play_today(user_id, game_id, season_id)` - Checks daily play eligibility

## Season System Features

### Automatic Season Management

- Seasons are 30 days long by default
- New seasons automatically created when current season ends
- Only one season can be active at a time

### Leaderboards

- Real-time ranking based on total score, games won, and average score
- Multiple ranking criteria (total score, win rate, average attempts, etc.)
- Supports pagination for large player bases
- Individual user stats and rankings

### Daily Reset Logic

- Users can play once per calendar day (UTC timezone)
- Previous day's session doesn't block next day's play
- Session completion prevents multiple plays on same day

## API Endpoints

The season system adds these new API endpoints:

- `GET /api/season/current` - Get current active season
- `GET /api/seasons` - Get all seasons

- `GET /api/leaderboard/:seasonId` - Get season leaderboard
- `GET /api/user-stats/:seasonId` - Get user's season statistics

## Frontend Features

### Season Information Display

- Shows current season name and time remaining
- Quick access to leaderboard
- Responsive design with seasonal theming

### Enhanced Game Experience

- Game state management without persistent sessions
- Real-time progress updates within the current session

### Leaderboard Interface

- Comprehensive player rankings
- Personal stats display
- Rank indicators with icons for top 3 players
- Responsive design for mobile and desktop

## Migration Notes

If you have existing game data, you may want to:

1. Create an initial season for historical data
2. Update user records to include season participation

The system is designed to work alongside existing functionality without breaking changes.
