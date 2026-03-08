'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, Plus, User as UserIcon, Search, Wallet } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { doc } from 'firebase/firestore'
import { useDoc, useFirestore, useUser } from '@/firebase'
import type { User, UserRole } from '@/lib/types'

export function BottomNavBar() {
  const pathname = usePathname()
  const { user: authUser, loading } = useUser()
  const firestore = useFirestore()
  const router = useRouter()
  const [cachedRole, setCachedRole] = useState<UserRole | null>(null)

  const userDocRef = useMemo(() => {
    if (!firestore || !authUser) return null
    return doc(firestore, 'users', authUser.uid)
  }, [firestore, authUser])

  const { data: profile } = useDoc<User>(userDocRef)

  useEffect(() => {
    if (!authUser) {
      setCachedRole(null)
      return
    }
    try {
      const stored = localStorage.getItem(`userRole:${authUser.uid}`)
      if (stored === 'user' || stored === 'creator') {
        setCachedRole(stored as UserRole)
      }
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [authUser])

  useEffect(() => {
    if (!authUser || !profile?.role) return
    setCachedRole(profile.role)
    try {
      localStorage.setItem(`userRole:${authUser.uid}`, profile.role)
    } catch {
      // Ignore storage errors (private mode, etc.)
    }
  }, [authUser, profile?.role])

  const effectiveRole = profile?.role || cachedRole

  const handleAuthClick = (href: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!loading && !authUser) {
      e.preventDefault()
      router.push('/login')
    }
  }

  // Menu items based on user role
  const getMenuItems = () => {
    if (!authUser) {
      // Not logged in - show basic menu
      return [
        { href: '/', label: 'Play', icon: Play },
        { href: '/discover', label: 'Rechercher', icon: Search },
        { href: '/profile', label: 'Profil', icon: UserIcon, auth: true },
      ]
    }

    if (effectiveRole === 'creator') {
      // Creator menu
      return [
        { href: '/', label: 'Play', icon: Play },
        { href: '/create', label: 'Créer', icon: Plus, center: true },
        { href: '/wallet', label: 'Portefeuille', icon: Wallet, auth: true },
        { href: '/profile', label: 'Profil', icon: UserIcon, auth: true },
      ]
    }

    // User menu (default)
    return [
      { href: '/', label: 'Play', icon: Play },
      { href: '/discover', label: 'Rechercher', icon: Search },
      { href: '/profile', label: 'Profil', icon: UserIcon, auth: true },
    ]
  }

  const menuItems = getMenuItems()
  const hasCenterButton = menuItems.some(item => item.center)
  const centerIndex = menuItems.findIndex(item => item.center)
  const leftItems = hasCenterButton ? menuItems.slice(0, centerIndex) : menuItems
  const rightItems = hasCenterButton ? menuItems.slice(centerIndex + 1) : []
  const centerItem = hasCenterButton ? menuItems[centerIndex] : null
  const CenterIcon = centerItem?.icon

  return (
    <div
      className={cn(
        "fixed bottom-[calc(0.75rem+env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 w-[calc(100%-2rem-env(safe-area-inset-left)-env(safe-area-inset-right))] max-w-sm z-50",
        hasCenterButton
          ? "h-20 bg-transparent"
          : "h-16 bg-background/85 backdrop-blur-xl border border-white/10 rounded-full shadow-lg shadow-black/30"
      )}
    >
      <div className="relative flex items-center h-full w-full">
        {hasCenterButton && centerItem && CenterIcon && (
          <Link
            href={centerItem.href}
            passHref
            className="absolute left-1/2 -translate-x-1/2 -top-6"
          >
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/40 bg-primary text-primary-foreground shadow-[0_0_30px_hsl(var(--primary)/0.35)]">
              <div className="absolute -inset-2 rounded-[1.35rem] bg-primary/20 blur-xl" aria-hidden />
              <div className="absolute -inset-1 rounded-[1.25rem] border border-primary/30" aria-hidden />
              <CenterIcon className="relative h-8 w-8" />
            </div>
          </Link>
        )}

        <div className={cn(
          "flex items-center h-full w-full px-2",
          hasCenterButton ? "gap-3" : ""
        )}>
          {hasCenterButton ? (
            <>
              <div className="flex flex-1 items-center justify-evenly h-14 rounded-full bg-background/85 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30">
                {leftItems.map((item) => {
                  const isActive = pathname === item.href
                  const linkProps = item.auth ? { onClick: handleAuthClick(item.href) } : {}
                  return (
                    <Link key={item.href} href={item.href} passHref className="flex-1" {...linkProps}>
                      <div
                        className={cn(
                          'flex flex-col items-center justify-center h-full text-[11px] font-medium transition-colors',
                          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className={cn(isActive && 'text-primary')}>{item.label}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>

              <div className="w-16" aria-hidden />

              <div className="flex flex-1 items-center justify-evenly h-14 rounded-full bg-background/85 backdrop-blur-xl border border-white/10 shadow-lg shadow-black/30">
                {rightItems.map((item) => {
                  const isActive = pathname === item.href
                  const linkProps = item.auth ? { onClick: handleAuthClick(item.href) } : {}
                  return (
                    <Link key={item.href} href={item.href} passHref className="flex-1" {...linkProps}>
                      <div
                        className={cn(
                          'flex flex-col items-center justify-center h-full text-[11px] font-medium transition-colors',
                          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5" />
                        <span className={cn(isActive && 'text-primary')}>{item.label}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-evenly">
              {menuItems.map((item) => {
                const isActive = pathname === item.href
                const linkProps = item.auth ? { onClick: handleAuthClick(item.href) } : {}
                return (
                  <Link key={item.href} href={item.href} passHref className="flex-1" {...linkProps}>
                    <div
                      className={cn(
                        'flex flex-col items-center justify-center h-full text-xs font-medium transition-colors',
                        isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <item.icon className="h-6 w-6" />
                      <span className={cn(isActive && 'text-primary')}>{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
