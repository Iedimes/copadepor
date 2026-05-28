'use client'

import { useEffect, useState } from 'react'

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#374151']

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
  players?: any[]
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
  const [teamLogo, setTeamLogo] = useState<string | null>(null)
  const [teamColor, setTeamColor] = useState<string | null>('#3b82f6')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberNumber, setNewMemberNumber] = useState('')
  const [memberRole, setMemberRole] = useState<'PLAYER' | 'COACH' | 'ASSISTANT' | 'TECHNICAL'>('PLAYER')
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'players' | 'technical'>('players')
  
  // New States for Search and Quick Add
  const [searchQuery, setSearchQuery] = useState('')
  const [quickTeamName, setQuickTeamName] = useState('')
  const [expandedSection, setExpandedSection] = useState<'players' | 'technical' | null>(null)

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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, isForDetail: boolean = false) => {
    const file = e.target.files?.[0]
    if (!file) return

    setSaving(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', 'teams')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        const data = await res.json()
        if (isForDetail && selectedTeam) {
          setSelectedTeam({ ...selectedTeam, logo: data.url })
        } else {
          setTeamLogo(data.url)
        }
      } else {
        const err = await res.json()
        alert(err.error || 'Error al subir la imagen')
      }
    } catch (error) {
      console.error('Error uploading logo:', error)
      alert('Error al subir la imagen')
    } finally {
      setSaving(false)
    }
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
      body: JSON.stringify({
        name: teamName,
        coach: teamCoach,
        logo: teamLogo || null,
        color: teamColor || '#3b82f6'
      }),
    })

    if (res.ok) {
      setTeamName('')
      setTeamCoach('')
      setTeamLogo(null)
      setTeamColor('#3b82f6')
      setEditTeam(null)
      setShowModal(false)
      fetchTeams()
    }
    setSaving(false)
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTeamName.trim()) return

    setSaving(true)
    const token = localStorage.getItem('token')
    const randomColor = PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]
    
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name: quickTeamName.trim(), 
          color: randomColor 
        }),
      })

      if (res.ok) {
        setQuickTeamName('')
        fetchTeams()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al crear equipo')
      }
    } catch (error) {
      console.error('Error creating team quickly:', error)
      alert('Error al crear equipo')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (team: Team) => {
    setEditTeam(team)
    setTeamName(team.name)
    setTeamCoach(team.coach || '')
    setTeamLogo(team.logo || null)
    setTeamColor(team.color || '#3b82f6')
    setShowModal(true)
  }

  const openNew = () => {
    setEditTeam(null)
    setTeamName('')
    setTeamCoach('')
    setTeamLogo(null)
    setTeamColor('#3b82f6')
    setShowModal(true)
  }

  const openTeamDetail = async (team: Team) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/teams/${team.id}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setSelectedTeam(data)
    setShowTeamModal(true)
    setExpandedSection(null) // Reset section expansion
    setShowAddMember(false)
  }

  const handleAddMember = async (overrideRole?: 'PLAYER' | 'COACH' | 'ASSISTANT' | 'TECHNICAL') => {
    if (!newMemberName.trim() || !selectedTeam) return
    
    setSaving(true)
    const token = localStorage.getItem('token')
    const roleToSend = overrideRole || memberRole
    
    const res = await fetch(`/api/teams/${selectedTeam.id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: newMemberName,
        role: roleToSend,
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
        logo: selectedTeam.logo || null,
        color: selectedTeam.color || '#3b82f6'
      }),
    })
    setSaving(false)
    fetchTeams()
  }

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando...</div>

  const filteredTeams = teams.filter(team => 
    team.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (team.coach && team.coach.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Registro de Equipos</h1>
          <p className="text-sm text-gray-500 mt-1">Administra los escudos, colores y jugadores de cada equipo de forma práctica.</p>
        </div>
        <button 
          onClick={openNew}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5 text-sm"
        >
          <span>➕</span> Nuevo Equipo (Detallado)
        </button>
      </div>

      {/* Control Card: Quick Add + Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Add Form */}
          <form onSubmit={handleQuickAdd} className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Creación Rápida de Equipo</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quickTeamName}
                onChange={(e) => setQuickTeamName(e.target.value)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-800 font-semibold shadow-inner bg-gray-50/50"
                placeholder="Nombre del nuevo equipo..."
              />
              <button
                type="submit"
                disabled={saving || !quickTeamName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl transition-all shadow disabled:opacity-50 text-sm whitespace-nowrap"
              >
                Añadir
              </button>
            </div>
          </form>

          {/* Search Bar */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Buscador</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-800 font-semibold shadow-inner bg-gray-50/50"
                placeholder="Buscar equipo por nombre o DT..."
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Counter */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-bold uppercase tracking-wider">
          <span>Total de equipos: {teams.length}</span>
          {searchQuery && <span>Encontrados: {filteredTeams.length}</span>}
        </div>
      </div>

      {/* Teams List */}
      {filteredTeams.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
          {filteredTeams.map((team) => {
            const localPlayerCount = team.teamMembers?.filter(m => m.role === 'PLAYER').length || 0;
            const globalPlayerCount = team.players?.length || 0;
            const playerCount = localPlayerCount + globalPlayerCount;
            return (
              <div 
                key={team.id} 
                className="flex items-center justify-between p-4 hover:bg-gray-50/50 transition-all group cursor-pointer"
                onClick={() => openTeamDetail(team)}
              >
                <div className="flex items-center gap-4">
                  {/* Team Emblem container */}
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-2xl overflow-hidden shadow-inner relative border border-gray-200"
                    style={{ backgroundColor: team.color || '#3b82f6' }}
                  >
                    {team.logo ? (
                      <img src={team.logo} alt={team.name} className="w-full h-full object-cover animate-fade-in" />
                    ) : (
                      <span className="text-3xl select-none">🏆</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-lg group-hover:text-blue-600 transition-colors">{team.name}</h3>
                    <p className="text-xs text-gray-400 font-bold mt-0.5 uppercase tracking-wide">
                      {playerCount} {playerCount === 1 ? 'Jugador' : 'Jugadores'}
                      {team.coach && ` • DT: ${team.coach}`}
                    </p>
                  </div>
                </div>
                
                {/* Action buttons on the right */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => openTeamDetail(team)} 
                    className="w-10 h-10 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-full flex items-center justify-center text-lg transition-all shadow-sm hover:scale-105"
                    title="Gestionar Miembros"
                  >
                    👥
                  </button>
                  <button 
                    onClick={() => openEdit(team)} 
                    className="w-10 h-10 bg-gray-50 text-gray-600 hover:bg-gray-100 rounded-full flex items-center justify-center text-sm transition-all border border-gray-200 hover:scale-105"
                    title="Editar Información"
                  >
                    ✏️
                  </button>
                  <button 
                    onClick={() => handleDelete(team)} 
                    className="w-10 h-10 bg-red-50 text-red-600 hover:bg-red-100 rounded-full flex items-center justify-center text-sm transition-all hover:scale-105 animate-pulse-slow"
                    title="Eliminar Equipo"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No se encontraron equipos</h3>
          <p className="text-gray-400 font-semibold mb-6">Prueba a buscar otro término o registra un nuevo equipo.</p>
          <button 
            onClick={openNew}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 font-bold transition-all shadow"
          >
            Crear Equipo
          </button>
        </div>
      )}

      {/* Create/Edit Detailed Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 text-center">
              {editTeam ? '✏️ Editar Equipo' : '🏆 Nuevo Equipo'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre del Equipo</label>
                <input
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-semibold text-gray-800 shadow-sm bg-gray-50/30"
                  placeholder="Ej: Los Tigres"
                  required
                  autoFocus
                />
              </div>

              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Entrenador (DT)</label>
                <input
                  type="text"
                  value={teamCoach}
                  onChange={(e) => setTeamCoach(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-semibold text-gray-800 shadow-sm bg-gray-50/30"
                  placeholder="Nombre del DT"
                />
              </div>

              {/* Logo Upload */}
              <div className="mb-5">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Escudo del Equipo</label>
                <div className="flex items-center gap-4 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                  <div 
                    className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-black text-xl overflow-hidden shadow-inner relative border border-gray-200"
                    style={{ backgroundColor: teamColor || '#3b82f6' }}
                  >
                    {teamLogo ? (
                      <img src={teamLogo} alt="Preview logo" className="w-full h-full object-cover" />
                    ) : (
                      teamName ? teamName.charAt(0).toUpperCase() : '?'
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="inline-block bg-white hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-xl cursor-pointer transition-all text-xs border border-gray-200 shadow-sm">
                      {saving ? 'Cargando...' : 'Subir Imagen'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleLogoUpload(e, false)} 
                        className="hidden" 
                        disabled={saving}
                      />
                    </label>
                    {teamLogo && (
                      <button 
                        type="button" 
                        onClick={() => setTeamLogo(null)} 
                        className="ml-3 text-red-500 hover:text-red-700 text-xs font-bold"
                      >
                        Eliminar
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">Formatos permitidos: PNG, JPG, WEBP. Máx 5MB</p>
                  </div>
                </div>
              </div>

              {/* Color Picker */}
              <div className="mb-6">
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Color Representativo</label>
                <div className="flex items-center gap-3 bg-gray-50/50 p-3 rounded-2xl border border-gray-100">
                  <input
                    type="color"
                    value={teamColor || '#3b82f6'}
                    onChange={(e) => setTeamColor(e.target.value)}
                    className="w-10 h-10 border-0 rounded-lg cursor-pointer bg-transparent focus:outline-none"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setTeamColor(c)}
                        className={`w-6 h-6 rounded-full border transition-all ${teamColor === c ? 'scale-125 border-black shadow' : 'border-gray-200 hover:scale-110'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !teamName.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow disabled:opacity-50 text-sm"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Redesigned Double Column Detail & Collapsible Modal */}
      {showTeamModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowTeamModal(false)}>
          <div 
            className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-200" 
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Close button */}
            <button 
              onClick={() => setShowTeamModal(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors z-10 font-bold text-xs"
            >
              ✕
            </button>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-0 md:divide-x md:divide-gray-100">
              
              {/* Left Column: Logo & Color */}
              <div className="md:col-span-2 p-6 flex flex-col items-center justify-center bg-gray-50/50">
                <div className="relative w-32 h-32 group rounded-2xl overflow-hidden shadow-md border-4 border-white mb-4 cursor-pointer">
                  <div 
                    className="w-full h-full flex items-center justify-center text-white font-black text-4xl"
                    style={{ backgroundColor: selectedTeam.color || '#3b82f6' }}
                  >
                    {selectedTeam.logo ? (
                      <img src={selectedTeam.logo} alt={selectedTeam.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-5xl select-none">🏆</span>
                    )}
                  </div>
                  {/* Hover Upload Overlay */}
                  <label className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                    <span className="text-xl mb-1">📷</span>
                    <span>Cambiar Logo</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={(e) => handleLogoUpload(e, true)} 
                      className="hidden" 
                    />
                  </label>
                </div>

                {selectedTeam.logo && (
                  <button
                    type="button"
                    onClick={() => setSelectedTeam({ ...selectedTeam, logo: null })}
                    className="text-red-500 hover:text-red-700 text-xs font-bold mb-4"
                  >
                    Eliminar Escudo
                  </button>
                )}

                {/* Color Selector */}
                <div className="w-full text-center">
                  <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block mb-2">Color del Equipo</span>
                  <div className="flex justify-center items-center gap-2 mb-3">
                    <input
                      type="color"
                      value={selectedTeam.color || '#3b82f6'}
                      onChange={(e) => setSelectedTeam({ ...selectedTeam, color: e.target.value })}
                      className="w-8 h-8 border-0 rounded-lg cursor-pointer bg-transparent focus:outline-none"
                    />
                    <div className="flex gap-1">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setSelectedTeam({ ...selectedTeam, color: c })}
                          className={`w-5 h-5 rounded-full border transition-transform ${selectedTeam.color === c ? 'scale-110 border-black shadow' : 'border-gray-200 hover:scale-105'}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Inputs & Collapsible Lists */}
              <div className="md:col-span-3 p-6 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
                <div>
                  {/* Title Fields */}
                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nombre del equipo</label>
                      <input
                        type="text"
                        value={selectedTeam.name}
                        onChange={(e) => setSelectedTeam({ ...selectedTeam, name: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-bold text-gray-800 text-lg shadow-sm"
                        placeholder="Nombre del equipo"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Entrenador</label>
                      <input
                        type="text"
                        value={selectedTeam.coach || ''}
                        onChange={(e) => setSelectedTeam({ ...selectedTeam, coach: e.target.value })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-gray-700 shadow-sm"
                        placeholder="Nombre del DT"
                      />
                    </div>
                  </div>

                  {/* Expandable Accordion Rows */}
                  <div className="space-y-3 mb-6">
                    {/* Players Section */}
                    <div>
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'players' ? null : 'players')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border font-bold text-left transition-all ${expandedSection === 'players' ? 'bg-blue-50/50 border-blue-200 text-blue-700 shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-gray-100/50 text-gray-700'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span>👥</span> Jugadores ({(selectedTeam.teamMembers?.filter(m => m.role === 'PLAYER').length || 0) + (selectedTeam.players?.length || 0)})
                        </span>
                        <span className="text-xs">{expandedSection === 'players' ? '▼' : '▶'}</span>
                      </button>

                      {expandedSection === 'players' && (
                        <div className="mt-2 p-3 bg-gray-50/30 rounded-xl border border-gray-100 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          {/* Agregar jugador local */}
                          <div className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              placeholder="Nombre de jugador local"
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                            <input
                              type="number"
                              value={newMemberNumber}
                              onChange={(e) => setNewMemberNumber(e.target.value)}
                              placeholder="N°"
                              className="w-14 px-2 py-1.5 text-xs border border-gray-200 rounded-lg text-center focus:outline-none focus:border-blue-500"
                            />
                            <button
                              onClick={() => { handleAddMember('PLAYER'); }}
                              disabled={saving || !newMemberName.trim()}
                              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>
                          
                          <div className="space-y-1.5 max-h-56 overflow-y-auto pt-1">
                            {/* Mostrar jugadores globales (Oficiales) */}
                            {selectedTeam.players?.map((tp: any) => (
                              <div key={tp.id} className="flex items-center justify-between bg-blue-50/50 px-3 py-2 rounded-lg border border-blue-100 shadow-sm text-sm">
                                <div className="flex items-center gap-2">
                                  {tp.number !== null && tp.number !== undefined && (
                                    <span className="w-5 h-5 bg-blue-200 text-blue-800 font-bold rounded-full flex items-center justify-center text-[10px]">
                                      {tp.number}
                                    </span>
                                  )}
                                  <span className="font-bold text-blue-800">{tp.player?.user?.name || 'Jugador Oficial'}</span>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 uppercase">Oficial</span>
                                </div>
                                <span className="text-[10px] text-gray-400 font-semibold italic">Padrón Global</span>
                              </div>
                            ))}

                            {/* Mostrar jugadores locales */}
                            {selectedTeam.teamMembers
                              ?.filter(m => m.role === 'PLAYER')
                              .map(member => (
                                <div key={member.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm text-sm">
                                  <div className="flex items-center gap-2">
                                    {member.number !== null && (
                                      <span className="w-5 h-5 bg-blue-100 text-blue-700 font-bold rounded-full flex items-center justify-center text-[10px]">
                                        {member.number}
                                      </span>
                                    )}
                                    <span className="font-semibold text-gray-700">{member.name}</span>
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 uppercase">Local</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteMember(member.id)}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}

                            {(!selectedTeam.teamMembers?.filter(m => m.role === 'PLAYER').length && !selectedTeam.players?.length) && (
                              <p className="text-center text-xs text-gray-400 py-3">No hay jugadores registrados</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Technical Staff Section */}
                    <div>
                      <button
                        onClick={() => setExpandedSection(expandedSection === 'technical' ? null : 'technical')}
                        className={`w-full flex items-center justify-between p-3.5 rounded-xl border font-bold text-left transition-all ${expandedSection === 'technical' ? 'bg-amber-50/50 border-amber-200 text-amber-700 shadow-sm' : 'bg-gray-50 border-gray-100 hover:bg-gray-100/50 text-gray-700'}`}
                      >
                        <span className="flex items-center gap-2">
                          <span>🏃</span> Cuerpo Técnico ({selectedTeam.teamMembers?.filter(m => m.role !== 'PLAYER').length || 0})
                        </span>
                        <span className="text-xs">{expandedSection === 'technical' ? '▼' : '▶'}</span>
                      </button>

                      {expandedSection === 'technical' && (
                        <div className="mt-2 p-3 bg-gray-50/30 rounded-xl border border-gray-100 space-y-2 animate-in slide-in-from-top-2 duration-200">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newMemberName}
                              onChange={(e) => setNewMemberName(e.target.value)}
                              placeholder="Nombre completo"
                              className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                            />
                            <select
                              value={memberRole === 'PLAYER' ? 'COACH' : memberRole}
                              onChange={(e: any) => setMemberRole(e.target.value)}
                              className="px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
                            >
                              <option value="COACH">DT</option>
                              <option value="ASSISTANT">Asistente</option>
                              <option value="TECHNICAL">Kinesiólogo / PF</option>
                            </select>
                            <button
                              onClick={() => {
                                const roleToSend = memberRole === 'PLAYER' ? 'COACH' : memberRole;
                                handleAddMember(roleToSend);
                              }}
                              disabled={saving || !newMemberName.trim()}
                              className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-amber-700 disabled:opacity-50"
                            >
                              +
                            </button>
                          </div>

                          <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1">
                            {selectedTeam.teamMembers
                              ?.filter(m => m.role !== 'PLAYER')
                              .map(member => (
                                <div key={member.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm text-sm">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] uppercase font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                                      {member.role === 'COACH' ? 'DT' : member.role === 'ASSISTANT' ? 'Asist.' : 'Téc.'}
                                    </span>
                                    <span className="font-semibold text-gray-700">{member.name}</span>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteMember(member.id)}
                                    className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))}
                            {selectedTeam.teamMembers?.filter(m => m.role !== 'PLAYER').length === 0 && (
                              <p className="text-center text-xs text-gray-400 py-3">No hay cuerpo técnico registrado</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom action buttons */}
                <div className="flex items-center justify-between border-t border-gray-100 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleDelete(selectedTeam);
                      setShowTeamModal(false);
                    }}
                    className="px-6 py-2.5 text-red-600 hover:bg-red-50 rounded-xl font-bold transition-all text-sm"
                  >
                    Quitar
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowTeamModal(false)}
                      className="px-5 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-600 font-bold transition-all text-sm"
                    >
                      Atrás
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        saveTeam();
                        setShowTeamModal(false);
                      }}
                      disabled={saving}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm disabled:opacity-50"
                    >
                      {saving ? 'Guardando...' : 'Guardar'}
                    </button>
                  </div>
                </div>

              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  )
}