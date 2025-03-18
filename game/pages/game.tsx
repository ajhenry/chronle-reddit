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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useReward } from 'react-rewards'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useDevvitListener } from '@/hooks/useDevvitListener'
import { sendToDevvit } from '@/utils'
import { PostGameMetricsChart } from '@/components/post-game-charts'
import { Attempt, Event, Timeline } from '../../src/utils/schemas'
import { GameStats } from '@/components/game-stats'
import { SortableEvent } from '@/components/sortable-event'

interface DraggableAreaProps {
  timeline: Timeline
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
  const gameData = useDevvitListener('GET_TIMELINE_RESPONSE')
  const lastAttempt = useDevvitListener('GET_LAST_ATTEMPT_RESPONSE')

  if (!gameData) {
    return <div>Loading the game</div>
  }

  return (
    <LoadedGameArea
      timeline={gameData.game!.day.timeline}
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
    if (solved || finished) {
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

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col items-center justify-center p-4">
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
              {isWinner ? (
                <p className="text-center">
                  {postGameStats && (
                    <GameStats
                      attemptNumber={attemptNumber}
                      postGameStats={postGameStats}
                      isWinner={isWinner}
                      correctCount={latestAttempt?.correct.filter((c) => c).length ?? 0}
                    />
                  )}
                </p>
              ) : (
                <p className="text-center">
                  {postGameStats && (
                    <GameStats
                      attemptNumber={attemptNumber}
                      postGameStats={postGameStats}
                      isWinner={isWinner}
                      correctCount={latestAttempt?.correct.filter((c) => c).length ?? 0}
                    />
                  )}
                </p>
              )}
              <PostGameMetricsChart dayMetrics={postGameStats.allPlayerStats} />
              <p className="text-center text-sm text-muted-foreground">
                {postGameStats.totalPlayers}{' '}
                {postGameStats.totalPlayers === 1 ? 'person has' : 'people have'} played so far
              </p>
            </div>
          )}
        </div>
      )}

      <h3 className="text-center text-lg font-medium">{timeline.description}</h3>
      <p className="text-center text-sm">Oldest event first</p>
      <div className="mt-2 w-full">
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
