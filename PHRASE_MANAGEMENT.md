# Phrase Management System

## Overview

The lettered game now uses an on-demand creation system with a centralized phrase list. Games are created automatically when needed, selecting phrases sequentially from a managed list.

## How It Works

### 1. Phrase List (`src/server/lib/phrase-lists.ts`)

This file contains a global array `LETTERED_PHRASES` with all available phrases:

```typescript
export const LETTERED_PHRASES: PhraseData[] = [
  { category: 'Blockbuster Films', phrase: 'SPIDER MAN NO WAY HOME' },
  { category: 'Blockbuster Films', phrase: 'AVATAR THE WAY OF WATER' },
  // ... more phrases
];
```

**To add new phrases:** Simply append to the `LETTERED_PHRASES` array at the bottom of the file.

### 2. Phrase Tracker (`src/server/lib/phrase-tracker.ts`)

This module manages which phrase to use next via Redis:

- **Redis Key:** `daily:lettered:phrase_index`
- **Behavior:** Increments sequentially through the phrase list, wrapping around to the beginning when reaching the end

Key functions:
- `getNextLetteredPhrase()` - Gets the next phrase in order and increments the index
- `getCurrentLetteredIndex()` - Views the current index without incrementing
- `resetLetteredIndex(index)` - Resets to a specific index (useful for testing)

### 3. Game Creation (`src/server/lib/lettered-game-helpers.ts`)

The `getOrCreateTodaysLetteredGame()` function:

1. Checks if a game exists for today
2. If not, calls `getNextLetteredPhrase()` to get the next phrase
3. Generates a game using `generateMockGame()` with a random seed
4. Stores it in Supabase
5. Creates the daily_games entry

### 4. Integration (`src/server/database/lettered.ts`)

The `getTodaysLetteredGame()` function now calls the on-demand creation logic, ensuring games are created automatically when accessed.

## Adding New Phrases

1. Open `/src/server/lib/phrase-lists.ts`
2. Add new entries to the `LETTERED_PHRASES` array:

```typescript
{ category: 'Your Category', phrase: 'YOUR PHRASE HERE' },
```

3. Phrases should be:
   - All uppercase letters and spaces only
   - Words should be 9 letters or less
   - Total phrase should be under 70 characters
   - Use descriptive categories to group similar phrases

4. Save the file - changes take effect immediately

## Managing the Index

### View Current Index

```typescript
import { getCurrentLetteredIndex } from './src/server/lib/phrase-tracker';

const currentIndex = await getCurrentLetteredIndex();
console.log(`Next game will use phrase at index: ${currentIndex}`);
```

### Reset Index (Testing)

```typescript
import { resetLetteredIndex } from './src/server/lib/phrase-tracker';

// Reset to start from the beginning
await resetLetteredIndex(0);

// Or set to a specific index
await resetLetteredIndex(42);
```

### View Available Phrases

```typescript
import { getPhraseListInfo } from './src/server/lib/phrase-tracker';

const info = getPhraseListInfo();
console.log(`Total phrases available: ${info.letteredPhrases.total}`);
console.log(`Categories: ${info.letteredPhrases.categories.join(', ')}`);
```

## Current Phrase List

The system currently includes **${LETTERED_PHRASES.length} phrases** across these categories:

- Blockbuster Films
- Classic Literature
- Famous Catchphrases
- Fast Food Items
- Video Game Titles
- Netflix Original Shows
- Disney Movies
- Pop Music Hits
- World Events
- Technology Products
- Social Media Apps
- Famous Landmarks

## Behavior

- **Sequential:** Phrases are used in the exact order they appear in the list
- **Automatic Wrapping:** When reaching the end of the list, it wraps back to the beginning
- **Persistent:** The index is stored in Redis, so it persists across server restarts
- **Per-Day:** One game per day, created on-demand when first accessed

## Benefits

1. **Easy Management:** Just add phrases to the list, no database seeding required
2. **Predictable:** Games follow a sequential order
3. **Flexible:** Can reset or adjust the index at any time
4. **Automatic:** Games are created on-demand, no manual intervention needed
5. **Scalable:** Add as many phrases as you want to the list

