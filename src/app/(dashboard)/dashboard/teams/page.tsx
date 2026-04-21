'use client'

import { useEffect, useState } from 'react'

interface TeamMember {
  id: string
  name: string
  role: 'PLAYER' | 'COACH' | 'ASSISTANT' | 'TECHNICAL'
  number: number | null
  phone: string | null
}

interface Team {
  id: string
  name: string
  logo: string | null
  color: string | null
  coach: string | null
  teamMembers: TeamMember[]
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [teamName, setTeamName] = useState('')
  const [teamCoach, setTeamCoach] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberNumber, setNewMemberNumber] = useState('')
  const [memberRole, setMemberRole] = useState<'PLAYER' | 'COACH'>('PLAYER')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'players' | 'technical'>('players')

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
      body: JSON.stringify({ name: teamName, coach: teamCoach }),
    })

    if (res.ok) {
      setTeamName('')
      setTeamCoach('')
      setEditTeam(null)
      setShowModal(false)
      fetchTeams()
    }
    setSaving(false)
  }

  const openEdit = (team: Team) => {
    setEditTeam(team)
    setTeamName(team.name)
    setTeamCoach(team.coach || '')
    setShowModal(true)
  }

  const openNew = () => {
    setEditTeam(null)
    setTeamName('')
    setTeamCoach('')
    setShowModal(true)
  }

  const openTeamDetail = async (team: Team) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/teams/${team.id}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setSelectedTeam(data)
    setShowTeamModal(true)
    setActiveTab('players')
    setShowAddMember(false)
  }

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !selectedTeam) return
    
    setSaving(true)
    const token = localStorage.getItem('token')
    
    const res = await fetch(`/api/teams/${selectedTeam.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newMemberName,
        role: memberRole,
        number: newMemberNumber ? parseInt(newMemberNumber) : undefined,
      }),
    })

    if (res.ok) {
      setNewMemberName('')
      setNewMemberNumber('')
      const updated = await fetch(`/api/teams/${selectedTeam.id}`, { headers: { Authorization: `Bearer ${token}` } })
      setSelectedTeam(await updated.json())
    }
    setSaving(false)
  }

  const handleDeleteMember = async (memberId: string) => {
    if (!selectedTeam || !confirm('¿Eliminar este miembro?')) return
    
    const token = localStorage.getItem('token')
    await fetch(`/api/teams/${selectedTeam.id}?memberId=${memberId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    })
    
    const updated = await fetch(`/api/teams/${selectedTeam.id}`, { headers: { Authorization: `Bearer ${token}` } })
    setSelectedTeam(await updated.json())
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

  const saveTeam = async () => {
    if (!selectedTeam) return
    setSaving(true)
    const token = localStorage.getItem('token')
    await fetch(`/api/teams/${selectedTeam.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: selectedTeam.name,
        coach: selectedTeam.coach,
      }),
    })
    setSaving(false)
    fetchTeams()
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
                    <button onClick={() => openTeamDetail(team)} className="flex items-center gap-3 hover:text-blue-600">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-lg">
                        👥
                      </div>
                      <span className="font-medium text-gray-800">{team.name}</span>
                    </button>
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

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Entrenador</label>
                <input
                  type="text"
                  value={teamCoach}
                  onChange={(e) => setTeamCoach(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="Nombre del entrenador"
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

      {showTeamModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTeamModal(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {!showAddMember ? (
              <>
                <div className="text-center mb-6">
                  <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-4xl mx-auto mb-3">
                    👥
                  </div>
                  <input
                    type="text"
                    value={selectedTeam.name}
                    onChange={(e) => setSelectedTeam({ ...selectedTeam, name: e.target.value })}
                    className="text-2xl font-bold text-center border-b-2 border-transparent hover:border-blue-300 focus:border-blue-500 focus:outline-none bg-transparent"
                  />
                  <input
                    type="text"
                    value={selectedTeam.coach || ''}
                    onChange={(e) => setSelectedTeam({ ...selectedTeam, coach: e.target.value })}
                    placeholder="Nombre del entrenador"
                    className="block w-full text-center text-gray-600 mt-2 border-b border-gray-300 focus:border-blue-500 focus:outline-none bg-transparent"
                  />
                </div>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setActiveTab('players'); setShowAddMember(false) }}
                    className={`flex-1 py-2 rounded-lg ${activeTab === 'players' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  >
                    Jugadores
                  </button>
                  <button
                    onClick={() => { setActiveTab('technical'); setShowAddMember(false) }}
                    className={`flex-1 py-2 rounded-lg ${activeTab === 'technical' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
                  >
                    Cuerpo Técnico
                  </button>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-700">
                      {activeTab === 'players' ? 'Jugadores' : 'Cuerpo Técnico'}
                    </span>
                    <button
                      onClick={() => {
                        setMemberRole(activeTab === 'players' ? 'PLAYER' : 'COACH')
                        setShowAddMember(true)
                        setNewMemberName('')
                        setNewMemberNumber('')
                      }}
                      className="text-blue-600 text-sm hover:text-blue-800"
                    >
                      + Agregar {activeTab === 'players' ? 'Jugador' : 'Técnico'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedTeam.teamMembers
                      .filter(m => activeTab === 'players' ? m.role === 'PLAYER' : m.role !== 'PLAYER')
                      .map(member => (
                        <div key={member.id} className="flex items-center justify-between bg-white p-2 rounded-lg">
                          <div className="flex items-center gap-2">
                            {member.number && (
                              <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">
                                {member.number}
                              </span>
                            )}
                            <span>{member.name}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteMember(member.id)}
                            className="text-red-500 text-sm hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    {selectedTeam.teamMembers.filter(m => activeTab === 'players' ? m.role === 'PLAYER' : m.role !== 'PLAYER').length === 0 && (
                      <p className="text-center text-gray-400 text-sm py-4">No hay {activeTab === 'players' ? 'jugadores' : 'técnicos'} registrados</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowTeamModal(false)}
                    className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={saveTeam}
                    disabled={saving}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold mb-4 text-center">
                  Agregar {memberRole === 'PLAYER' ? 'Jugador' : 'Técnico'}
                </h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nombre</label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                    placeholder="Nombre completo"
                    autoFocus
                  />
                </div>

                {memberRole === 'PLAYER' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Número (opcional)</label>
                    <input
                      type="number"
                      value={newMemberNumber}
                      onChange={(e) => setNewMemberNumber(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                      placeholder="Ej: 10"
                    />
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowAddMember(false)}
                    className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
                  >
                    Atrás
                  </button>
                  <button
                    onClick={handleAddMember}
                    disabled={saving || !newMemberName.trim()}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Agregando...' : 'Añadir'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}