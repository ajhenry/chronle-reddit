import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TutorialEvent {
  id: string
  title: string
  date: string
  imageUrl: string
}

const tutorialEvents: TutorialEvent[] = [
  {
    id: '1',
    title: 'First Event',
    date: '1900',
    imageUrl: 'https://i.redd.it/ldps1mf7bipe1.jpeg',
  },
  {
    id: '2',
    title: 'Second Event',
    date: '1950',
    imageUrl: 'https://i.redd.it/zw2g2bd7bipe1.jpeg',
  },
  {
    id: '3',
    title: 'Third Event',
    date: '2000',
    imageUrl: 'https://i.redd.it/1l2htpg7bipe1.jpeg',
  },
]

const STEP_DURATION = 4000 // 4 seconds per step
const REORDER_DURATION = 2000 // 2 seconds for reordering animation

// Initial order: 2, 1, 3
const initialOrder = [tutorialEvents[1], tutorialEvents[0], tutorialEvents[2]]

export function HowToPlayAnimation() {
  const [step, setStep] = useState(0)
  const [events, setEvents] = useState(initialOrder)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  // Reset animation state when step changes to 0
  useEffect(() => {
    if (step === 0) {
      setEvents(initialOrder)
      setIsReordering(false)
      setDraggingId(null)
    }
  }, [step])

  const nextStep = () => {
    setStep((prev) => (prev + 1) % 4) // Loop through steps 0-3
  }

  // Auto-play steps
  useEffect(() => {
    if (!isPlaying) return

    const timer = setInterval(() => {
      nextStep()
    }, STEP_DURATION)

    return () => clearInterval(timer)
  }, [isPlaying])

  // Handle reordering animation in step 2
  useEffect(() => {
    if (step === 2 && !isReordering) {
      setIsReordering(true)

      // Wait a bit before starting the reorder animation
      const timer = setTimeout(() => {
        // Find event 1 (earliest event)
        const earliestEvent = tutorialEvents[0]
        setDraggingId(earliestEvent.id)

        setTimeout(() => {
          setEvents((prev) => {
            const newEvents = [...prev]
            const earliestIndex = newEvents.findIndex((e) => e.id === earliestEvent.id)
            if (earliestIndex !== 0) {
              ;[newEvents[0], newEvents[earliestIndex]] = [newEvents[earliestIndex], newEvents[0]]
            }
            return newEvents
          })
          setDraggingId(null)
        }, 500)
      }, 1000)

      return () => clearTimeout(timer)
    }
  }, [step])

  return (
    <div className="mx-auto w-full max-w-[600px]">
      <div className="space-y-4">
        <div className="space-y-2">
          {events.map((event, index) => (
            <motion.div
              key={event.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className={cn(
                'flex w-full space-x-4 rounded border-2 bg-background p-2',
                step === 2 && index === 0 && 'bg-green-400 dark:bg-green-900',
                step === 2 && index === 1 && 'bg-accent'
              )}
            >
              <div>
                <img src={event.imageUrl} alt={event.title} className="h-12 w-16 object-cover" />
              </div>
              <div className="flex min-h-12 w-full flex-col justify-center text-left">
                <p>{event.title}</p>
                {step === 3 && <p className="text-sm text-muted-foreground">{event.date}</p>}
              </div>
              <div className="relative flex w-10 items-center justify-center">
                <div className="handle" />
                {step === 2 && draggingId === event.id && (
                  <motion.div
                    className="absolute inset-0 rounded-full border-2 border-primary"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <p>Welcome to Chronle! Let's learn how to play.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  You'll be given a set of events that need to be put in chronological order.
                </p>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <p>Use the handle (6 dots) on the right to drag and reorder events.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The top should be the earliest event, and the bottom should be the latest.
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <p>When you submit, correct events will be highlighted in green.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Incorrect events will turn solid.
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center"
              >
                <p>Once all events are correct or you run out of moves, the game ends.</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The actual dates will be revealed after the game.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
