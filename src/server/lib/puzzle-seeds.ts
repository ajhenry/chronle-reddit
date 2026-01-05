import type { PuzzleSeed } from '../../shared/types/chronle';
import { puzzles, getPuzzleForDay as getPuzzleForDayFromEvents } from '../../shared/data/events';
import { getAllRedditImageUrls } from '../handlers/upload-images';

// Convert PuzzleData from events.ts to PuzzleSeed format
function toPuzzleSeed(puzzle: (typeof puzzles)[0]): PuzzleSeed {
  return {
    id: puzzle.id,
    title: puzzle.title,
    description: puzzle.description,
    events: puzzle.events.map((event) => ({
      id: event.id,
      title: event.title,
      description: event.description,
      subject: event.subject,
      imageUrl: event.imageUrl,
      imageCreditName: event.imageCreditName,
      imageCreditUrl: event.imageCreditUrl,
      date: event.date,
    })),
  };
}

// Get all puzzle seeds
export const puzzleSeeds: PuzzleSeed[] = puzzles.map(toPuzzleSeed);

// Get a puzzle for a specific day (rotates through available puzzles)
export function getPuzzleForDay(dayString: string): PuzzleSeed {
  const puzzle = getPuzzleForDayFromEvents(dayString);
  return toPuzzleSeed(puzzle);
}

// Get a puzzle for a specific day with Reddit image URLs
export async function getPuzzleForDayWithRedditImages(dayString: string): Promise<PuzzleSeed> {
  const puzzle = getPuzzleForDay(dayString);
  const redditUrls = await getAllRedditImageUrls();

  // Replace image URLs with Reddit URLs if available
  return {
    ...puzzle,
    events: puzzle.events.map((event) => ({
      ...event,
      imageUrl: redditUrls[event.id] || event.imageUrl,
    })),
  };
}

// Get a random puzzle (for custom games or testing)
export function getRandomPuzzle(): PuzzleSeed {
  const randomIndex = Math.floor(Math.random() * puzzleSeeds.length);
  return puzzleSeeds[randomIndex]!;
}

// Shuffle an array using Fisher-Yates algorithm
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

// Create a timeline from a puzzle seed with shuffled events
export function createTimelineFromSeed(seed: PuzzleSeed): {
  timeline: {
    id: string;
    title: string;
    description: string;
    solution: string[];
    events: Array<{
      id: string;
      timelineId: string;
      eventId: string;
      event: (typeof seed.events)[0];
    }>;
  };
  shuffledEventIds: string[];
} {
  // Sort events by date to get the correct solution order
  const sortedEvents = [...seed.events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const solution = sortedEvents.map((e) => e.id);

  // Create timeline events
  const timelineEvents = seed.events.map((event) => ({
    id: `${seed.id}-${event.id}`,
    timelineId: seed.id,
    eventId: event.id,
    event,
  }));

  // Shuffle for initial display
  const shuffledEvents = shuffleArray(seed.events);
  const shuffledEventIds = shuffledEvents.map((e) => e.id);

  return {
    timeline: {
      id: seed.id,
      title: seed.title,
      description: seed.description,
      solution,
      events: timelineEvents,
    },
    shuffledEventIds,
  };
}
