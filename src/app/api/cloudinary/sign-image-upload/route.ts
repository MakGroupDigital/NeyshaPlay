import crypto from 'crypto'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

function signCloudinaryParams(params: Record<string, string | number>) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  return crypto
    .createHash('sha1')
    .update(`${payload}${apiSecret}`)
    .digest('hex')
}

export async function POST() {
  if (!cloudName || !apiKey || !apiSecret) {
    return NextResponse.json(
      { error: 'Configuration Cloudinary serveur incomplete' },
      { status: 500 }
    )
  }

  const timestamp = Math.round(Date.now() / 1000)
  const folder = 'profile-avatars'
  const signature = signCloudinaryParams({ folder, timestamp })

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    folder,
    signature,
  })
}
