import { Link } from '@/components/link';
import { Button } from '../components/ui/button';

export const HomePage = () => {
  return (
    <div className="flex grow flex-col items-center justify-evenly">
      <section
        id="game-start"
        className="flex min-h-screen w-full flex-col items-center justify-center"
      >
        <div className="w-full space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-black">Chronle</h1>
            <p>A game where you put items in order</p>
          </div>
          <div className="mx-auto flex w-full flex-col items-center gap-2 sm:max-w-[300px]">
            <Button className="w-full" href="game">
              Play
            </Button>
            <Button className="w-full" variant="outline" asChild>
              <Link href="how-to-play">How to Play</Link>
            </Button>
            <Button className="w-full" variant="ghost" asChild>
              What is it?
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};
