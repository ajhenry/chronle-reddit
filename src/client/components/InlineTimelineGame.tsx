import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
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
import { InlineSortableEvent } from './InlineSortableEvent';
import type {
  ChronleEvent,
  ChronleGameData,
  ChronlePostGameResponse,
} from '../../shared/types/chronle';
import { PostGameModal } from './PostGameModal';
import { EventDetailModal } from './EventDetailModal';
import { apiFetch } from '../lib/utils';

interface InlineTimelineGameProps {
  gameData: ChronleGameData;
  initialOrder: string[];
  lastAttempt: { attempt: string[]; correct: boolean[] } | null;
  attemptCount: number;
  isSolved: boolean;
  isCompleted: boolean;
  gameId: string;
  viewportHeight: number;
}

// Fixed heights for layout calculation
const NAV_HEIGHT = 44; // Nav bar
const HEADER_HEIGHT = 48; // Game header (title + description)
const BUTTON_HEIGHT = 44; // Submit button
const PADDING = 24; // Top and bottom padding
const GAP_TOTAL = 10; // Total gap between 6 items (5 gaps * 2px)
const EVENT_COUNT = 6;

/**
 * Compact timeline game for inline mode - dynamically sizes events to fit viewport
 */
export function InlineTimelineGame({
  gameData,
  initialOrder,
  lastAttempt,
  attemptCount: initialAttemptCount,
  isSolved: initialSolved,
  isCompleted: initialCompleted,
  gameId,
  viewportHeight,
}: InlineTimelineGameProps) {
  // Calculate available height for events
  const availableHeight =
    viewportHeight - NAV_HEIGHT - HEADER_HEIGHT - BUTTON_HEIGHT - PADDING - GAP_TOTAL;
  const eventHeight = Math.max(32, Math.min(56, Math.floor(availableHeight / EVENT_COUNT) - 12));
  // Scale other sizes proportionally
  const imageSize = Math.max(24, Math.min(40, eventHeight - 8));
  const fontSize = eventHeight >= 44 ? 'text-sm' : 'text-xs';
  const dateFontSize = eventHeight >= 44 ? 'text-xs' : 'text-[10px]';
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [showPostGame, setShowPostGame] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [postGameStats, setPostGameStats] = useState<ChronlePostGameResponse | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ChronleEvent | null>(null);
  const hasHandledFinish = useRef(false);

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

  const { reward } = useReward('inlineRewardId', 'confetti', {
    elementCount: 100,
    spread: 60,
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100, // 100ms delay before drag activates
        tolerance: 5, // 5px movement tolerance during delay
      },
    }),
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
      if (postGameStats?.correctOrder) {
        setItems(postGameStats.correctOrder);
      }
      setShowPostGame(true);
      hasHandledFinish.current = true;
      // Don't auto-open modal for returning users
      return;
    }

    // Prevent running the finish animation multiple times
    if (hasHandledFinish.current) {
      // Just update the correct order if we get new stats
      if (postGameStats?.correctOrder) {
        setItems(postGameStats.correctOrder);
      }
      return;
    }

    // Fresh finish - animate and open modal (only once)
    hasHandledFinish.current = true;

    if (isSolved) {
      setTimeout(() => {
        reward();
      }, 800);
    } else {
      toast.error('Better luck next time');
    }

    setTimeout(() => {
      if (postGameStats?.correctOrder) {
        setItems(postGameStats.correctOrder);
      }
      setShowPostGame(true);
      // Auto-open modal for fresh finish
      setShowResultsModal(true);
    }, 1500);
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
        toast.error('Failed to submit');
      }
    } catch (error) {
      console.error('Error submitting solution:', error);
      toast.error('Failed to submit');
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

  // Compact loading state for inline
  if (initialCompleted && !postGameStats) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-[500px] flex-col px-3 py-4">
      {/* Header with game description */}
      <div className="flex justify-between items-center mb-2 shrink-0">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold truncate text-foreground">
            {isFinished && showPostGame
              ? isSolved
                ? 'Solved!'
                : `${currentAttempt?.correct.filter((c) => c).length ?? 0}/6 correct`
              : gameData.description}
          </h3>
          <p className="text-xs text-muted-foreground">
            {isFinished && showPostGame
              ? 'Correct order shown'
              : 'Drag the right to reorder (oldest first)'}
          </p>
        </div>
        {/* Confetti anchor */}
        <div id="inlineRewardId" className="w-4" />
      </div>

      {/* Sortable event list - flex grow to fill available space */}
      <div className="flex flex-col flex-1 justify-center min-h-0" style={{ touchAction: 'none' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          id="inline-timeline-game"
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-1" style={{ touchAction: 'none' }}>
              {items.map((item, index) => (
                <InlineSortableEvent
                  key={item.id}
                  id={item.id}
                  order={index}
                  event={item}
                  attemptNumber={attemptCount}
                  correct={currentAttempt?.correct[index] ?? false}
                  postGame={isFinished}
                  height={eventHeight}
                  imageSize={imageSize}
                  fontSize={fontSize}
                  dateFontSize={dateFontSize}
                  onEventClick={setSelectedEvent}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>

      {/* Bottom section - submit button or view results (always at bottom) */}
      <div className="pt-4 mt-auto shrink-0">
        {isFinished && showPostGame ? (
          <Button
            onClick={() => setShowResultsModal(true)}
            className="w-full text-sm"
            variant="default"
          >
            {isSolved ? 'View Results' : 'See How You Did'}
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={submissionLoading || isSolved}
            className="w-full text-sm"
          >
            {submissionLoading && <Loader2 className="mr-2 w-4 h-4 animate-spin" />}
            {submissionLoading ? 'Submitting...' : `Submit (${remainingAttempts} left)`}
          </Button>
        )}
      </div>

      {/* Post-game results modal */}
      <PostGameModal
        open={showResultsModal}
        onOpenChange={setShowResultsModal}
        isSolved={isSolved}
        attemptCount={attemptCount}
        correctCount={currentAttempt?.correct.filter((c) => c).length ?? 0}
        postGameStats={postGameStats}
        gameTitle={gameData.description}
      />

      {/* Event detail modal */}
      <EventDetailModal
        event={selectedEvent}
        open={selectedEvent !== null}
        onOpenChange={(open) => !open && setSelectedEvent(null)}
        showDate={isFinished}
      />
    </div>
  );
}
