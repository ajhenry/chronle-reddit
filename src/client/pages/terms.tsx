import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TermsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center px-4 mx-auto max-w-4xl h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
            className="flex gap-2 items-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container px-4 py-8 mx-auto max-w-4xl">
        <div className="max-w-none prose prose-slate dark:prose-invert prose-lg sm:prose-xl text-foreground">
          <h1 className="mb-2 text-4xl font-bold">Terms of Service</h1>
          <p className="mb-8 text-lg text-muted-foreground">Last updated: 9/10/2025</p>

          <h2>Welcome to Podium</h2>
          <p>
            By accessing and using Podium, you accept and agree to be bound by the terms and
            provision of this agreement. If you do not agree to abide by the above, please do not
            use this service.
          </p>

          <h3>1. Acceptance of Terms</h3>
          <p>
            By accessing and using Podium, you accept and agree to be bound by the terms and
            provision of this agreement. If you do not agree to abide by the above, please do not
            use this service.
          </p>

          <h3>2. Description of Service</h3>
          <p>Podium is a daily gaming platform featuring word-based games including:</p>
          <ul>
            <li>
              <strong>TOP X</strong> - Guess the top answers to trivia questions
            </li>
            <li>
              <strong>LETTERED</strong> - Complete phrases in pieces
            </li>
          </ul>
          <p>Each game can be played once per day, with new content available daily.</p>

          <h3>3. User Accounts and Data</h3>
          <p>While Podium does not require user registration for basic gameplay, we may collect:</p>
          <ul>
            <li>Game progress and completion data</li>
            <li>Anonymous usage statistics</li>
            <li>Device and browser information for technical purposes</li>
          </ul>

          <h3>4. User Conduct</h3>
          <p>You agree to:</p>
          <ul>
            <li>Use the service only for lawful purposes</li>
            <li>Not attempt to reverse engineer or modify the games</li>
            <li>Not use automated tools or bots to play games</li>
            <li>Respect the one-game-per-day limit for each game type</li>
            <li>Not share or distribute game solutions before official release</li>
          </ul>

          <h3>5. Intellectual Property</h3>
          <p>
            All game content, including questions, puzzles, graphics, and software, are the
            intellectual property of Podium. You may not reproduce, distribute, or create derivative
            works without explicit permission.
          </p>

          <h3>6. Privacy Policy</h3>
          <p>
            Your privacy is important to us. We collect minimal data necessary for game
            functionality and do not sell personal information. Game statistics may be used for
            leaderboard purposes and service improvement.
          </p>

          <h3>7. Service Availability</h3>
          <p>
            While we strive for 99.9% uptime, Podium is provided "as is" without warranties. We
            reserve the right to modify, suspend, or discontinue the service at any time.
          </p>

          <h3>8. Limitation of Liability</h3>
          <p>
            Podium and its creators shall not be liable for any indirect, incidental, special, or
            consequential damages arising from your use of the service.
          </p>

          <h3>9. Contact Information</h3>
          <p>
            For questions about these terms or the service, please contact us through the official
            channels provided in the game interface.
          </p>

          <h3>10. Changes to Terms</h3>
          <p>
            We reserve the right to modify these terms at any time. Continued use of the service
            after changes constitutes acceptance of the new terms.
          </p>

          <div className="p-6 mt-12 rounded-lg border bg-muted">
            <p className="text-sm font-medium text-center text-muted-foreground">
              By using Podium, you acknowledge that you have read, understood, and agree to be bound
              by these Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
