'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Team {
  id: string
  name: string
}

interface AddedTeam {
  id: string
  team: Team
}

export default function AddTeamsPage() {
  const params = useParams()
  const router = useRouter()
  const [addedTeams, setAddedTeams] = useState<AddedTeam[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  const tournamentId = params.id as string

  useEffect(() => {
    fetchAddedTeams()
  }, [tournamentId])

  const fetchAddedTeams = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setAddedTeams(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
    }
    setLoading(false)
  }

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTeamName.trim()) return

    setSaving(true)
    const token = localStorage.getItem('token')

    try {
      // Crear el equipo
      const teamRes = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newTeamName }),
      })

      if (teamRes.ok) {
        const team = await teamRes.json()

        // Agregar el equipo al torneo
        await fetch(`/api/tournaments/${tournamentId}/teams`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ teamId: team.id }),
        })

        setNewTeamName('')
        fetchAddedTeams()
      }
    } catch (error) {
      console.error('Error adding team:', error)
      alert('Error al agregar equipo')
    }
    setSaving(false)
    // Enfocar el input después de que todo termine
    setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
  }

  const handleGoBack = () => {
    router.push(`/tournaments/${tournamentId}?view=clasificacion`)
  }

  const handleAddPlayers = (teamId: string, teamName: string) => {
    router.push(`/tournaments/${tournamentId}/add-players?teamId=${teamId}&teamName=${encodeURIComponent(teamName)}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 flex items-center gap-4">
        <button onClick={handleGoBack} className="text-blue-600 hover:text-blue-800">
          ← Volver
        </button>
        <h1 className="text-xl font-bold">Agregar Equipos al Torneo</h1>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto p-6">
        {/* Formulario para agregar equipo */}
        <form onSubmit={handleAddTeam} className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-lg font-bold mb-4">Nuevo Equipo</h2>
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="Nombre del equipo (Enter para agregar)"
              className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={saving || !newTeamName.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Agregando...' : 'Agregar'}
            </button>
          </div>
        </form>

        {/* Lista de equipos agregados */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-lg font-bold mb-4">Equipos Agregados ({addedTeams.length})</h2>

          {addedTeams.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No hay equipos agregados aún
            </div>
          ) : (
            <div className="space-y-3">
              {addedTeams.map((tt) => (
                <div
                  key={tt.id}
                  className="flex items-center justify-between p-5 bg-white border border-slate-100 rounded-3xl hover:shadow-xl hover:shadow-slate-200/50 transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white text-xl font-black">
                      🏆
                    </div>
                    <div>
                      <span className="block font-black text-slate-800 text-lg uppercase tracking-tight">{tt.team.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registrado</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAddPlayers(tt.team.id, tt.team.name)}
                    className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                    title="Gestionar Jugadores"
                  >
                    <span className="text-xl">👥</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Botón Volver cuando hay equipos */}
        {addedTeams.length > 0 && (
          <div className="mt-6 text-center">
            <button
              onClick={handleGoBack}
              className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
            >
              ✓ Listo - Volver
            </button>
          </div>
        )}
      </div>
    </div>
  )
}