'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Tournament {
  id: string
  name: string
  sportType: string
  status: string
  startDate: string
  endDate: string
  format: string
  maxTeams: number
  _count: { teams: number; matches: number }
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    const fetchTournaments = async () => {
      const token = localStorage.getItem('token')
      const url = filter === 'all' ? '/api/tournaments' : `/api/tournaments?status=${filter}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setTournaments(data)
      setLoading(false)
    }
    fetchTournaments()
  }, [filter])

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Borrador'
      case 'REGISTRATION_OPEN': return 'Inscripciones'
      case 'IN_PROGRESS': return 'En curso'
      case 'COMPLETED': return 'Finalizado'
      case 'CANCELLED': return 'Cancelado'
      default: return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800'
      case 'REGISTRATION_OPEN': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      case 'DRAFT': return 'bg-yellow-100 text-yellow-800'
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
        <h1 className="text-2xl font-bold text-gray-800">Torneos</h1>
        <button onClick={() => setShowNewModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          + Nuevo Torneo
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        {['all', 'DRAFT', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg ${filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border'}`}
          >
            {f === 'all' ? 'Todos' : getStatusLabel(f)}
          </button>
        ))}
      </div>

      {tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div key={tournament.id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                <div className="flex justify-between items-start">
                  <span className="text-4xl">{getSportEmoji(tournament.sportType)}</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                    {getStatusLabel(tournament.status)}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{tournament.name}</h3>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>📅 {new Date(tournament.startDate).toLocaleDateString()} - {new Date(tournament.endDate).toLocaleDateString()}</p>
                  <p>🏆 Formato: {tournament.format}</p>
                  <p>👥 {tournament._count.teams}/{tournament.maxTeams} equipos</p>
                  <p>⚽ {tournament._count.matches} partidos</p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/dashboard/tournaments/${tournament.id}`} className="flex-1 text-center bg-gray-100 py-2 rounded-lg hover:bg-gray-200">
                    Ver
                  </Link>
                  <Link href={`/dashboard/tournaments/${tournament.id}/edit`} className="flex-1 text-center bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100">
                    Editar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay torneos</h3>
          <p className="text-gray-500 mb-6">Crea tu primer torneo para comenzar</p>
          <button onClick={() => setShowNewModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Crear Torneo
          </button>
        </div>
      )}

      {showNewModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowNewModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Nuevo Torneo</h2>
            <p className="text-gray-500 text-center mb-6">Selecciona el tipo de campeonato</p>
            
            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowNewModal(false)
                  window.location.href = '/dashboard/tournaments/new?type=single'
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="text-lg font-bold text-gray-800">Campeonato Único</h3>
                <p className="text-sm text-gray-500">Un solo deporte y categoría</p>
              </button>
              
              <button
                onClick={() => {
                  setShowNewModal(false)
                  alert('Campeonato con categorías - Próximamente')
                }}
                className="w-full p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-left opacity-50"
                disabled
              >
                <div className="text-3xl mb-2">📊</div>
                <h3 className="text-lg font-bold text-gray-800">Campeonato con Categorías</h3>
                <p className="text-sm text-gray-500">Múltiples categorías (edad, género, etc.) - Próximamente</p>
              </button>
            </div>
            
            <button
              onClick={() => setShowNewModal(false)}
              className="w-full mt-4 py-3 border border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}