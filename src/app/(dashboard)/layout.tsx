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
    <div className="min-h-screen bg-[#0A1128] text-white flex flex-col font-sans">
      {/* Top Navbar - Starts after the sidebar on desktop */}
      <nav className="bg-[#0A1128] border-b border-white/5 fixed top-0 right-0 left-0 lg:left-64 h-16 z-10 shadow-sm">
        <div className="px-6 h-full flex items-center justify-between">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all lg:hidden"
            >
              <span className="text-2xl">☰</span>
            </button>
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
      </nav>

      {/* Main Layout Wrapper */}
      <div className="flex pt-16 h-screen overflow-hidden">
        {/* Sidebar - Spans full height containing the brand Logo */}
        <aside className={`fixed inset-y-0 left-0 z-20 w-64 bg-[#0A1128] flex flex-col shrink-0 transform transition-transform duration-200 lg:translate-x-0 lg:static ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          {/* Brand Logo at the top of Sidebar */}
          <div className="h-16 flex items-center px-8 border-b border-white/5 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <span className="text-2xl group-hover:scale-110 transition-transform">🏆</span>
              <span className="text-lg font-black text-white uppercase tracking-[0.2em] leading-none">
                Copa<span className="bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">Depor</span>
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="mt-6 px-4 space-y-1.5 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3.5 transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600/10 text-blue-400 font-black border-l-4 border-blue-500 rounded-r-xl shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-white/5 font-bold rounded-xl'
                  } text-[11px] uppercase tracking-wider gap-3`}
                >
                  <span className={`text-base leading-none transition-transform ${isActive ? 'filter saturate-100 drop-shadow-sm' : 'filter saturate-50'}`}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-10 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content Card with rounded-tl corner forming a beautiful interface */}
        <main className="flex-1 bg-[#F8FAFC] text-slate-800 rounded-tl-[2.5rem] p-8 overflow-y-auto h-full border-t border-l border-white/5 shadow-inner">
          {children}
        </main>
      </div>
    </div>
  )
}