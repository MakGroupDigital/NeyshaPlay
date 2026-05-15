'use client'

export type PublishProgressStatus = 'uploading' | 'processing' | 'completed' | 'failed'

export type PublishProgressItem = {
  id: string
  title: string
  progress: number
  status: PublishProgressStatus
  message?: string
  updatedAt: number
}

const STORAGE_KEY = 'neyshaPublishProgress'
const EVENT_NAME = 'neysha-publish-progress'

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

export function readPublishProgress(): PublishProgressItem[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const cutoff = Date.now() - 1000 * 60 * 60
    return parsed
      .filter((item) => item && typeof item.id === 'string')
      .filter((item) => item.status === 'uploading' || item.status === 'processing' || item.updatedAt > cutoff)
      .map((item) => ({
        id: item.id,
        title: item.title || 'Publication',
        progress: clampProgress(Number(item.progress || 0)),
        status: item.status || 'uploading',
        message: item.message,
        updatedAt: Number(item.updatedAt || Date.now()),
      }))
  } catch {
    return []
  }
}

export function writePublishProgress(items: PublishProgressItem[]) {
  if (typeof window === 'undefined') return
  const normalized = items
    .map((item) => ({ ...item, progress: clampProgress(item.progress), updatedAt: item.updatedAt || Date.now() }))
    .slice(-4)
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: normalized }))
}

export function upsertPublishProgress(item: Omit<PublishProgressItem, 'updatedAt'> & { updatedAt?: number }) {
  const items = readPublishProgress()
  const nextItem = { ...item, progress: clampProgress(item.progress), updatedAt: item.updatedAt || Date.now() }
  const next = [nextItem, ...items.filter((existing) => existing.id !== item.id)]
  writePublishProgress(next)
}

export function removePublishProgress(id: string) {
  writePublishProgress(readPublishProgress().filter((item) => item.id !== id))
}

export function subscribePublishProgress(callback: (items: PublishProgressItem[]) => void) {
  if (typeof window === 'undefined') return () => undefined
  const listener = () => callback(readPublishProgress())
  window.addEventListener(EVENT_NAME, listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener(EVENT_NAME, listener)
    window.removeEventListener('storage', listener)
  }
}
