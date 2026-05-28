'use client'

import { useEffect, useState } from 'react'

interface Team {
  id: string
  name: string
  color: string | null
}

interface Player {
  id: string
  name: string
  dni: string
  dateOfBirth: string
  age: number
  isGlobal?: boolean
  team: {
    id: string
    name: string
    color: string
  } | null
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editPlayer, setEditPlayer] = useState<Player | null>(null)
  
  // Fields state
  const [playerName, setPlayerName] = useState('')
  const [playerDni, setPlayerDni] = useState('')
  const [playerBirthDate, setPlayerBirthDate] = useState('')
  const [playerTeamId, setPlayerTeamId] = useState('')
  const [allowAgeException, setAllowAgeException] = useState(false)
  const [ageErrorAlert, setAgeErrorAlert] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const getLiveAge = (dobString: string) => {
    if (!dobString || dobString === 'Sin fecha') return null
    const dob = new Date(dobString)
    if (isNaN(dob.getTime())) return null
    const today = new Date()
    let age = today.getFullYear() - dob.getFullYear()
    const m = today.getMonth() - dob.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--
    }
    return age
  }

  const filteredPlayers = players.filter((player) => {
    const term = searchTerm.toLowerCase()
    return (
      player.name.toLowerCase().includes(term) ||
      (player.dni && player.dni.toLowerCase().includes(term)) ||
      (player.team?.name && player.team.name.toLowerCase().includes(term))
    )
  })

  useEffect(() => {
    fetchPlayers()
    fetchTeams()
  }, [])

  const fetchPlayers = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/simple-players', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setPlayers(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  const fetchTeams = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setTeams(Array.isArray(data) ? data : [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!playerName.trim()) return

    setSaving(true)
    setAgeErrorAlert(null)
    const token = localStorage.getItem('token')
    if (!token) {
      alert('No hay sesión. Inicia sesión primero.')
      setSaving(false)
      return
    }
    
    const url = editPlayer ? `/api/simple-players/${editPlayer.id}` : '/api/simple-players'
    const method = editPlayer ? 'PUT' : 'POST'
    
    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name: playerName,
          dni: playerDni || undefined,
          dateOfBirth: playerBirthDate || undefined,
          teamId: playerTeamId || null,
          allowAgeException: allowAgeException
        }),
      })

      const data = await res.json()
      
      if (res.ok) {
        setPlayerName('')
        setPlayerDni('')
        setPlayerBirthDate('')
        setPlayerTeamId('')
        setAllowAgeException(false)
        setAgeErrorAlert(null)
        setEditPlayer(null)
        setShowModal(false)
        fetchPlayers()
      } else {
        if (data.ageValidationFailed) {
          setAgeErrorAlert(data.error)
        } else {
          alert(data.error || 'Error al guardar')
        }
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      alert('Error de conexión al guardar')
    } finally {
      setSaving(false)
    }
  }

  const openEdit = (player: Player) => {
    setEditPlayer(player)
    setPlayerName(player.name)
    setPlayerDni(player.isGlobal ? (player.dni || '') : '')
    setPlayerBirthDate(player.isGlobal && player.dateOfBirth !== 'Sin fecha' ? (player.dateOfBirth || '') : '2000-01-01')
    setPlayerTeamId(player.team?.id || '')
    setAllowAgeException(false)
    setAgeErrorAlert(null)
    setShowModal(true)
  }

  const openNew = () => {
    setEditPlayer(null)
    setPlayerName('')
    setPlayerDni('')
    setPlayerBirthDate('2000-01-01')
    setPlayerTeamId('')
    setAllowAgeException(false)
    setAgeErrorAlert(null)
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

  if (loading) return <div className="p-8 text-center font-bold text-gray-500">Cargando...</div>

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Registro de Jugadores</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión del padrón oficial de jugadores de la liga.</p>
        </div>
        <button 
          onClick={openNew}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-xl hover:bg-blue-700 font-bold transition-all shadow-md flex items-center gap-1 text-sm"
        >
          ➕ Nuevo Jugador
        </button>
      </div>

      {/* Buscador de Jugadores */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute left-3 top-3 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, documento o equipo..."
            className="w-full pl-9 pr-4 py-2 px-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-sm font-semibold text-gray-800 placeholder-gray-400 bg-gray-50/30"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-gray-400 hover:text-red-500 text-sm font-bold"
            >
              ✕
            </button>
          )}
        </div>
        <div className="flex gap-4 text-xs font-bold text-gray-400 uppercase tracking-wider select-none">
          <span>Registrados: {players.length}</span>
          <span>•</span>
          <span>Encontrados: {filteredPlayers.length}</span>
        </div>
      </div>

      {players.length > 0 ? (
        <>
          {filteredPlayers.length > 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-100">
              {filteredPlayers.map((player) => (
                <div key={player.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-gray-50/50 transition-all gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center text-lg font-bold">
                  👤
                </div>
                <div>
                  <span className="block font-bold text-gray-800 text-lg flex items-center gap-2">
                    {player.name}
                    {player.isGlobal ? (
                      <span className="text-[10px] font-black tracking-widest text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md uppercase select-none border border-emerald-200/50">
                        Oficial
                      </span>
                    ) : (
                      <span className="text-[10px] font-black tracking-widest text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md uppercase select-none border border-amber-200/50">
                        Local
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                    {player.isGlobal ? (
                      <>Doc. Identidad: {player.dni} • Edad: {player.age} años ({player.dateOfBirth})</>
                    ) : (
                      <>Registro Local • Documento y Edad no registrados</>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-6">
                {/* Team Badge */}
                <div>
                  {player.team ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border" style={{ borderColor: player.team.color, color: player.team.color, backgroundColor: `${player.team.color}08` }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: player.team.color }}></span>
                      <span>{player.team.name}</span>
                    </div>
                  ) : (
                    <span className="px-3 py-1.5 rounded-full text-xs font-bold text-gray-400 bg-gray-100 select-none">
                      Sin Equipo
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button 
                    onClick={() => openEdit(player)} 
                    className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-lg font-bold transition-all border border-gray-200"
                  >
                    Editar / Transferir
                  </button>
                  <button 
                    onClick={() => handleDelete(player)} 
                    className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-bold transition-all"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <span className="text-4xl block mb-2">🔍</span>
          <h3 className="text-lg font-bold text-gray-700 mb-1">Sin resultados</h3>
          <p className="text-sm text-gray-400 font-semibold">No se encontraron jugadores que coincidan con su búsqueda.</p>
        </div>
      )}
    </>
  ) : (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <div className="text-6xl mb-4">👤</div>
          <h3 className="text-xl font-bold text-gray-700 mb-2">No hay jugadores registrados</h3>
          <p className="text-gray-400 font-semibold mb-6">Registra tu primer jugador global en la liga.</p>
          <button 
            onClick={openNew}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl hover:bg-blue-700 font-bold transition-all shadow"
          >
            Crear Jugador
          </button>
        </div>
      )}

      {/* Modal: Nuevo/Editar Jugador */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-6 text-center">
              {editPlayer ? (editPlayer.isGlobal ? '✏️ Editar Jugador' : '⚡ Completar Registro Oficial') : '👤 Nuevo Jugador'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {editPlayer && !editPlayer.isGlobal && (
                <div className="bg-amber-50 border border-amber-200/50 rounded-2xl p-4 text-xs text-amber-700 font-bold leading-relaxed mb-2">
                  💡 Este jugador es de registro local. Para hacerlo Oficial e inscribirlo de forma permanente en la liga, ingresa su Documento de Identidad y Fecha de Nacimiento.
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Nombre del Jugador</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-semibold text-gray-800 shadow-sm bg-gray-50/30"
                  placeholder="Ej: Juan Pérez"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Documento de Identidad</label>
                <input
                  type="text"
                  value={playerDni}
                  onChange={(e) => setPlayerDni(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-semibold text-gray-800 shadow-sm bg-gray-50/30"
                  placeholder="Ej: 12345678"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Fecha de Nacimiento</label>
                  {playerBirthDate && playerBirthDate !== 'Sin fecha' && (
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200/30">
                      Edad: {getLiveAge(playerBirthDate)} años
                    </span>
                  )}
                </div>
                <input
                  type="date"
                  value={playerBirthDate}
                  onChange={(e) => setPlayerBirthDate(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-semibold text-gray-800 shadow-sm bg-gray-50/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Equipo (Asociar / Transferir)</label>
                <select
                  value={playerTeamId}
                  onChange={(e) => {
                    setPlayerTeamId(e.target.value)
                    setAgeErrorAlert(null)
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none font-semibold text-gray-700 shadow-sm bg-white"
                >
                  <option value="">Sin equipo (Jugador Libre)</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              {/* Age Validation Alert */}
              {ageErrorAlert && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3 animate-in slide-in-from-top-2 duration-200">
                  <p className="text-xs text-red-700 font-semibold leading-relaxed">
                    ⚠️ {ageErrorAlert}
                  </p>
                  
                  {ageErrorAlert.includes('mínimo') && (
                    <div className="flex items-center gap-2 pt-1 border-t border-red-100">
                      <input
                        type="checkbox"
                        id="exceptionCheckbox"
                        checked={allowAgeException}
                        onChange={(e) => setAllowAgeException(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <label htmlFor="exceptionCheckbox" className="text-xs text-red-800 font-bold select-none cursor-pointer">
                        Aplicar caso excepcional (Menor de edad)
                      </label>
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl text-gray-600 font-bold hover:bg-gray-50 transition-all text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !playerName.trim()}
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow disabled:opacity-50 text-sm"
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