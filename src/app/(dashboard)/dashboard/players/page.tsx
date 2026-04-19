'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Player {
  id: string
  dni: string
  dateOfBirth: string
  nationality: string | null
  position: string | null
  user: { name: string; email: string }
  teamPlayers: { team: { name: string } }[]
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPlayers = async () => {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/players', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      setPlayers(data)
      setLoading(false)
    }
    fetchPlayers()
  }, [])

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Jugadores</h1>
        <Link href="/dashboard/players/new" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
          + Nuevo Jugador
        </Link>
      </div>

      {players.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Nombre</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">DNI</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Posición</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Equipo</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {players.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{player.user.name}</div>
                    <div className="text-sm text-gray-500">{player.user.email}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{player.dni}</td>
                  <td className="px-6 py-4 text-gray-600">{player.position || '-'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {player.teamPlayers[0]?.team.name || 'Sin equipo'}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/players/${player.id}`} className="text-blue-600 hover:underline">
                      Ver
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay jugadores</h3>
          <p className="text-gray-500 mb-6">Registra tu primer jugador</p>
          <Link href="/dashboard/players/new" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
            Crear Jugador
          </Link>
        </div>
      )}
    </div>
  )
}