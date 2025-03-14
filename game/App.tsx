import { Page } from './shared'
import { GameArea } from './pages/game'
import { HomePage } from './pages/home'
import { usePage } from './hooks/usePage'
import { useEffect } from 'react'
import { sendToDevvit } from './utils'
import { ThemeProvider } from 'next-themes'
import { NextUIProvider } from '@nextui-org/react'
import { HowToPlayPage } from './pages/how-to-play'
import { AboutPage } from './pages/about'
import { Toaster } from '@/components/ui/sonner'

const getPage = (page: Page) => {
  switch (page) {
    case 'home':
      return <HomePage />
    case 'game':
      return <GameArea />
    case 'how-to-play':
      return <HowToPlayPage />
    case 'about':
      return <AboutPage />
    default:
      throw new Error(`Unknown page: ${page satisfies never}`)
  }
}

export const App = () => {
  const page = usePage()
  useEffect(() => {
    sendToDevvit({ type: 'INIT' })
  }, [])

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <NextUIProvider>
        <div className="h-full bg-background">{getPage(page)}</div>
        <Toaster />
      </NextUIProvider>
    </ThemeProvider>
  )
}
