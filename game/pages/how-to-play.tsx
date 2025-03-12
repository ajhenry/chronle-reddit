import { useSetPage } from '@/hooks/usePage'
import { HowToPlayAnimation } from '../components/how-to-play-animation'
import { X } from 'lucide-react'
export const HowToPlayPage = () => {
  const setPage = useSetPage()

  const handleClose = () => {
    setPage('home')
  }

  return (
    <section id="about" className="relative space-y-6 pt-12">
      <button
        onClick={handleClose}
        className="absolute right-4 top-4 text-xl font-bold"
        aria-label="Close"
      >
        <X />
      </button>
      <div className="container flex flex-col items-center gap-8 text-center">
        <h3
          id="how-to-play"
          className="font-heading max-w-4xl text-2xl font-semibold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl"
        >
          How to Play
        </h3>
        <div className="mx-auto w-full max-w-2xl">
          <HowToPlayAnimation />
        </div>
        <div className="max-w-2xl space-y-4">
          <ol className="list-inside list-decimal space-y-2 text-left">
            <li>You'll be given a set of historical events with images</li>
            <li>Use the handle (6 dots) on the right of each event to drag and reorder them</li>
            <li>Place the earliest event at the top and the latest event at the bottom</li>
            <li>You have 6 moves to get the correct order</li>
            <li>After each submission, correct events will be highlighted in green</li>
            <li>Incorrect events will be highlighted with an accent color</li>
            <li>Once all events are correct or you run out of moves, the game ends</li>
          </ol>
        </div>

        <div className="mt-8 grid w-full max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Game Rules</h3>
            <ul className="list-inside list-disc space-y-2 text-left">
              <li>One game per day</li>
              <li>Games reset at midnight UTC</li>
              <li>6 moves to solve the puzzle</li>
              <li>All players get the same events each day</li>
              <li>Events are selected from various historical periods</li>
            </ul>
          </div>
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold">Features</h3>
            <ul className="list-inside list-disc space-y-2 text-left">
              <li>Daily challenges with new events</li>
              <li>Visual feedback for correct/incorrect positions</li>
              <li>Historical images for each event</li>
              <li>Progress tracking across devices (account required)</li>
              <li>Unlimited mode coming soon</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
