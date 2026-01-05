import { useState, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Loader2 } from 'lucide-react';
import { useReward } from 'react-rewards';
import { toast } from 'sonner';
import { Button } from './ui/button';
import { SortableEvent } from './SortableEvent';
import type {
  ChronleEvent,
  ChronleGameData,
  ChronlePostGameResponse,
} from '../../shared/types/chronle';
import { ChronlePostGameStats } from './ChronlePostGameStats';
import { apiFetch } from '../lib/utils';

interface TimelineGameProps {
  gameData: ChronleGameData;
  initialOrder: string[];
  lastAttempt: { attempt: string[]; correct: boolean[] } | null;
  attemptCount: number;
  isSolved: boolean;
  isCompleted: boolean;
  gameId: string;
}

export function TimelineGame({
  gameData,
  initialOrder,
  lastAttempt,
  attemptCount: initialAttemptCount,
  isSolved: initialSolved,
  isCompleted: initialCompleted,
  gameId,
}: TimelineGameProps) {
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [showPostGame, setShowPostGame] = useState(false);
  const [postGameStats, setPostGameStats] = useState<ChronlePostGameResponse | null>(null);

  // Track current game state
  const [attemptCount, setAttemptCount] = useState(initialAttemptCount);
  const [isSolved, setIsSolved] = useState(initialSolved);
  const [isFinished, setIsFinished] = useState(initialCompleted);
  const [currentAttempt, setCurrentAttempt] = useState<{
    attempt: string[];
    correct: boolean[];
  } | null>(lastAttempt);

  // Event order - map IDs to actual event objects
  const eventMap = new Map(gameData.events.map((e) => [e.id, e]));
  const [items, setItems] = useState<ChronleEvent[]>(() => {
    const order = currentAttempt?.attempt ?? initialOrder;
    return order.map((id) => eventMap.get(id)!).filter(Boolean);
  });

  const { reward } = useReward('rewardId', 'confetti', {
    elementCount: 200,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch post-game stats when game is finished
  useEffect(() => {
    if (isFinished) {
      const fetchPostGame = async () => {
        try {
          const response = await apiFetch(`/api/chronle/${gameId}/postgame`);
          if (response.ok) {
            const data = await response.json();
            setPostGameStats(data);
          }
        } catch (error) {
          console.error('Error fetching post-game stats:', error);
        }
      };
      void fetchPostGame();
    }
  }, [isFinished, gameId]);

  // Handle showing post-game UI
  useEffect(() => {
    if (!isFinished) return;

    // If coming back to a finished game, show post-game immediately
    if (initialCompleted) {
      // Set items to correct order from postGameStats if available
      if (postGameStats?.correctOrder) {
        setItems(postGameStats.correctOrder);
      }
      setShowPostGame(true);
      return;
    }

    // Fresh finish - animate
    if (isSolved) {
      setTimeout(() => {
        reward();
      }, 1250);
    } else {
      toast.error('Better luck next time');
    }

    setTimeout(() => {
      // Set items to correct order
      if (postGameStats?.correctOrder) {
        setItems(postGameStats.correctOrder);
      }
      setShowPostGame(true);
    }, 2500);
  }, [isFinished, initialCompleted, isSolved, postGameStats, reward]);

  const handleSubmit = async () => {
    setSubmissionLoading(true);
    const solution = items.map((item) => item.id);

    try {
      const response = await apiFetch(`/api/chronle/${gameId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ solution }),
      });

      if (response.ok) {
        const data = await response.json();
        setAttemptCount(data.attemptCount);
        setIsSolved(data.isSolved);
        setIsFinished(data.isFinished);
        setCurrentAttempt({
          attempt: data.attempt.attempt,
          correct: data.attempt.correct,
        });
      } else {
        toast.error('Failed to submit solution');
      }
    } catch (error) {
      console.error('Error submitting solution:', error);
      toast.error('Failed to submit solution');
    } finally {
      setSubmissionLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over?.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const remainingAttempts = 6 - attemptCount;

  // If returning to a completed game, wait for post-game stats before showing anything
  if (initialCompleted && !postGameStats) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-lg text-foreground">Loading puzzle...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col items-center justify-center p-4">
      {/* Post-game UI */}
      {isFinished && showPostGame && postGameStats && (
        <div className="mb-8 w-full max-w-md space-y-4 transition-all">
          <div>
            <h2 className="text-center text-2xl font-bold text-foreground">
              {isSolved ? 'Congrats!' : 'Better luck next time'}
            </h2>
            <p className="text-center text-sm text-muted-foreground">
              {isSolved
                ? 'You solved the Chronle!'
                : `Nice try! You got ${currentAttempt?.correct.filter((c) => c).length ?? 0}/6 correct`}
            </p>
          </div>

          <div className="space-y-2">
            <h3 className="text-center text-lg font-medium text-foreground">How'd you do?</h3>
            <ChronlePostGameStats
              attemptCount={attemptCount}
              isSolved={isSolved}
              allPlayerStats={postGameStats.allPlayerStats}
              totalPlayers={postGameStats.totalPlayers}
              correctCount={currentAttempt?.correct.filter((c) => c).length ?? 0}
            />
          </div>
        </div>
      )}

      {/* Game header */}
      <h3 className="text-center text-lg font-medium text-foreground">{gameData.description}</h3>
      <p className="text-center text-sm text-muted-foreground">Oldest event first</p>

      {/* Sortable event list */}
      <div className="mt-2 w-full">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          id="timeline-game"
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableEvent
                  key={item.id}
                  id={item.id}
                  order={index}
                  event={item}
                  attemptNumber={attemptCount}
                  correct={currentAttempt?.correct[index] ?? false}
                  postGame={isFinished}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <p className="mt-2 text-center text-sm text-muted-foreground">Most recent event last</p>

      {/* Confetti anchor */}
      <div className="flex items-center justify-center">
        <div id="rewardId" className="w-12" />
      </div>

      {/* Submit button */}
      {!isFinished && (
        <Button
          onClick={handleSubmit}
          disabled={submissionLoading || isSolved}
          className="mt-4 w-full"
        >
          {submissionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submissionLoading ? 'Submitting...' : `Submit (${remainingAttempts} remaining)`}
        </Button>
      )}
    </div>
  );
}
