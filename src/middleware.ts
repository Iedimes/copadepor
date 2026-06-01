import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Transparently rewrite /uploads/* to /api/uploads/*
  if (pathname.startsWith('/uploads/')) {
    const filePath = pathname.replace('/uploads/', '')
    return NextResponse.rewrite(new URL(`/api/uploads/${filePath}`, request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/uploads/:path*',
}
