'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="h-full">
        {children}
      </main>
    </div>
  )
}