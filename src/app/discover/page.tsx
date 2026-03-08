import Image from 'next/image'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Search } from 'lucide-react'

const trendingHashtags = [
  '#dancechallenge',
  '#comedy',
  '#tech',
  '#foodie',
  '#travel',
  '#music',
]

const popularVideos = Array.from({ length: 18 }, (_, i) => ({
  id: `pop-${i}`,
  imageUrl: `https://picsum.photos/seed/${300 + i}/300/400`,
  aiHint: 'popular video'
}))

export default function DiscoverPage() {
  return (
    <div className="space-y-8 p-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input placeholder="Rechercher..." className="pl-10 text-base h-12" />
      </div>

      <div>
        <h2 className="text-xl font-bold font-headline mb-4">Tendances</h2>
        <div className="flex flex-wrap gap-2">
          {trendingHashtags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-sm px-3 py-1.5 hover:bg-accent cursor-pointer">
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold font-headline mb-4">Populaire</h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1">
          {popularVideos.map((video) => (
            <Card key={video.id} className="overflow-hidden aspect-[3/4] border-0 rounded-none">
              <CardContent className="p-0">
                <div className="relative h-full w-full">
                  <Image src={video.imageUrl} alt="Popular video" fill className="object-cover" data-ai-hint={video.aiHint} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
