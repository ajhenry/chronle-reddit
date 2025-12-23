import './globals.css';
import '@fontsource/inter/900.css'; // Inter Black

import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { App } from './App';
import { ThemeProvider } from './components/theme-provider';
import { TooltipProvider } from './components/ui/tooltip';

// Wrapper that navigates to /custom on mount
export function CreatorApp() {
  const navigate = useNavigate();

  useEffect(() => {
    void navigate('/custom', { replace: true });
  }, []);

  return <App />;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <TooltipProvider>
          <CreatorApp />
          <Toaster position="top-center" />
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
