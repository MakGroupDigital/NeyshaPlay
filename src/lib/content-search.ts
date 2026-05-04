import type { User, Video } from '@/lib/types'

export function normalizeSearchValue(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

export function extractTags(value?: string) {
  return Array.from(new Set((value || '').match(/#[\p{L}\p{N}_-]+/gu) || []))
    .map((tag) => normalizeSearchValue(tag.replace(/^#/, '')))
    .filter(Boolean)
}

export function parseSearchPrice(value: string) {
  const normalized = normalizeSearchValue(value)
  const amount = Number((normalized.match(/\d+(?:[.,]\d+)?/)?.[0] || '').replace(',', '.'))
  if (!Number.isFinite(amount) || amount <= 0) return null
  if (/(moins|inferieur|under|max|<=)/.test(normalized)) return { mode: 'max' as const, amount }
  if (/(plus|superieur|over|min|>=)/.test(normalized)) return { mode: 'min' as const, amount }
  if (/(prix|usd|\$|payant|contenu)/.test(normalized)) return { mode: 'around' as const, amount }
  return null
}

export function videoMatchesSearch(video: Video, rawTerm: string) {
  const term = normalizeSearchValue(rawTerm)
  if (term.length < 2) return false
  const tags = extractTags(video.description).join(' ')
  const searchable = normalizeSearchValue(
    `${video.description || ''} ${video.song || ''} ${video.user?.name || ''} ${video.user?.username || ''} ${tags} ${video.isPaid ? 'payant premium' : 'gratuit'} ${video.price || ''} ${video.currency || 'USD'}`
  )
  const priceSearch = parseSearchPrice(rawTerm)
  const price = Number(video.price || 0)
  const priceMatches =
    priceSearch &&
    Number.isFinite(price) &&
    price > 0 &&
    (priceSearch.mode === 'max'
      ? price <= priceSearch.amount
      : priceSearch.mode === 'min'
        ? price >= priceSearch.amount
        : Math.abs(price - priceSearch.amount) <= Math.max(1, priceSearch.amount * 0.2))
  return searchable.includes(term.replace(/^#/, '')) || Boolean(priceMatches)
}

export function creatorMatchesSearch(creator: User, rawTerm: string) {
  const term = normalizeSearchValue(rawTerm)
  if (term.length < 2) return false
  const searchable = normalizeSearchValue(
    `${creator.name || ''} ${creator.username || ''} ${creator.bio || ''} ${creator.city || ''} ${creator.country || ''} ${creator.role || ''}`
  )
  return searchable.includes(term.replace(/^@/, ''))
}
