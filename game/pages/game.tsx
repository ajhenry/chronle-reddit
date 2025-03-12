import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Event, Prisma } from '@prisma/client'
import { useReward } from 'react-rewards'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useSetPage } from '@/hooks/usePage'
import { useDevvitListener } from '@/hooks/useDevvitListener'
import { sendToDevvit } from '@/utils'
import { Attempt } from '@/shared'
import { PostGameMetricsChart } from '@/components/post-game-charts'
import pluralize from 'pluralize'

const getDelay = (order: number) => {
  return `${order * 250}ms`
}

export function SortableEvent(props: {
  id: string
  event: Event
  order: number
  attemptNumber: number
  postGame: boolean
  correct: boolean
}) {
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
          <p>{props.event.title}</p>
          {props.postGame && (
            <p className="text-sm text-muted-foreground">
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

interface DraggableAreaProps {
  timeline: Prisma.TimelineGetPayload<{
    include: {
      events: {
        include: {
          event: true
        }
      }
    }
  }>
  lastAttempt: Attempt | null
  attemptCount: number
  solved: boolean
  finished: boolean
}

export const GameArea = () => {
  useEffect(() => {
    // send an event to the webview to kick off these requests
    sendToDevvit({
      type: 'START_GAME',
    })
  }, [])
  const dayTimeline = useDevvitListener('GET_TIMELINE_RESPONSE')
  const lastAttempt = useDevvitListener('GET_LAST_ATTEMPT_RESPONSE')

  if (!dayTimeline) {
    return <div>Loading the game</div>
  }

  return (
    <LoadedGameArea
      timeline={dayTimeline.timeline!.timeline}
      lastAttempt={lastAttempt?.lastAttempt ?? null}
      attemptCount={lastAttempt?.attemptCount ?? 0}
      solved={lastAttempt?.solved ?? false}
      finished={lastAttempt?.finished ?? false}
    />
  )
}

export function LoadedGameArea({
  timeline,
  lastAttempt,
  attemptCount,
  solved,
  finished,
}: DraggableAreaProps) {
  const lastSubmittedAttempt = useDevvitListener('SUBMIT_SOLUTION_RESPONSE')
  const postGameStats = useDevvitListener('POST_GAME_RESPONSE')
  const [submissionLoading, setSubmissionLoading] = useState(false)
  const [showPostGame, setShowPostGame] = useState(false)

  const latestAttempt: Attempt | null = lastSubmittedAttempt?.lastAttempt ?? lastAttempt ?? null

  const [items, setItems] = useState<Event[]>(
    // map the last attempt to the events from the timeline
    // if there is no last attempt, map the events from the timeline
    latestAttempt?.attempt.map(
      (eventId) => timeline.events.find(({ event }) => event.id === eventId)!.event
    ) ?? timeline.events.map(({ event }) => event)
  )

  const { reward } = useReward('rewardId', 'confetti', {
    elementCount: 200,
  })

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleSubmit = async () => {
    setSubmissionLoading(true)
    const solution = items.map((item) => item.id)

    // Log them into an anonymous account if they aren't already

    sendToDevvit({
      type: 'SUBMIT_SOLUTION',
      payload: {
        solution,
      },
    })

    setSubmissionLoading(false)
  }

  let attemptNumber = lastSubmittedAttempt?.attemptCount ?? attemptCount ?? 0
  const postGame = (finished || solved || lastSubmittedAttempt?.finished) ?? false
  const isWinner = (lastSubmittedAttempt?.solved || solved) ?? false

  useEffect(() => {
    // If it's solved, we don't need to show effects
    if (!postGame) {
      return
    }

    sendToDevvit({
      type: 'POST_GAME',
    })

    setItems(
      timeline.solution.map(
        (eventId) => timeline.events.find(({ event }) => event.id === eventId)!.event
      )
    )

    // solved means someone clicked the game after they completed it
    // Do not show effects, it's postGame
    if (solved) {
      setShowPostGame(true)
      return
    }

    if (isWinner) {
      setTimeout(() => {
        reward()
      }, 1250)
    } else {
      toast.error('Better luck next time')
    }

    setTimeout(() => {
      setShowPostGame(true)
    }, 3000)
  }, [postGame])

  const calculatePercentageBetterThan = (
    stats: { [key: string]: number },
    attemptNumber: number
  ): number => {
    // Get total number of players
    const totalPlayers = Object.values(stats).reduce((sum, count) => sum + count, 0) - 1
    if (totalPlayers <= 0) return 0

    // Sum up all players who took more attempts
    const playersWithMoreAttempts = Object.entries(stats)
      .filter(([attempt]) => parseInt(attempt) > attemptNumber)
      .reduce((sum, [_, count]) => sum + count, 0)

    // Calculate percentage and round to nearest whole number
    return Math.round((playersWithMoreAttempts / totalPlayers) * 100)
  }

  console.log('totalPlayers', postGameStats?.totalPlayers)

  return (
    <div className="flex w-full flex-col items-center justify-center p-4">
      {postGame && showPostGame && (
        <div className="mb-8 w-full max-w-md space-y-4 transition-all">
          <div>
            <h2 className="text-center text-2xl font-bold">
              {isWinner ? 'Congrats 🥳' : 'Better luck next time'}
            </h2>
            <p className="text-center text-sm">
              {isWinner
                ? 'You solved the Chronle!'
                : `Nice try, you got ${latestAttempt?.correct.filter((c) => c).length}/6 correct`}
            </p>
          </div>

          {postGameStats && (
            <div className="space-y-2">
              <h3 className="text-center text-lg font-medium">How'd you do?</h3>
              <p className="text-center">
                You got this Chronle in {attemptNumber} {pluralize('try', attemptNumber)}.{' '}
                {postGameStats.totalPlayers <= 1 ? (
                  "You're the first person to play today!"
                ) : (
                  <>
                    That's better than {postGameStats.allPlayerStats[attemptNumber]}{' '}
                    {pluralize('people', postGameStats.allPlayerStats[attemptNumber])} or{' '}
                    {calculatePercentageBetterThan(postGameStats.allPlayerStats, attemptNumber)}% of
                    players.
                  </>
                )}
              </p>
              <PostGameMetricsChart dayMetrics={postGameStats.allPlayerStats} />
              <p className="text-center text-sm text-muted-foreground">
                {postGameStats.totalPlayers}{' '}
                {postGameStats.totalPlayers === 1 ? 'person has' : 'people have'} played today
              </p>
            </div>
          )}
        </div>
      )}

      <h3 className="text-center text-lg font-medium">{timeline.description}</h3>
      <p className="text-center text-sm">Oldest event first</p>
      <div className="mt-2">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          id="game-area"
        >
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {items.map((item, index) => (
                <SortableEvent
                  key={item.id}
                  id={item.id}
                  order={index}
                  event={item}
                  attemptNumber={attemptNumber}
                  correct={latestAttempt?.correct[index] ?? false}
                  postGame={postGame}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </div>
      <p className="mt-2 text-center text-sm">Most recent event last</p>
      <div className="flex items-center justify-center">
        <div id="rewardId" className="w-12" />
      </div>
      {!postGame && (
        <Button
          onClick={handleSubmit}
          disabled={submissionLoading || isWinner || postGame}
          className="mt-4 w-full"
        >
          {submissionLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submissionLoading ? 'Submitting...' : `Submit (${6 - attemptNumber} remaining)`}
        </Button>
      )}
    </div>
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event

    if (active.id !== over?.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((search) => search.id === active.id)
        const newIndex = items.findIndex((search) => search.id === over?.id)

        return arrayMove(items, oldIndex, newIndex)
      })
    }
  }
}
