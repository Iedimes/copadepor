'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Match {
  id: string
  homeTeam: { name: string; logo: string | null }
  awayTeam: { name: string; logo: string | null }
  homeScore: number | null
  awayScore: number | null
  status: string
  matchDate: string
  location: string | null
  tournament: { name: string; sportType: string }
}

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const fetchMatches = async () => {
      const token = localStorage.getItem('token')
      const url = filter === 'all' ? '/api/matches' : `/api/matches?status=${filter}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setMatches(data)
      setLoading(false)
    }
    fetchMatches()
  }, [filter])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'SCHEDULED': return 'Programado'
      case 'IN_PROGRESS': return 'En curso'
      case 'COMPLETED': return 'Finalizado'
      case 'POSTPONED': return 'Pospuesto'
      case 'CANCELLED': return 'Cancelado'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      case 'SCHEDULED': return 'bg-blue-100 text-blue-800'
      default: return 'bg-red-100 text-red-800'
    }
  }

  const getSportEmoji = (sport: string) => {
    switch (sport) {
      case 'FUTBOL': return '⚽'
      case 'FUTSAL': return '⚽'
      case 'BASQUET': return '🏀'
      case 'HANDBOL': return '🤾'
      case 'VOLEY': return '🏐'
      default: return '🏆'
    }
  }

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Partidos</h1>
        <Link href="/dashboard/matches/new" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          + Nuevo Partido
        </Link>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
          >
            {f === 'all' ? 'Todos' : getStatusLabel(f)}
          </button>
        ))}
      </div>

      {matches.length > 0 ? (
        <div className="space-y-4">
          {matches.map((match) => (
            <div key={match.id} className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="text-sm text-gray-500">
                  {getSportEmoji(match.tournament.sportType)} {match.tournament.name}
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(match.status)}`}>
                  {getStatusLabel(match.status)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    {match.homeTeam.logo ? <img src={match.homeTeam.logo} className="w-full h-full object-cover rounded-full" /> : '🏠'}
                  </div>
                  <span className="text-lg font-semibold">{match.homeTeam.name}</span>
                </div>
                <div className="text-center px-8">
                  {match.status === 'COMPLETED' || match.status === 'IN_PROGRESS' ? (
                    <div className="text-3xl font-bold">{match.homeScore} - {match.awayScore}</div>
                  ) : (
                    <div className="text-gray-400">vs</div>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-semibold">{match.awayTeam.name}</span>
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                    {match.awayTeam.logo ? <img src={match.awayTeam.logo} className="w-full h-full object-cover rounded-full" /> : '🏃'}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex justify-between items-center text-sm text-gray-500">
                <span>📅 {new Date(match.matchDate).toLocaleString()}</span>
                <span>📍 {match.location || 'Sin ubicación'}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl">
          <div className="text-6xl mb-4">⚽</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay partidos</h3>
          <p className="text-gray-500 mb-6">Programa tu primer partido</p>
          <Link href="/dashboard/matches/new" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Crear Partido
          </Link>
        </div>
      )}
    </div>
  )
}