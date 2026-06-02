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
  { label: 'Mis Campeonatos', href: '/dashboard', icon: '🏆' },
  { label: 'Registro de Equipos', href: '/dashboard/teams', icon: '👥' },
  { label: 'Registro de Jugadores', href: '/dashboard/players', icon: '⚽' },
  { label: 'Página del Organizador', href: '/dashboard/organizer', icon: '📋' },
  { label: 'Planes de Suscripción', href: '/dashboard/plans', icon: '💳' },
  { label: 'Campeonatos que Sigo', href: '/dashboard/following', icon: '⭐' },
  { label: 'Arbitraje', href: '/dashboard/referee', icon: '⚖️' },
  { label: 'Patrocinios', href: '/dashboard/sponsors', icon: '🏢' },
  { label: 'Apoyo', href: '/dashboard/support', icon: '💬' },
  { label: 'Sitio de Juego', href: '/dashboard/venues', icon: '📍' },
  { label: 'Formulario', href: '/dashboard/forms', icon: '📝' },
  { label: 'Conversaciones', href: '/dashboard/messages', icon: '💭' },
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
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-[#0A1128] border-b border-white/10 fixed w-full z-20 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all lg:hidden"
              >
                <span className="text-2xl">☰</span>
              </button>
              <Link href="/dashboard" className="flex items-center gap-2 group ml-2">
                <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
                <span className="text-lg font-black text-white uppercase tracking-[0.2em] leading-none">
                  Copa<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Depor</span>
                </span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-slate-300 text-xs font-black uppercase tracking-wider bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5">
                <span className="text-[10px]">👤</span> {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl text-xs font-black uppercase tracking-wider border border-red-500/20 transition-all"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className={`fixed inset-y-0 left-0 z-20 w-64 bg-white shadow-lg transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <nav className="mt-8 px-4 space-y-1">
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