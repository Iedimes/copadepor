'use client'

import { useEffect, useState } from 'react'

interface Team {
  id: string
  name: string
  logo: string | null
  color: string | null
  manager: { name: string }
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setTeams(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!teamName.trim()) return

    setSaving(true)
    const token = localStorage.getItem('token')
    
    const url = editTeam ? `/api/teams/${editTeam.id}` : '/api/teams'
    const method = editTeam ? 'PUT' : 'POST'
    
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: teamName }),
    })

    if (res.ok) {
      setTeamName('')
      setEditTeam(null)
      setShowModal(false)
      fetchTeams()
    }
    setSaving(false)
  }

  const openEdit = (team: Team) => {
    setEditTeam(team)
    setTeamName(team.name)
    setShowModal(true)
  }

  const openNew = () => {
    setEditTeam(null)
    setTeamName('')
    setShowModal(true)
  }

  const handleDelete = async (team: Team) => {
    if (!confirm(`¿Eliminar equipo "${team.name}"?`)) return
    
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/teams/${team.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (res.ok) {
      fetchTeams()
    } else {
      const err = await res.json()
      alert(err.error || 'Error al eliminar')
    }
  }

  if (loading) return <div className="p-8">Cargando...</div>

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Registro de Equipos</h1>
        <button 
          onClick={openNew}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
        >
          + Nuevo Equipo
        </button>
      </div>

      {teams.length > 0 ? (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Nombre del Equipo</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {teams.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                        👥
                      </div>
                      <span className="font-medium text-gray-800">{team.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-3">
                      <button onClick={() => openEdit(team)} className="text-blue-600 hover:text-blue-800 text-sm">
                        Editar
                      </button>
                      <button onClick={() => handleDelete(team)} className="text-red-600 hover:text-red-800 text-sm">
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
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay equipos registrados</h3>
          <p className="text-gray-500 mb-6">Registra tu primer equipo</p>
          <button 
            onClick={openNew}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
          >
            Crear Equipo
          </button>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              {editTeam ? 'Editar Equipo' : 'Nuevo Equipo'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Equipo</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: Los Tigres"
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
                  disabled={saving || !teamName.trim()}
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