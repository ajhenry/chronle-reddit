# Lettered - The Phrase-Fitting Puzzle Game

A daily word puzzle game where players arrange letter pieces to complete hidden phrases.

## How to Play

1. **Discover the Phrase** - Each puzzle contains a hidden phrase with empty spaces waiting to be filled
2. **Drag and Drop** - Arrange the scattered letter pieces into the correct positions on the grid
3. **Complete the Puzzle** - Spell out the phrase correctly to solve the puzzle

## Features

- **Daily Puzzles** - A fresh puzzle every day for your community to solve together
- **Leaderboards** - See how you stack up against other players in your subreddit
- **Streak Tracking** - Build and maintain your daily solving streak
- **Quick Gameplay** - Puzzles are designed to be solved in just a few minutes

## How Puzzles Are Generated

Each puzzle starts with a phrase that gets transformed into a playable board:

1. **Grid Layout** - The phrase is arranged onto a grid where each letter occupies a cell. Spaces between words create natural gaps in the layout.

2. **Anchor Letters** - A few letters are pre-filled on the board as hints to help players get started. These "anchors" give you a foothold to assist you in figuring out the rest of the phrase.

3. **Piece Creation** - The remaining letters are grouped into draggable pieces. Shorter phrases create fewer, larger pieces while longer phrases create more pieces to manage. Each piece gets a unique color to help distinguish them.

4. **Scrambled Start** - The pieces are shuffled and placed in a tray below the board, ready for you to drag them into position.

## User Generated Puzzles

Users can create their own puzzles by submitting a phrase and category. The phrase will be transformed into a playable board in the same way as daily puzzles. Subreddit moderators can manage all puzzles created by the app and users. There are protections in place to prevent abusive puzzles from being created.

## Data Storage

Lettered uses Reddit's built-in database to store your game data securely within the platform:

- **Player Profiles** - Your Reddit username and avatar are used to identify you on leaderboards
- **Game Progress** - Your puzzle sessions, completion times, and move counts are saved
- **Stats and Streaks** - Your overall statistics including best times, games played, and daily streaks are tracked
- **Leaderboard Rankings** - Your scores are recorded for daily, weekly, and all-time leaderboards

All data is stored within Reddit's infrastructure and is scoped to the subreddit where you play. Your information is **never** shared with third parties. Most user data is automatically deleted after 30 days of inactivity (some data is deleted upon account deletion instead of 30 days).

---

## Changelog

### v1.0.1

- Clean up some permissions

### v1.0.0

- Initial release of the Lettered game!
- Daily puzzle generation
- User generated puzzle support
- Responsive drag-and-drop letter placement
- Leaderboard system
- Streak tracking
