'use client'

import { usePathname } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { BottomNavBar } from '@/components/layout/bottom-nav-bar'
import { cn } from '@/lib/utils'

export function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const noNavPages = ['/create', '/login']
  const isNoNavPage = noNavPages.includes(pathname)
  const isHomePage = pathname === '/'

  return (
      <div className="flex h-[100dvh] flex-col bg-background">
        {!isNoNavPage && <Header />}
        <main className={cn(
          "flex-1 overflow-y-auto overscroll-y-contain scroll-native",
           isHomePage
             ? 'snap-y snap-mandatory no-scrollbar bg-black'
             : isNoNavPage
               ? 'no-scrollbar'
               : 'no-scrollbar pt-[calc(4rem+env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))] pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]'
        )}>
          {children}
        </main>
        {!isNoNavPage && <BottomNavBar />}
      </div>
  )
}
