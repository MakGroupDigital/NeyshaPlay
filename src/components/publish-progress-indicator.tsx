'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  readPublishProgress,
  removePublishProgress,
  subscribePublishProgress,
  type PublishProgressItem,
} from '@/lib/publish-progress'

export function PublishProgressIndicator() {
  const [items, setItems] = useState<PublishProgressItem[]>([])

  useEffect(() => {
    setItems(readPublishProgress())
    return subscribePublishProgress(setItems)
  }, [])

  useEffect(() => {
    const done = items.filter((item) => item.status === 'completed')
    if (done.length === 0) return
    const timeout = window.setTimeout(() => {
      done.forEach((item) => removePublishProgress(item.id))
    }, 3500)
    return () => window.clearTimeout(timeout)
  }, [items])

  const active = useMemo(() => items[0], [items])
  if (!active) return null

  const progress = Math.round(active.progress)
  const radius = 20
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (progress / 100) * circumference
  const isFailed = active.status === 'failed'
  const isDone = active.status === 'completed'

  return (
    <div className="pointer-events-none fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-[calc(1rem+env(safe-area-inset-right))] z-[80]">
      <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-white/10 bg-black/80 py-2 pl-2 pr-4 text-white shadow-2xl shadow-black/40 backdrop-blur-md">
        <div className="relative h-12 w-12">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48" aria-hidden="true">
            <circle cx="24" cy="24" r={radius} className="fill-none stroke-white/15" strokeWidth="4" />
            <circle
              cx="24"
              cy="24"
              r={radius}
              className={cn('fill-none transition-all duration-300', isFailed ? 'stroke-destructive' : 'stroke-primary')}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            {isDone ? (
              <Check className="h-5 w-5 text-primary" />
            ) : isFailed ? (
              <X className="h-5 w-5 text-destructive" />
            ) : (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            )}
          </div>
        </div>
        <div className="min-w-0">
          <p className="max-w-40 truncate text-sm font-semibold">{active.title}</p>
          <p className="text-xs text-white/70">{active.message || `${progress}%`}</p>
        </div>
      </div>
    </div>
  )
}
