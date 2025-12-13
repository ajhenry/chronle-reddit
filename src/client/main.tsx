import './globals.css';
import '@fontsource/inter/900.css'; // Inter Black

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'sonner';
import { App } from './App';
import { ThemeProvider } from './components/theme-provider';
import { TooltipProvider } from './components/ui/tooltip';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
        <TooltipProvider>
          <App />
          <Toaster position="top-center" />
        </TooltipProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
);
