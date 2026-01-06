import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState, useRef } from 'react';
import { cn } from 'src/lib/utils';
import type { ChronleEvent } from '../../shared/types/chronle';

interface InlineSortableEventProps {
  id: string;
  order: number;
  event: ChronleEvent;
  attemptNumber: number;
  correct: boolean;
  postGame: boolean;
  // Dynamic sizing props
  height?: number;
  imageSize?: number;
  fontSize?: string;
  dateFontSize?: string;
  // Click handler
  onEventClick?: (event: ChronleEvent) => void;
}

// Get delay based on order for staggered animations
function getDelay(order: number): string {
  return `${order * 100}ms`;
}

/**
 * Compact sortable event card for inline mode - dynamically sized
 */
export function InlineSortableEvent({
  id,
  order,
  event,
  attemptNumber,
  correct,
  postGame,
  height = 44,
  imageSize = 32,
  fontSize = 'text-sm',
  dateFontSize = 'text-xs',
  onEventClick,
}: InlineSortableEventProps) {
  const [previousIndex, setPreviousIndex] = useState(order);
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(attemptNumber);
  const [moved, setMoved] = useState(false);
  const handleRef = useRef<HTMLDivElement>(null);

  const shouldHighlight = !moved && attemptNumber > 0;

  useEffect(() => {
    if (previousIndex !== order) {
      setPreviousIndex(order);
      setMoved(true);
    }
  }, [order, previousIndex]);

  useEffect(() => {
    if (attemptNumber !== currentAttemptNumber) {
      setCurrentAttemptNumber(attemptNumber);
      setMoved(false);
    }
  }, [attemptNumber, currentAttemptNumber]);

  // Add native event listeners with passive: false to allow preventDefault
  useEffect(() => {
    const handle = handleRef.current;
    if (!handle || postGame) return;

    const preventScroll = (e: TouchEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Use capture phase and passive: false to intercept before browser handles
    handle.addEventListener('touchstart', preventScroll, { passive: false, capture: true });
    handle.addEventListener('touchmove', preventScroll, { passive: false, capture: true });

    return () => {
      handle.removeEventListener('touchstart', preventScroll, { capture: true });
      handle.removeEventListener('touchmove', preventScroll, { capture: true });
    };
  }, [postGame]);

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id,
    disabled: postGame,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const chooseBackground = () => {
    if (!shouldHighlight) {
      return 'bg-background';
    }

    if (correct) {
      return 'bg-success';
    }

    return 'bg-accent';
  };

  const chooseTextColor = () => {
    if (!shouldHighlight) {
      return 'text-foreground';
    }

    if (correct) {
      return 'text-foreground dark:text-background';
    }

    return 'text-foreground';
  };

  const shouldDelay = attemptNumber > 0 && !moved;

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          chooseBackground(),
          'flex gap-2 items-center px-2 w-full rounded border transition duration-300 ease-in-out touch-manipulation border-border'
        )}
        style={{
          transitionDelay: shouldDelay ? getDelay(order) : '0ms',
          height: `${height}px`,
        }}
      >
        {/* Clickable content area */}
        <div
          className="flex flex-1 cursor-pointer items-center gap-2 min-w-0"
          onClick={() => onEventClick?.(event)}
        >
          {/* Event Image - dynamically sized */}
          <div
            className="flex overflow-hidden justify-center items-center rounded shrink-0"
            style={{ width: `${imageSize * 1.25}px`, height: `${imageSize}px` }}
          >
            <img
              src={event.imageUrl}
              alt={`${event.title}`}
              className="object-cover w-full h-full"
              draggable={false}
            />
          </div>

          {/* Event Content - dynamically sized text */}
          <div className="flex flex-col flex-1 justify-center min-w-0">
            <p
              className={cn('font-medium leading-snug truncate', fontSize, chooseTextColor())}
              style={{
                transitionDelay: shouldDelay ? getDelay(order) : '0ms',
              }}
            >
              {event.title}
            </p>
            {postGame && (
              <p
                className={cn('leading-snug opacity-80', dateFontSize, chooseTextColor())}
                style={{
                  transitionDelay: shouldDelay ? getDelay(order) : '0ms',
                }}
              >
                {new Date(event.date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
        </div>

        {/* Drag Handle */}
        {!postGame && (
          <div
            ref={handleRef}
            className="flex justify-center items-center shrink-0 cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none', width: `${height}px`, height: `${height}px` }}
            {...attributes}
            {...listeners}
          >
            <div className="handle-inline" />
          </div>
        )}
      </div>
    </div>
  );
}
