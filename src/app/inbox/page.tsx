import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { mockNotifications } from '@/lib/data'
import { cn } from '@/lib/utils'

export default function InboxPage() {
  return (
    <Card className="w-full h-full border-0">
      <CardHeader className="pt-8">
        <CardTitle className="font-headline text-center">Boîte de Réception</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="activity" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="activity">Activité</TabsTrigger>
            <TabsTrigger value="messages">Messages</TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-6">
            <div className="space-y-4">
              {mockNotifications.map((notif) => (
                <div key={notif.id} className={cn(
                  "flex items-start gap-4 p-3 rounded-lg",
                  !notif.read && "bg-accent"
                )}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={notif.user.avatarUrl} alt={notif.user.name} />
                    <AvatarFallback>{notif.user.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-semibold">{notif.user.name}</span>{' '}
                      {notif.content}
                    </p>
                    <p className="text-xs text-muted-foreground">{notif.timestamp}</p>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="messages" className="mt-6">
            <div className="text-center text-muted-foreground py-16">
              <h3 className="text-lg font-semibold">Messagerie Directe</h3>
              <p className="text-sm">Les messages de vos amis apparaîtront ici.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
