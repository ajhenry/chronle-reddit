import { cn } from '@/lib/utils'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEffect, useState } from 'react'
import { SortableEventProps, getDelay } from '../utils/game'

/**
 * A draggable event item in the game timeline
 */
export function SortableEvent(props: SortableEventProps) {
  // When a user moves an item, update the previous index, do not highlight it
  // When a user submits an answer, highlight the correct/incorrect items, this happens when the attempt number changes
  // When a user moves an item after submitting an answer, reset the previous index, do not highlight it
  const [previousIndex, setPreviousIndex] = useState(props.order)
  const [attemptNumber, setAttemptNumber] = useState(props.attemptNumber)
  const [moved, setMoved] = useState(false)

  const shouldHighlight = !moved && props.attemptNumber > 0

  useEffect(() => {
    if (previousIndex !== props.order) {
      setPreviousIndex(props.order)
      setMoved(true)
    }
  }, [props.order])

  useEffect(() => {
    if (props.attemptNumber !== attemptNumber) {
      setAttemptNumber(props.attemptNumber)
      setMoved(false)
    }
  }, [props.attemptNumber])

  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: props.id,
    disabled: props.postGame,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const chooseBackground = () => {
    if (!shouldHighlight) {
      return 'bg-background'
    }

    if (props.correct) {
      return 'bg-success'
    }

    return 'bg-accent'
  }

  const chooseAccentColor = () => {
    if (!shouldHighlight) {
      return 'text-foreground'
    }

    if (props.correct) {
      return 'text-foreground dark:text-background'
    }

    return 'text-foreground'
  }

  const shouldDelay = props.attemptNumber > 0 && !moved

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          chooseBackground(),
          'flex w-full touch-manipulation space-x-4 rounded border-2 border-border transition duration-500 ease-in-out'
        )}
        style={{
          transitionDelay: shouldDelay ? getDelay(props.order) : '0ms',
        }}
      >
        <div className="flex items-center justify-center">
          <img
            src={props.event.imageUrl}
            alt={`${props.event.title} Image`}
            width="160"
            height={160}
            className="h-12 w-16 object-cover"
          />
        </div>
        <div className="flex min-h-12 w-full flex-col justify-center">
          <p
            className={cn('text-foreground', chooseAccentColor())}
            style={{
              transitionDelay: shouldDelay ? getDelay(props.order) : '0ms',
            }}
          >
            {props.event.title}
          </p>
          {props.postGame && (
            <p
              className={cn('text-foreground', chooseAccentColor(), 'text-sm')}
              style={{
                transitionDelay: shouldDelay ? getDelay(props.order) : '0ms',
              }}
            >
              {new Date(props.event.date).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          )}
        </div>
        <div
          className="flex w-10 touch-none items-center justify-center"
          {...attributes}
          {...listeners}
        >
          <div className="handle" />
        </div>
      </div>
    </div>
  )
}
