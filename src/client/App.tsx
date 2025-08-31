import { navigateTo } from '@devvit/web/client';
import { useRedditUser } from './hooks/useRedditUser';
import { useSupabaseCounter } from './hooks/useSupabaseCounter';
import { Button } from './components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Alert, AlertDescription } from './components/ui/alert';

export const App = () => {
  const { user: redditUser, loading: userLoading, error: userError } = useRedditUser();

  // For now, use a default postId - in a real app, this would come from the Reddit post context
  // You might want to get this from Devvit context or URL parameters
  const postId = 'default_post';

  const {
    count,
    loading: counterLoading,
    error: counterError,
    increment,
    decrement,
    canDecrement,
  } = useSupabaseCounter({
    postId,
    redditUser,
  });

  const loading = userLoading || counterLoading;
  const error = userError || counterError;

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 p-4">
      <img className="object-contain w-1/2 max-w-[200px] mx-auto" src="/snoo.png" alt="Snoo" />

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {redditUser ? `Hey u/${redditUser.reddit_handle} 👋` : 'Welcome!'}
            {redditUser && <Badge variant="secondary">Online</Badge>}
          </CardTitle>
          <CardDescription>
            Edit <code className="bg-muted px-1 py-0.5 rounded text-sm">src/client/App.tsx</code> to
            get started
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="lg"
              onClick={decrement}
              disabled={loading || !canDecrement || !!error}
              className="w-16 h-16 text-2xl font-mono"
            >
              -
            </Button>

            <div className="text-center min-w-[80px]">
              <div className="text-3xl font-bold text-primary">{loading ? '...' : count}</div>
              <div className="text-sm text-muted-foreground">Counter</div>
            </div>

            <Button
              variant="default"
              size="lg"
              onClick={increment}
              disabled={loading || !!error}
              className="w-16 h-16 text-2xl font-mono bg-red-600 hover:bg-red-700"
            >
              +
            </Button>
          </div>

          {!redditUser && !loading && (
            <Alert>
              <AlertDescription>Please log in to Reddit to use this feature</AlertDescription>
            </Alert>
          )}

          {redditUser && (
            <div className="text-center text-sm text-muted-foreground">
              Last seen: {new Date(redditUser.last_seen_at).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      <footer className="flex gap-3 text-sm text-muted-foreground mt-8">
        <Button variant="link" size="sm" asChild>
          <a href="https://developers.reddit.com/docs" target="_blank" rel="noopener noreferrer">
            Docs
          </a>
        </Button>
        <span className="text-muted-foreground/50">|</span>
        <Button variant="link" size="sm" asChild>
          <a href="https://www.reddit.com/r/Devvit" target="_blank" rel="noopener noreferrer">
            r/Devvit
          </a>
        </Button>
        <span className="text-muted-foreground/50">|</span>
        <Button variant="link" size="sm" asChild>
          <a href="https://discord.com/invite/R7yu2wh9Qz" target="_blank" rel="noopener noreferrer">
            Discord
          </a>
        </Button>
      </footer>
    </div>
  );
};
