'use client'

import { useEffect, useState } from 'react'

interface Player {
  id: string
  name: string
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  const [playerName, setPlayerName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchPlayers()
  }, [])

  const fetchPlayers = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/simple-players', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setPlayers(data)
    setLoading(false)
  }

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setSaving(true)
    const token = localStorage.getItem('token')
    if (!token) {
      alert('No hay sesión. Inicia sesión primero.')
      setSaving(false)
      return
    }
    
    const url = editPlayer ? `/api/simple-players/${editPlayer.id}` : '/api/simple-players'
    const method = editPlayer ? 'PUT' : 'POST'
    
    console.log('Submitting:', { url, method, name: playerName, token: token?.substring(0, 20) })
    
    let res
try {
      res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: playerName }),
      })
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      alert('Error de conexión: ' + (fetchError as any).message)
      setSaving(false)
      return
    }

    if (!res) {
      alert('No se pudo conectar al servidor')
      setSaving(false)
      return
    }
    
    const text = await res.text()
    console.log('Response text:', text)
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
    console.log('Response:', res.status, data)
    
    if (res.ok) {
      setPlayerName('')
      setEditPlayer(null)
      setShowModal(false)
      fetchPlayers()
    } else {
      alert(data.error || 'Error al guardar')
    }
    setSaving(false)
  }

  const openEdit = (player: Player) => {
    setEditPlayer(player)
    setPlayerName(player.name)
    setShowModal(true)
  }

  const openNew = () => {
    setEditPlayer(null)
    setPlayerName('')
    setShowModal(true)
  }

  const handleDelete = async (player: Player) => {
    if (!confirm(`¿Eliminar jugador "${player.name}"?`)) return
    
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/simple-players/${player.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (res.ok) {
      fetchPlayers()
    } else {
      const err = await res.json()
      alert(err.error || 'Error al eliminar')
    }
  }

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Registro de Jugadores</h1>
        <button 
          onClick={openNew}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nuevo Jugador
        </button>
      </div>

      {players.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Nombre del Jugador</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {players.map((player) => (
                <tr key={player.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-lg">
                        👤
                      </div>
                      <span className="font-medium text-gray-800">{player.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(player)} className="text-blue-600 hover:text-blue-800 text-sm">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(player)} className="text-red-600 hover:text-red-800 text-sm">
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay jugadores registrados</h3>
          <p className="text-gray-500 mb-6">Registra tu primer jugador</p>
          <button 
            onClick={openNew}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Crear Jugador
          </button>
        </div>
      )}

      {/* Modal: Nuevo/Editar Jugador */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              {editPlayer ? 'Editar Jugador' : 'Nuevo Jugador'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Jugador</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: Juan Pérez"
                  required
                  autoFocus
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !playerName.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}