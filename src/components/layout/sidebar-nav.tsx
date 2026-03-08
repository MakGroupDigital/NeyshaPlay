'use client'

import {
  Home,
  Search,
  PlusSquare,
  User,
} from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarContent,
} from '@/components/ui/sidebar'
import { CreatePostDialog } from '../create-post-dialog'
import { Separator } from '../ui/separator'

const menuItems = [
  { href: '/', label: 'Flux', icon: Home },
  { href: '/discover', label: 'Découvrir', icon: Search },
  { href: '/profile', label: 'Profil', icon: User },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <>
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2">
          <Image src="https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png" alt="NeyshaPlay Logo" width={32} height={32} className="h-8 w-8" />
          <h1 className="text-xl font-bold text-primary-foreground font-headline">NeyshaPlay</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className="font-medium"
                >
                  <span>
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className='mt-auto'>
        <Separator className="my-2" />
        <CreatePostDialog>
          <SidebarMenuButton
            variant="default"
            className="w-full font-medium text-primary-foreground bg-primary hover:bg-primary/90"
          >
            <PlusSquare className="h-5 w-5" />
            Créer
          </SidebarMenuButton>
        </CreatePostDialog>
      </SidebarFooter>
    </>
  )
}
