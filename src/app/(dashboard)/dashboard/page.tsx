'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Tournament {
  id: string
  name: string
  sportType: string
  status: string
  startDate: string
}

interface Stats {
  tournaments: number
  teams: number
  matches: number
  players: number
}

const sports = [
  { id: 'FUTBOL_11', name: 'Fútbol 11', icon: '⚽', category: 'Fútbol' },
  { id: 'FUTSAL', name: 'Futsal', icon: '⚽', category: 'Fútbol' },
  { id: 'FUTBOL_7', name: 'Fútbol 7', icon: '⚽', category: 'Fútbol' },
  { id: 'FUTBOL_SALA', name: 'Fútbol Sala', icon: '⚽', category: 'Fútbol' },
  { id: 'BALONMANO', name: 'Balonmano', icon: '🤾', category: 'Balón' },
  { id: 'BALONCESTO', name: 'Baloncesto', icon: '🏀', category: 'Balón' },
  { id: 'VOLEY', name: 'Voleibol', icon: '🏐', category: 'Balón' },
  { id: 'VOLEY_PLAYA', name: 'Voleibol de Playa', icon: '🏐', category: 'Balón' },
  { id: 'TENIS_MESA', name: 'Tenis de Mesa', icon: '🏓', category: 'Raqueta' },
  { id: 'TENIS', name: 'Tenis', icon: '🎾', category: 'Raqueta' },
  { id: 'BEACH_TENNIS', name: 'Beach Tennis', icon: '🏖️', category: 'Raqueta' },
  { id: 'AJEDREZ', name: 'Ajedrez', icon: '♟️', category: 'Tablero' },
  { id: 'ATLETISMO', name: 'Atletismo', icon: '🏃', category: 'Atletismo' },
  { id: 'DEPORTE_GENERICO', name: 'Deporte Genérico', icon: '🏅', category: 'Otros' },
  { id: 'DISPAROS', name: 'Juego de Disparos', icon: '🔫', category: 'Videojuegos' },
  { id: 'BATTLE_ROYALE', name: 'Battle Royale', icon: '🎮', category: 'Videojuegos' },
  { id: 'MOBA_LOL', name: 'MOBA (LoL)', icon: '🛡️', category: 'Videojuegos' },
  { id: 'MOBA_DOTA', name: 'MOBA (Dota)', icon: '🛡️', category: 'Videojuegos' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ tournaments: 0, teams: 0, matches: 0, players: 0 })
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showSportModal, setShowSportModal] = useState(false)
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [selectedType, setSelectedType] = useState<'single' | 'multiple'>('single')
  const [tournamentData, setTournamentData] = useState({ sport: '', name: '', format: '' })
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      try {
        const [tournamentsRes, teamsRes, matchesRes] = await Promise.all([
          fetch('/api/tournaments', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/matches', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        
        const tournamentsData = await tournamentsRes.json()
        const teamsData = await teamsRes.json()
        const matchesData = await matchesRes.json()
        
        setTournaments(tournamentsData.slice(0, 5))
        setStats({
          tournaments: tournamentsData.length,
          teams: teamsData.length,
          matches: matchesData.length,
          players: 0,
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800'
      case 'REGISTRATION_OPEN': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const handleTypeSelect = (type: 'single' | 'multiple') => {
    setSelectedType(type)
    setShowTypeModal(false)
    setShowSportModal(true)
  }

  const handleSportSelect = (sportId: string, sportName: string) => {
    setTournamentData({ ...tournamentData, sport: sportId, name: sportName })
    setShowSportModal(false)
    setShowFormatModal(true)
  }

  const handleFormatSelect = (format: string) => {
    setShowFormatModal(false)
    router.push(`/dashboard/tournaments/new?type=${selectedType}&sport=${tournamentData.sport}&format=${format}&name=${encodeURIComponent(tournamentData.name)}`)
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <button 
          onClick={() => setShowTypeModal(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <span>🏆</span> Nuevo Campeonato
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-blue-600">{stats.tournaments}</div>
          <div className="text-gray-500">Torneos</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-green-600">{stats.teams}</div>
          <div className="text-gray-500">Equipos</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-orange-600">{stats.matches}</div>
          <div className="text-gray-500">Partidos</div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="text-3xl font-bold text-purple-600">{stats.players}</div>
          <div className="text-gray-500">Jugadores</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Torneos Recientes</h2>
            <Link href="/dashboard/tournaments" className="text-blue-600 hover:underline text-sm">
              Ver todos
            </Link>
          </div>
          {tournaments.length > 0 ? (
            <div className="space-y-3">
              {tournaments.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{t.name}</div>
                    <div className="text-sm text-gray-500">{t.sportType} • {new Date(t.startDate).toLocaleDateString()}</div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(t.status)}`}>
                    {t.status === 'IN_PROGRESS' ? 'En curso' : t.status === 'REGISTRATION_OPEN' ? 'Inscripciones' : t.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No hay torneos todavía</p>
          )}
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link href="/dashboard/teams/new" className="p-4 bg-green-50 rounded-lg text-center hover:bg-green-100">
              <div className="text-2xl mb-2">👥</div>
              <div className="text-green-700 font-medium">Nuevo Equipo</div>
            </Link>
            <Link href="/dashboard/matches/new" className="p-4 bg-orange-50 rounded-lg text-center hover:bg-orange-100">
              <div className="text-2xl mb-2">⚽</div>
              <div className="text-orange-700 font-medium">Nuevo Partido</div>
            </Link>
            <Link href="/dashboard/players/new" className="p-4 bg-purple-50 rounded-lg text-center hover:bg-purple-100">
              <div className="text-2xl mb-2">👤</div>
              <div className="text-purple-700 font-medium">Nuevo Jugador</div>
            </Link>
            <Link href="/dashboard/sponsors/new" className="p-4 bg-yellow-50 rounded-lg text-center hover:bg-yellow-100">
              <div className="text-2xl mb-2">🏢</div>
              <div className="text-yellow-700 font-medium">Nuevo Sponsor</div>
            </Link>
          </div>
        </div>
      </div>

      {/* Modal: Tipo de Campeonato */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">🏆 Nuevo Campeonato</h2>
            <p className="text-gray-600 text-center mb-6">Selecciona el tipo de torneo que deseas crear:</p>
            
            <div className="space-y-4">
              <button
                onClick={() => handleTypeSelect('single')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left group"
              >
                <div className="text-3xl mb-2">⚽</div>
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">Campeonato Único</h3>
                <p className="text-sm text-gray-500 mt-1">Campeonato de una sola modalidad con una sola categoría</p>
              </button>

              <button
                onClick={() => handleTypeSelect('multiple')}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition text-left group"
              >
                <div className="text-3xl mb-2">📊</div>
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-600">Campeonato con Categorías</h3>
                <p className="text-sm text-gray-500 mt-1">Campeonato con múltiples categorías (edad, género, deporte, etc.)</p>
              </button>
            </div>

            <button
              onClick={() => setShowTypeModal(false)}
              className="mt-6 w-full py-3 text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Selección de Deporte */}
      {showSportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">🎯 Selecciona el Deporte</h2>
            <p className="text-gray-600 text-center mb-6">Elige el deporte para tu campeonato</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => handleSportSelect(sport.id, sport.name)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-center group"
                >
                  <div className="text-3xl mb-2">{sport.icon}</div>
                  <div className="text-sm font-medium text-gray-800 group-hover:text-blue-600">{sport.name}</div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowSportModal(false)}
              className="mt-6 w-full py-3 text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Formato del Campeonato */}
      {showFormatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">📋 Formato del Campeonato</h2>
            <p className="text-gray-600 text-center mb-6">Selecciona cómo se jugarán los partidos</p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleFormatSelect('todos_contra_todos')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left group"
              >
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-blue-600">Todos contra todos</h3>
                <p className="text-sm text-gray-500">Cada equipo juega contra todos los demás</p>
              </button>

              <button
                onClick={() => handleFormatSelect('liga_eliminacion')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition text-left group"
              >
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-purple-600">Todos contra todos + Eliminatoria</h3>
                <p className="text-sm text-gray-500">Fase de grupos seguida de playoffs</p>
              </button>

              <button
                onClick={() => handleFormatSelect('eliminacion')}
                className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-red-500 hover:bg-red-50 transition text-left group"
              >
                <h3 className="text-lg font-semibold text-gray-800 group-hover:text-red-600">Eliminatoria directa</h3>
                <p className="text-sm text-gray-500">El perdedor queda eliminado en cada ronda</p>
              </button>
            </div>

            <button
              onClick={() => setShowFormatModal(false)}
              className="mt-6 w-full py-3 text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}