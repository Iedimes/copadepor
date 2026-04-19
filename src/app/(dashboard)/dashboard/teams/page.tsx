'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Team {
  id: string
  name: string
  logo: string | null
  color: string | null
  manager: { name: string }
  players: { player: { id: string; user: { name: string } } }[]
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTeams = async () => {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setTeams(data)
      setLoading(false)
    }
    fetchTeams()
  }, [])

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Equipos</h1>
        <Link href="/dashboard/teams/new" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          + Nuevo Equipo
        </Link>
      </div>

      {teams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teams.map((team) => (
            <div key={team.id} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition">
              <div className="flex items-center gap-4 mb-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl ${team.color || 'bg-gray-200'}`}>
                  {team.logo ? <img src={team.logo} alt={team.name} className="w-full h-full object-cover rounded-full" /> : '👥'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{team.name}</h3>
                  <p className="text-sm text-gray-500">Manager: {team.manager.name}</p>
                </div>
              </div>
              <div className="text-sm text-gray-500 mb-4">
                {team.players.length} jugadores registrados
              </div>
              <div className="flex gap-2">
                <Link href={`/dashboard/teams/${team.id}`} className="flex-1 text-center bg-gray-100 py-2 rounded-lg hover:bg-gray-200">
                  Ver
                </Link>
                <Link href={`/dashboard/teams/${team.id}/edit`} className="flex-1 text-center bg-blue-50 text-blue-600 py-2 rounded-lg hover:bg-blue-100">
                  Editar
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay equipos</h3>
          <p className="text-gray-500 mb-6">Registra tu primer equipo</p>
          <Link href="/dashboard/teams/new" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Crear Equipo
          </Link>
        </div>
      )}
    </div>
  )
}