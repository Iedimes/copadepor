'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TournamentsPage() {
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-slate-500 text-sm uppercase tracking-widest">Cargando torneos...</div>
    </div>
  )
}