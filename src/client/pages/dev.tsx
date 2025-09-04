import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Settings } from 'lucide-react';
import { Grid } from '../components/do-it/do-it';
import { ModeToggle } from '../components/mode-toggle';

interface DevPageProps {
  onBack?: () => void;
}

export const DevPage = ({ onBack }: DevPageProps) => {
  return (
    <div className="p-4 min-h-screen bg-background">
      {/* Theme Toggle - Fixed in top right */}
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>

      <div className="mx-auto space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex gap-3 items-center">
            <div className="p-2 rounded-full bg-primary/20">
              <Settings className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Development Tools</h1>
              <p className="text-sm text-muted-foreground">
                Development utilities and testing tools
              </p>
            </div>
          </div>
          {onBack && (
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back
            </Button>
          )}
        </div>

        {/* DND Kit Grid Layout Example */}
        <div className="w-full h-full">
          <Grid />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Development Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Environment</h3>
                  <p className="text-sm text-muted-foreground">Development Mode</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Version</h3>
                  <p className="text-sm text-muted-foreground">Snoodle Dev Build</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Status</h3>
                  <p className="text-sm text-muted-foreground">Development page is working</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => console.log('Dev action 1')}
                >
                  Debug Action 1
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => console.log('Dev action 2')}
                >
                  Debug Action 2
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => console.log('Dev action 3')}
                >
                  Debug Action 3
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Development Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• This is the development page for Snoodle</p>
              <p>• Add any development tools or debugging utilities here</p>
              <p>• This page should only be accessible during development</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
