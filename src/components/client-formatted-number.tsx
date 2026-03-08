'use client'

import { useState, useEffect } from 'react'

type ClientFormattedNumberProps = {
  value: number
}

export function ClientFormattedNumber({ value }: ClientFormattedNumberProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient ? <>{value.toLocaleString()}</> : <>{value.toString()}</>
}
