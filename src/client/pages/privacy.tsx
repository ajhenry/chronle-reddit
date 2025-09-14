import { Button } from '../components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Back Button */}
      <div className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center px-4 mx-auto max-w-4xl h-14">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="flex gap-2 items-center"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="container px-4 py-8 mx-auto max-w-4xl">
        <div className="max-w-none prose prose-slate dark:prose-invert prose-lg sm:prose-xl text-foreground">
          <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
          <p className="mb-8 text-lg text-muted-foreground">Last updated: 9/10/2025</p>

          <h2>Introduction</h2>
          <p>
            At Podium, we are committed to protecting your privacy and being transparent about how
            we collect, use, and protect your information. This Privacy Policy explains our
            practices regarding your personal data and your rights.
          </p>

          <h3>1. Information We Collect</h3>
          <p>We collect information in the following ways:</p>
          <ul>
            <li>
              <strong>Game Data:</strong> Game progress, scores, completion status, and gameplay
              statistics
            </li>
            <li>
              <strong>Technical Information:</strong> Device type, browser version, IP address, and
              usage patterns
            </li>
            <li>
              <strong>Reddit Integration:</strong> Basic Reddit user information when you connect
              your account
            </li>
            <li>
              <strong>Anonymous Analytics:</strong> Usage statistics to improve our service
            </li>
          </ul>

          <h3>2. How We Use Your Information</h3>
          <p>Your information is used for the following purposes:</p>
          <ul>
            <li>Providing and improving game functionality</li>
            <li>Maintaining leaderboards and game statistics</li>
            <li>Ensuring fair play and preventing abuse</li>
            <li>Technical support and troubleshooting</li>
            <li>Service optimization and feature development</li>
          </ul>

          <h3>3. Information Sharing and Disclosure</h3>
          <p>
            We do not sell, trade, or rent your personal information to third parties. We may share
            information only in these limited circumstances:
          </p>
          <ul>
            <li>With your explicit consent</li>
            <li>To comply with legal obligations</li>
            <li>To protect our rights and prevent harm</li>
            <li>In connection with a business transfer</li>
          </ul>

          <h3>4. Data Security</h3>
          <p>
            We implement appropriate technical and organizational measures to protect your personal
            information against unauthorized access, alteration, disclosure, or destruction. This
            includes encryption of data in transit and at rest, secure server infrastructure, and
            regular security audits.
          </p>

          <h3>5. Data Retention</h3>
          <p>
            We retain your personal information only as long as necessary for the purposes outlined
            in this Privacy Policy. Game data and statistics may be retained indefinitely for
            leaderboard and historical purposes, while other data is deleted when no longer needed.
          </p>

          <h3>6. Your Rights</h3>
          <p>You have the following rights regarding your personal information:</p>
          <ul>
            <li>
              <strong>Access:</strong> Request a copy of the information we hold about you
            </li>
            <li>
              <strong>Correction:</strong> Request correction of inaccurate or incomplete data
            </li>
            <li>
              <strong>Deletion:</strong> Request deletion of your personal information
            </li>
            <li>
              <strong>Portability:</strong> Request transfer of your data in a structured format
            </li>
            <li>
              <strong>Opt-out:</strong> Opt out of non-essential data collection
            </li>
          </ul>

          <h3>7. Cookies and Tracking</h3>
          <p>
            We use cookies and similar technologies to enhance your experience and analyze usage
            patterns. These technologies help us remember your preferences, maintain game state, and
            improve our service. You can control cookie settings through your browser preferences.
          </p>

          <h3>8. Third-Party Services</h3>
          <p>
            Podium integrates with Reddit for user authentication and community features. When you
            connect your Reddit account, we access only the basic information necessary for game
            functionality. Third-party services have their own privacy policies which we encourage
            you to review.
          </p>

          <h3>9. Children's Privacy</h3>
          <p>
            Podium is not intended for children under 13 years of age. We do not knowingly collect
            personal information from children under 13. If we become aware that we have collected
            personal information from a child under 13, we will take steps to delete such
            information.
          </p>

          <h3>10. Changes to This Privacy Policy</h3>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any material
            changes by posting the new Privacy Policy on this page and updating the "Last updated"
            date. Your continued use of Podium after changes take effect constitutes acceptance of
            the updated policy.
          </p>

          <h3>11. Contact Us</h3>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please
            contact us through the official channels provided in the game interface.
          </p>

          <div className="p-6 mt-12 rounded-lg border bg-muted">
            <p className="text-sm font-medium text-center text-muted-foreground">
              By using Podium, you acknowledge that you have read, understood, and agree to our
              collection and use of information as described in this Privacy Policy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
