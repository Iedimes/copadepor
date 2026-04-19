'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface NavItem {
  label: string
  href: string
  icon: string
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠' },
  { label: 'Torneos', href: '/dashboard/tournaments', icon: '🏆' },
  { label: 'Equipos', href: '/dashboard/teams', icon: '👥' },
  { label: 'Partidos', href: '/dashboard/matches', icon: '⚽' },
  { label: 'Jugadores', href: '/dashboard/players', icon: '👤' },
  { label: 'Estadísticas', href: '/dashboard/stats', icon: '📊' },
  { label: 'Sanciones', href: '/dashboard/sanctions', icon: '⚠️' },
  { label: 'Noticias', href: '/dashboard/news', icon: '📰' },
  { label: 'Patrocinadores', href: '/dashboard/sponsors', icon: '🏢' },
  { label: 'Configuración', href: '/dashboard/settings', icon: '⚙️' },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) {
      router.push('/login')
      return
    }
    setUser(JSON.parse(userData))
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm fixed w-full z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 rounded-md text-gray-500 hover:bg-gray-100 lg:hidden"
              >
                <span className="text-2xl">☰</span>
              </button>
              <Link href="/dashboard" className="text-xl font-bold text-blue-600 ml-2">
                CopaDepor
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user.name}</span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`fixed inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="mt-8 px-4 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg ${
                  pathname === item.href
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex-1 p-8 lg:ml-64">
          {children}
        </main>
      </div>
    </div>
  )
}