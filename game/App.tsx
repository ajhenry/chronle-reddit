import { Page } from './shared';
import { GameArea } from './pages/game';
import { HomePage } from './pages/home';
import { usePage } from './hooks/usePage';
import { useEffect, useState } from 'react';
import { sendToDevvit } from './utils';
import { useDevvitListener } from './hooks/useDevvitListener';
import { ThemeProvider } from 'next-themes';
import { NextUIProvider } from '@nextui-org/react';

const getPage = (page: Page, { postId }: { postId: string }) => {
  switch (page) {
    case 'home':
      return <HomePage postId={postId} />;
    case 'game':
      return <GameArea />;
    case 'how-to-play':
      return <HowToPlayPage />;
    default:
      throw new Error(`Unknown page: ${page satisfies never}`);
  }
};

export const App = () => {
  const [postId, setPostId] = useState('');
  const page = usePage();
  const initData = useDevvitListener('INIT_RESPONSE');
  useEffect(() => {
    sendToDevvit({ type: 'INIT' });
  }, []);

  useEffect(() => {
    if (initData) {
      setPostId(initData.postId);
    }
  }, [initData, setPostId]);

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NextUIProvider>
        <div className="h-full">{getPage(page, { postId })}</div>
      </NextUIProvider>
    </ThemeProvider>
  );
};
