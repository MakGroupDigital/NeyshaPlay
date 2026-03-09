'use client'

import Image from 'next/image';
import Link from 'next/link';
import { TopCreators } from '@/components/top-creators';

export function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 flex items-center justify-start border-b border-white/5 bg-black/40 backdrop-blur-xl h-[calc(4rem+env(safe-area-inset-top))] pt-[env(safe-area-inset-top)] pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))] sm:pl-[calc(1.5rem+env(safe-area-inset-left))] sm:pr-[calc(1.5rem+env(safe-area-inset-right))]">
      <div className="flex items-center gap-3 min-w-0">
        <Link href="/">
          <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-primary animate-spin-slow">
            <Image
              src="https://res.cloudinary.com/dy73hzkpm/image/upload/v1763554691/Capture_d_e%CC%81cran_2025-11-19_a%CC%80_12.58.04_t2ltgj.png"
              alt="NeyshaPlay Logo"
              width={40}
              height={40}
              className="object-cover"
              suppressHydrationWarning
            />
          </div>
        </Link>
        <TopCreators />
      </div>
    </header>
  )
}
