'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface Team {
  id: string
  name: string
  logo: string | null
  color: string | null
  teamMembers?: any[]
  players?: any[]
}

interface AddedTeam {
  id: string
  teamId: string
  team: Team
}

export default function AddTeamsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const categoryId = searchParams.get('categoryId')
  const [addedTeams, setAddedTeams] = useState<AddedTeam[]>([])
  const [newTeamName, setNewTeamName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef<HTMLInputElement>(null)

  // Managed Teams & UI State
  const [teams, setTeams] = useState<Team[]>([])
  const [activeTab, setActiveTab] = useState<'create' | 'existing'>('create')
  const [selectedTeamId, setSelectedTeamId] = useState('')
  const [assigning, setAssigning] = useState(false)

  // Edit state
  const [editingTeam, setEditingTeam] = useState<AddedTeam | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('')
  const [editLogo, setEditLogo] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tournamentId = params.id as string

  useEffect(() => {
    fetchAddedTeams()
    fetchManagedTeams()
  }, [tournamentId, categoryId])

  const fetchManagedTeams = async () => {
    const token = localStorage.getItem('token')
    if (!token) return
    try {
      const res = await fetch('/api/teams', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setTeams(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching managed teams:', error)
    }
  }

  const fetchAddedTeams = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }

    try {
      const categoryQuery = categoryId ? `?categoryId=${categoryId}` : ''
      const res = await fetch(`/api/tournaments/${tournamentId}/teams${categoryQuery}`, {
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
          body: JSON.stringify({ 
            teamId: team.id,
            categoryId: categoryId || null
          }),
        })

        setNewTeamName('')
        fetchAddedTeams()
        fetchManagedTeams()
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

  const handleAssignExistingTeam = async (clone: boolean) => {
    if (!selectedTeamId) return

    setAssigning(true)
    const token = localStorage.getItem('token')
    if (!token) {
      alert('No hay sesión activa.')
      setAssigning(false)
      return
    }

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          teamId: selectedTeamId,
          categoryId: categoryId || null,
          clone: clone
        }),
      })

      if (res.ok) {
        setSelectedTeamId('')
        fetchAddedTeams()
        fetchManagedTeams()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al agregar equipo')
      }
    } catch (error) {
      console.error('Error assigning team:', error)
      alert('Error al agregar equipo')
    }
    setAssigning(false)
  }

  const handleGoBack = () => {
    const categoryQuery = categoryId ? `&categoryId=${categoryId}` : ''
    router.push(`/tournaments/${tournamentId}?view=clasificacion${categoryQuery}`)
  }

  const handleAddPlayers = (teamId: string, teamName: string) => {
    const categoryQuery = categoryId ? `&categoryId=${categoryId}` : ''
    router.push(`/tournaments/${tournamentId}/add-players?teamId=${teamId}&teamName=${encodeURIComponent(teamName)}${categoryQuery}`)
  }

  const handleStartEdit = (tt: AddedTeam) => {
    setEditingTeam(tt)
    setEditName(tt.team.name)
    setEditColor(tt.team.color || '')
    setEditLogo(tt.team.logo || null)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'teams')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        setEditLogo(data.url)
      } else {
        const err = await res.json()
        alert(err.error || 'Error al subir imagen')
      }
    } catch (error) {
      console.error('Error uploading:', error)
      alert('Error al subir imagen')
    }
    setUploading(false)
  }

  const handleSaveEdit = async () => {
    if (!editingTeam || !editName.trim()) return

    setSavingEdit(true)
    const token = localStorage.getItem('token')

    try {
      const res = await fetch(`/api/teams/${editingTeam.team.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editName.trim(),
          logo: editLogo || undefined,
          color: editColor || undefined,
        }),
      })

      if (res.ok) {
        setEditingTeam(null)
        fetchAddedTeams()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al actualizar equipo')
      }
    } catch (error) {
      console.error('Error updating team:', error)
      alert('Error al actualizar equipo')
    }
    setSavingEdit(false)
  }

  // Filter out teams that are already added to this category/tournament view
  const availableTeams = teams.filter(
    (t) => !addedTeams.some((at) => at.teamId === t.id)
  )

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
        {/* Formulario/Panel para agregar equipo con pestañas */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100/50">
          <div className="flex border-b border-gray-100 pb-3 mb-6 gap-6">
            <button
              onClick={() => setActiveTab('create')}
              className={`pb-2 font-bold text-sm uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'create'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              🆕 Crear Nuevo
            </button>
            <button
              onClick={() => setActiveTab('existing')}
              className={`pb-2 font-bold text-sm uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'existing'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              📋 Usar Existente
            </button>
          </div>

          {activeTab === 'create' ? (
            <form onSubmit={handleAddTeam} className="space-y-4">
              <h3 className="text-md font-bold text-gray-700 uppercase tracking-wide">Crear Equipo en Blanco</h3>
              <div className="flex gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Nombre del equipo (Ej: Los Leones)"
                  className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-800 placeholder-gray-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={saving || !newTeamName.trim()}
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold transition-all shadow-md active:scale-95"
                >
                  {saving ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-md font-bold text-gray-700 uppercase tracking-wide mb-2">Asignar Equipo del Club</h3>
                <p className="text-xs text-gray-400 font-medium">Asigna un equipo que ya tengas registrado o clónalo con su plantel actual para este torneo.</p>
              </div>

              {availableTeams.length === 0 ? (
                <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <span className="text-3xl block mb-2">📋</span>
                  <span className="text-sm text-slate-400 font-bold">No hay otros equipos disponibles para asignar</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Selecciona un Equipo</label>
                    <select
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-800 font-bold bg-white"
                    >
                      <option value="">-- Elige un equipo --</option>
                      {availableTeams.map((t) => {
                        const membersCount = t.teamMembers?.length || 0;
                        const playersCount = t.players?.length || 0;
                        const totalRoster = membersCount + playersCount;
                        return (
                          <option key={t.id} value={t.id}>
                            {t.name} ({totalRoster} integrantes)
                          </option>
                        )
                      })}
                    </select>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    <button
                      type="button"
                      disabled={assigning || !selectedTeamId}
                      onClick={() => handleAssignExistingTeam(false)}
                      className="flex-1 px-5 py-3.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 disabled:opacity-50 font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>🔗</span>
                      <span>{assigning ? 'Asignando...' : 'Asignar al Torneo'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={assigning || !selectedTeamId}
                      onClick={() => handleAssignExistingTeam(true)}
                      className="flex-1 px-5 py-3.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-bold transition-all shadow-md flex items-center justify-center gap-2 active:scale-95"
                    >
                      <span>👯</span>
                      <span>{assigning ? 'Copiando...' : 'Copiar Equipo con Plantilla'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
                    {tt.team.logo ? (
                      <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center bg-slate-50 shadow-sm">
                        <img 
                          src={tt.team.logo} 
                          alt={tt.team.name} 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black shadow-sm"
                        style={{ backgroundColor: tt.team.color || '#1e293b' }}
                      >
                        {tt.team.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <span className="block font-black text-slate-800 text-lg uppercase tracking-tight">{tt.team.name}</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registrado</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartEdit(tt)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                      title="Editar Equipo"
                    >
                      <span className="text-lg">✏️</span>
                    </button>
                    <button
                      onClick={() => handleAddPlayers(tt.team.id, tt.team.name)}
                      className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-2xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                      title="Gestionar Jugadores"
                    >
                      <span className="text-lg">👥</span>
                    </button>
                  </div>
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

      {/* Modal: Editar Equipo */}
      {editingTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingTeam(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">Editar Equipo</h2>
            
            {/* Logo Preview & Upload */}
            <div className="flex flex-col items-center mb-6">
              <div 
                className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center mb-3 cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-500 transition relative group"
                style={{ backgroundColor: editColor || '#f1f5f9' }}
                onClick={() => fileInputRef.current?.click()}
              >
                {editLogo ? (
                  <>
                    <img src={editLogo} alt="Logo" className="w-full h-full object-contain" />
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                      <span className="text-white text-sm font-medium">Cambiar</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    {uploading ? (
                      <span className="text-sm text-gray-400">Subiendo...</span>
                    ) : (
                      <>
                        <span className="text-3xl block">📷</span>
                        <span className="text-[10px] text-gray-400 font-medium">Subir logo</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleLogoUpload}
              />
              {editLogo && (
                <button
                  onClick={() => setEditLogo(null)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Quitar logo
                </button>
              )}
            </div>

            {/* Nombre */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Equipo</label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                placeholder="Nombre del equipo"
              />
            </div>

            {/* Color */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Color del Equipo</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={editColor || '#1e293b'}
                  onChange={(e) => setEditColor(e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border-2 border-gray-200"
                />
                <input
                  type="text"
                  value={editColor}
                  onChange={(e) => setEditColor(e.target.value)}
                  placeholder="#1e293b"
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none text-sm"
                />
                {editColor && (
                  <button
                    onClick={() => setEditColor('')}
                    className="text-xs text-gray-400 hover:text-red-500"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setEditingTeam(null)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit || !editName.trim()}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition font-medium"
              >
                {savingEdit ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}