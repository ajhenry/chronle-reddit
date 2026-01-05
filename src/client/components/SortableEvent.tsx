import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useEffect, useState } from 'react';
import { cn } from 'src/lib/utils';
import type { ChronleEvent } from '../../shared/types/chronle';

interface SortableEventProps {
  id: string;
  order: number;
  event: ChronleEvent;
  attemptNumber: number;
  correct: boolean;
  postGame: boolean;
}

// Get delay based on order for staggered animations
function getDelay(order: number): string {
  return `${order * 150}ms`;
}

export function SortableEvent({
  id,
  order,
  event,
  attemptNumber,
  correct,
  postGame,
}: SortableEventProps) {
  const [previousIndex, setPreviousIndex] = useState(order);
  const [currentAttemptNumber, setCurrentAttemptNumber] = useState(attemptNumber);
  const [moved, setMoved] = useState(false);

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
          'flex w-full touch-manipulation space-x-4 rounded border-2 border-border transition duration-500 ease-in-out'
        )}
        style={{
          transitionDelay: shouldDelay ? getDelay(order) : '0ms',
        }}
      >
        {/* Event Image */}
        <div className="flex items-center justify-center">
          <img
            src={event.imageUrl}
            alt={`${event.title} Image`}
            className="h-12 w-16 object-cover"
            draggable={false}
          />
        </div>

        {/* Event Content */}
        <div className="flex min-h-12 w-full flex-col justify-center py-2">
          <p
            className={cn('text-foreground', chooseTextColor())}
            style={{
              transitionDelay: shouldDelay ? getDelay(order) : '0ms',
            }}
          >
            {event.title}
          </p>
          {postGame && (
            <p
              className={cn('text-foreground text-sm', chooseTextColor())}
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

        {/* Drag Handle */}
        <div
          className="flex w-10 touch-none items-center justify-center"
          {...attributes}
          {...listeners}
        >
          <div className="handle" />
        </div>
      </div>
    </div>
  );
}
