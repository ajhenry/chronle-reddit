Let's start adding the tables for the lettered game

we need the following

This table is used to store the initial game data that is used to generate the game for each day.

- A table for lettered_games
  - id
  - category
  - phrase
  - initial grid // Stored as JSON as a 2d array of strings
  - solution grid // Stored as JSON as a 2d array of strings
  - pieces // Stored as JSON, each pieces is an object with the following properties:
    - id
    - letters
    - shape
    - color
  - created_at
  - updated_at

This table is used to store each time the game layout is changed by the user so they can come back to it later or replay all their changes.

- A table for lettered_game_submissions

  - id
  - lettered_game_id
  - user_id
  - submission // Stored as JSON as a 2d array of strings of the current board layout
  - is_correct // true or false
  - created_at
  - updated_at

- A table for lettered_game_sessions
  - id
  - lettered_game_id
  - user_id
  - created_at
  - updated_at

This table is used to track the current game session for a user. For example, if the user starts a game but the website crashes, when the user reloads the page, we can restore the game session.

- A table for lettered_game_session_submissions
  - id
  - latest_submission_id
  - created_at
  - updated_at

The API endpoints we need for the lettered game are:

If the user submits a session for a game that is for a day that is not today, we should return a 400 error with the body { "status": "error", "message": "Game session id {gameSessionId} is for {gameDate} but current game id {currentGameId} for {todayDate}" }

- GET /api/lettered/game - Returns the current day's lettered game. This will always return the initial game found in the lettered_games table.
- GET /api/lettered/:gameId/session - Returns the current game session for a user. This will return the latest submission found in the lettered_game_submissions table.
- POST /api/lettered/:gameId/session - Creates a new game session for the user. This should be called every time the user moves a piece. It should accept the current2d grid of the game.
- GET /api/lettered/:gameId/postgame - Returns the results that were validated on the server. This should return the validated score for the user.
