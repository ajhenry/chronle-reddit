# Leaderboard

```prompt
Implement this document for leaderboards.

- create new database handlers for leaderboard table calculations and interactions
- get rid of the current leaderboard handlers and replace it with the ones described in the doc
- update the handlers for topx and lettered to add to the leaderboard

Ask questions if unsure of anything or need more context
```

## Database

There should be NO database function for the leaderboard. It will be handled by the API entirely. THERE WILL BE NO DATABASE FUNCTIONS FOR THE LEADERBOARD.

### Season Leaderboard

The season leaderboard is a table that stores the leaderboard rankings for the current season.

`season_leaderboard`

- id
- season_id
- user_id
- total_points
- games_played
- average_topx_score
- average_topx_attempts_used
- average_lettered_score
- average_lettered_moves_used
- average_score
- created_at
- updated_at

### Game Leaderboard

The game leaderboard is a table that stores the leaderboard rankings for a game.

`lettered_leaderboard`

- id
- season_id
- user_id
- total_points
- games_played
- average_score
- average_moves
- average_time
- created_at
- updated_at

`topx_leaderboard`

- id
- season_id
- user_id
- total_points
- games_played
- average_score
- average_attempts_used
- created_at
- updated_at
- average_time

### User Leaderboard

The user leaderboard is a table that stores total game information for a user.

`user_stats`

- id
- user_id
- current_daily_streak
- best_daily_streak
- current_daily_lettered_streak
- best_daily_lettered_streak
- current_daily_topx_streak
- best_daily_topx_streak
- total_points
- total_games_played
- total_topx_games_played
- total_lettered_games_played
- total_topx_points
- total_lettered_points
- total_topx_wins
- total_lettered_wins
- total_topx_losses
- total_lettered_losses
- total_topx_win_rate
- total_lettered_win_rate
- total_topx_average_score
- total_lettered_average_score
- created_at
- updated_at

`user_season_stats`

- id
- season_id
- user_id
- current_daily_streak
- best_daily_streak
- current_daily_lettered_streak
- best_daily_lettered_streak
- current_daily_topx_streak
- best_daily_topx_streak
- total_points
- total_games_played
- total_topx_games_played
- total_lettered_games_played
- total_topx_points
- total_lettered_points
- total_topx_wins
- total_lettered_wins
- total_topx_losses
- total_lettered_losses
- total_topx_win_rate
- total_lettered_win_rate
- total_topx_average_score
- total_lettered_average_score
- created_at
- updated_at

## Leaderboard API

### GET /api/leaderboard

Returns the current leaderboard rankings for the first 10 players. It also returns the total number of players and the position of the current user.

### GET /api/leaderboard/topx

Returns the current leaderboard rankings for the first 10 players for the topx game. It also returns the total number of players and the position of the current user.

### GET /api/leaderboard/lettered

Returns the current leaderboard rankings for the first 10 players for the lettered game. It also returns the total number of players and the position of the current user.

### GET /api/stats/user

Returns the current user's total statistics.

### GET /api/stats/user/season/:seasonId

Returns the current user's season statistics for a specific season.
