'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function TournamentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
    }
  }, [router])

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100"
              >
                <span className="text-xl">←</span>
              </button>
              <Link href="/dashboard" className="text-xl font-bold text-blue-600 ml-2">
                CopaDepor
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-800">
                Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {children}
      </main>
    </div>
  )
}