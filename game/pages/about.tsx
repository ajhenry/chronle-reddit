import { useSetPage } from '@/hooks/usePage'
import { X } from 'lucide-react'

export const AboutPage = () => {
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
        <h2 className="font-heading max-w-4xl text-3xl font-semibold tracking-tighter sm:text-5xl md:text-6xl lg:text-7xl">
          About Chronle
        </h2>
        <div className="mt-4 max-w-2xl">
          <p className="mb-4">
            Chronle is a daily puzzle game where you're presented with a set of historical events
            and challenged to arrange them in chronological order. Each day brings a new set of
            events, testing your knowledge of history and your ability to think chronologically.
          </p>
        </div>

        <div className="mt-4 max-w-2xl">
          <h3 className="mb-4 text-2xl font-semibold">The Story Behind Chronle</h3>
          <p className="mb-4">
            Chronle was created to show the connections between historical events and how close they
            are to each other. For example, did you know that the Wright brothers' first flight
            happened just 66 years before humans landed on the moon? Or that the last woolly
            mammoths were still alive when the Great Pyramid of Giza was being built?
          </p>
        </div>

        <div className="mt-4 max-w-2xl">
          <h3 className="mb-4 text-2xl font-semibold">Play Online</h3>
          <p className="mb-4">
            Play online at <a href="https://chronle.com">chronle.com</a>
          </p>
        </div>
      </div>
    </section>
  )
}
