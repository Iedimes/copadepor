'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Tournament {
  id: string
  name: string
  sportType: string
  status: string
  startDate: string
}

interface Stats {
  tournaments: number
  teams: number
  matches: number
  players: number
}

const sports = [
  { id: 'FUTBOL_11', name: 'Fútbol', icon: '⚽' },
  { id: 'FUTSAL', name: 'Futsal', icon: '⚽' },
  { id: 'FUTBOL_7', name: 'Fútbol 7', icon: '⚽' },

  { id: 'BALONMANO', name: 'Balonmano', icon: '🤾' },
  { id: 'BALONCESTO', name: 'Baloncesto', icon: '🏀' },
  { id: 'VOLEY', name: 'Voleibol', icon: '🏐' },
  { id: 'VOLEY_PLAYA', name: 'Voleibol de Playa', icon: '🏐' },
  { id: 'TENIS_MESA', name: 'Tenis de Mesa', icon: '🏓' },
  { id: 'TENIS', name: 'Tenis', icon: '🎾' },
  { id: 'BEACH_TENNIS', name: 'Beach Tennis', icon: '🏖️' },
  { id: 'AJEDREZ', name: 'Ajedrez', icon: '♟️' },
  { id: 'ATLETISMO', name: 'Atletismo', icon: '🏃' },
  { id: 'DEPORTE_GENERICO', name: 'Deporte Genérico', icon: '🏅' },
  { id: 'DISPAROS', name: 'Juego de Disparos', icon: '🔫' },
  { id: 'BATTLE_ROYALE', name: 'Battle Royale', icon: '🎮' },
  { id: 'MOBA_LOL', name: 'MOBA (LoL)', icon: '🛡️' },
  { id: 'MOBA_DOTA', name: 'MOBA (Dota)', icon: '🛡️' },
]

const CRITERIA_OPTIONS = [
  { id: 'PUNTOS', label: 'Puntos', description: 'Suma de puntos obtenidos' },
  { id: 'GOLES', label: 'Goles', description: 'Diferencia de goles' },
  { id: 'GOLES_A_FAVOR', label: 'Goles a Favor', description: 'Total de goles marcados' },
  { id: 'RESULTADOS_ENTRE_SI', label: 'Resultados Entre Sí', description: 'Desempate directo' },
  { id: 'TARJETAS_AMARILLAS', label: 'Tarjetas Amarillas', description: 'Menos tarjetas amarillas' },
  { id: 'TARJETAS_ROJAS', label: 'Tarjetas Rojas', description: 'Menos tarjetas rojas' },
  { id: 'W_O', label: 'W.O. (Walkover)', description: 'Victorias por incomparecencia' },
]

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ tournaments: 0, teams: 0, matches: 0, players: 0 })
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showSportModal, setShowSportModal] = useState(false)
  const [showCriteriaModal, setShowCriteriaModal] = useState(false)
  const [showChampionshipModal, setShowChampionshipModal] = useState(false)
  const [selectedSport, setSelectedSport] = useState('')
  const [championshipName, setChampionshipName] = useState('')
  const [championshipFormat, setChampionshipFormat] = useState('todos_contra_todos')
  const [selectedChampionshipType, setSelectedChampionshipType] = useState<'single' | 'multiple' | ''>('')
  const [classificationCriteria, setClassificationCriteria] = useState<string[]>(
    CRITERIA_OPTIONS.map(c => c.id)
  )
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token')
      try {
        const [tournamentsRes, teamsRes, matchesRes] = await Promise.all([
          fetch('/api/tournaments', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/matches', { headers: { Authorization: `Bearer ${token}` } }),
        ])

        if (!tournamentsRes.ok) {
          if (tournamentsRes.status === 401) {
            router.push('/login')
            return
          }
          const errorData = await tournamentsRes.text()
          console.error('Tournaments API error:', tournamentsRes.status, errorData)
        }

        const tournamentsData = await tournamentsRes.json().catch(() => [])
        const teamsData = await teamsRes.json().catch(() => [])
        const matchesData = await matchesRes.json().catch(() => [])

        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : [])
        setStats({
          tournaments: Array.isArray(tournamentsData) ? tournamentsData.length : 0,
          teams: Array.isArray(teamsData) ? teamsData.length : 0,
          matches: Array.isArray(matchesData) ? matchesData.length : 0,
          players: 0,
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [router])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'bg-green-100 text-green-800'
      case 'REGISTRATION_OPEN': return 'bg-blue-100 text-blue-800'
      case 'COMPLETED': return 'bg-gray-100 text-gray-800'
      default: return 'bg-yellow-100 text-yellow-800'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'En curso'
      case 'REGISTRATION_OPEN': return 'Inscripciones'
      case 'COMPLETED': return 'Finalizado'
      default: return 'Borrador'
    }
  }

  const handleTypeSelect = (type: 'single' | 'multiple') => {
    setSelectedChampionshipType(type)
    setShowTypeModal(false)
    if (type === 'multiple') {
      setSelectedSport('FUTBOL_11')
      setClassificationCriteria(CRITERIA_OPTIONS.map(c => c.id))
      setTimeout(() => setShowChampionshipModal(true), 100)
    } else {
      setTimeout(() => setShowSportModal(true), 100)
    }
  }

  const handleSportSelect = (sportId: string) => {
    console.log('Selected sport:', sportId)
    setSelectedSport(sportId)
    setShowSportModal(false)
    setTimeout(() => {
      console.log('Showing criteria modal')
      setShowCriteriaModal(true)
    }, 100)
  }

  const handleCriteriaConfirm = () => {
    setShowCriteriaModal(false)
    setTimeout(() => {
      setShowChampionshipModal(true)
    }, 100)
  }

  const handleMoveCriteria = (from: number, to: number) => {
    const newCriteria = [...classificationCriteria]
    const [moved] = newCriteria.splice(from, 1)
    newCriteria.splice(to, 0, moved)
    setClassificationCriteria(newCriteria)
  }

  const [deleteConfirm, setDeleteConfirm] = useState<{
    tournament: Tournament
    details: { teams: number; matches: number; categories: number; phases: number; sponsors: number; news: number }
  } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const handleDeleteTournament = (e: React.MouseEvent, tournament: Tournament) => {
    e.stopPropagation()
    setDeleteConfirm({ tournament, details: { teams: 0, matches: 0, categories: 0, phases: 0, sponsors: 0, news: 0 } })
  }

  const handleConfirmForceDelete = async () => {
    if (!deleteConfirm) return
    setDeleting(true)
    
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${deleteConfirm.tournament.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (res.ok) {
      setTournaments(tournaments.filter(t => t.id !== deleteConfirm.tournament.id))
      setStats({ ...stats, tournaments: stats.tournaments - 1 })
      setDeleteConfirm(null)
    } else {
      const err = await res.json()
      alert(err.error || 'Error al eliminar')
    }
    setDeleting(false)
  }

  const handleCreateChampionship = async () => {
    if (!championshipName.trim() || !selectedSport) {
      alert('Por favor completa todos los campos')
      return
    }
    
    if (classificationCriteria.length === 0) {
      alert('Debes seleccionar al menos un criterio de clasificación')
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      console.log('Sending:', { 
        name: championshipName, 
        sportType: selectedSport, 
        format: championshipFormat,
        classificationCriteria: classificationCriteria.join(',')
      })
      
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: championshipName,
          sportType: selectedSport,
          format: selectedChampionshipType === 'multiple' ? 'categorias' : championshipFormat,
          classificationCriteria: classificationCriteria.join(','),
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }),
      })

      const data = await res.json()
      console.log('Response:', res.status, data)
      
      if (res.ok) {
        setShowChampionshipModal(false)
        setChampionshipName('')
        setSelectedSport('')
        setChampionshipFormat('todos_contra_todos')
        setSelectedChampionshipType('')
        setClassificationCriteria(CRITERIA_OPTIONS.map(c => c.id))
        setTournaments((prev) => [data, ...prev])
        setStats((prev) => ({ ...prev, tournaments: prev.tournaments + 1 }))
      } else {
        alert('Error: ' + (data.error || 'No se pudo crear el campeonato'))
      }
    } catch (error) {
      console.error('Error creating championship:', error)
    } finally {
      setLoading(false)
    }
  }

  const getSportIcon = (sportType: string) => {
    const sport = sports.find(s => s.id === sportType)
    return sport ? sport.icon : '🏅'
  }

  const getSportName = (sportType: string) => {
    const sport = sports.find(s => s.id === sportType)
    return sport ? sport.name : sportType
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-10">
      {/* HEADER SECTION WITH CREATE BUTTON PROMINENTLY AT THE TOP */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-[#0A1128] uppercase tracking-tight">Mis Campeonatos</h1>
          <p className="text-slate-500 font-medium text-sm mt-1">Administra, organiza y sigue el progreso de todos tus torneos activos.</p>
        </div>
        <button
          onClick={() => setShowTypeModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all hover:scale-[1.02] flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <span>🏆</span> Nuevo Campeonato
        </button>
      </div>

      {/* STATS / KPI ROW - WIDESCREEN EXPLOITATION */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* KPI 1: Campeonatos */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center gap-5 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-2xl text-amber-500 shrink-0 shadow-sm">
            🏆
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Mis Campeonatos</span>
            <span className="text-2xl font-black text-slate-900 leading-none mt-1 block">{stats.tournaments}</span>
          </div>
        </div>

        {/* KPI 2: Equipos */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center gap-5 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl text-blue-500 shrink-0 shadow-sm">
            🛡️
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Equipos Registrados</span>
            <span className="text-2xl font-black text-slate-900 leading-none mt-1 block">{stats.teams}</span>
          </div>
        </div>

        {/* KPI 3: Partidos */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 flex items-center gap-5 shadow-xs hover:shadow-md transition-all duration-300">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-2xl text-emerald-500 shrink-0 shadow-sm">
            ⚽
          </div>
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Partidos Agendados</span>
            <span className="text-2xl font-black text-slate-900 leading-none mt-1 block">{stats.matches}</span>
          </div>
        </div>
      </div>

      {/* TOURNAMENTS SECTION - VERTICAL LIST LAYOUT */}
      {tournaments.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] border border-slate-200/80 p-16 flex flex-col items-center justify-center text-center shadow-xs">
          <div className="w-20 h-20 rounded-full bg-slate-50 border flex items-center justify-center text-4xl mb-6 shadow-inner">
            🏆
          </div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">No tienes campeonatos activos</h2>
          <p className="text-slate-400 font-medium text-sm mt-2 max-w-sm">Crea tu primer torneo único o por categorías para comenzar a gestionar equipos y fixtures.</p>
          <button
            onClick={() => setShowTypeModal(true)}
            className="mt-8 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all hover:scale-[1.02]"
          >
            Comenzar Ahora
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-slate-200/80 shadow-sm overflow-hidden p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-black text-[#0A1128] uppercase tracking-wider flex items-center gap-2">
              <span>📋</span> Lista de Campeonatos
            </h2>
            <span className="text-[10px] bg-slate-100 border text-slate-500 font-black px-2.5 py-1 rounded-md uppercase tracking-wider">
              {tournaments.length} creados
            </span>
          </div>

          <div className="space-y-4">
            {tournaments.map((tournament) => {
              const sportIcon = getSportIcon(tournament.sportType)
              const sportName = getSportName(tournament.sportType)
              return (
                <div
                  key={tournament.id}
                  onClick={() => router.push(`/tournaments/${tournament.id}`)}
                  className="group flex flex-col lg:flex-row lg:items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xl transition-all duration-300 gap-4 cursor-pointer relative"
                >
                  {/* Left part: Icon & Name details */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-3xl shrink-0 group-hover:scale-105 transition-all">
                      {sportIcon}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-800 text-base leading-snug group-hover:text-blue-600 transition-colors truncate pr-4">
                        {tournament.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-slate-400 text-xs font-black uppercase tracking-wider">
                          {sportName}
                        </span>
                        <span className="text-slate-300 text-[10px]">•</span>
                        <span className="text-slate-400 text-xs font-bold lowercase first-letter:uppercase">
                          📅 {new Date(tournament.startDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}
                        </span>
                        {tournament.status !== 'DRAFT' && (
                          <>
                            <span className="text-slate-300 text-[10px]">•</span>
                            <span className={`text-[10px] font-black uppercase tracking-wider ${
                              tournament.status === 'IN_PROGRESS' ? 'text-emerald-500' :
                              tournament.status === 'REGISTRATION_OPEN' ? 'text-blue-500' :
                              tournament.status === 'COMPLETED' ? 'text-slate-400' :
                              'text-amber-500'
                            }`}>
                              {getStatusLabel(tournament.status)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right part: Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/tournaments/${tournament.id}`)
                        }}
                        className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-xs font-black uppercase tracking-wider border border-blue-100 transition-all"
                      >
                        Gestionar
                      </button>
                      <button
                        onClick={(e) => handleDeleteTournament(e, tournament)}
                        className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl border border-transparent hover:border-red-100 transition-all"
                        title="Eliminar Campeonato"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal: Tipo de Campeonato */}
      {showTypeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowTypeModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Nuevo Campeonato</h2>
            <p className="text-gray-600 text-center mb-6">Selecciona el tipo de campeonato</p>
            <div className="space-y-4">
              <button
                onClick={() => handleTypeSelect('single')}
                className="w-full text-left p-5 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="text-3xl mb-2">🏆</div>
                <h3 className="text-lg font-semibold text-gray-800">Campeonato Único</h3>
                <p className="text-sm text-gray-500">Un solo deporte y una sola categoría</p>
              </button>
              <button
                onClick={() => handleTypeSelect('multiple')}
                className="w-full text-left p-5 border-2 border-gray-200 rounded-2xl hover:border-blue-500 hover:bg-blue-50 transition"
              >
                <div className="text-3xl mb-2">📊</div>
                <h3 className="text-lg font-semibold text-gray-800">Campeonato con Categorías</h3>
                <p className="text-sm text-gray-500">Múltiples categorías por edad, género o modalidad</p>
              </button>
            </div>
            <button onClick={() => setShowTypeModal(false)} className="mt-6 w-full py-3 text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Selección de Deporte */}
      {showSportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowSportModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-3xl w-full mx-4 shadow-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">🎯 Selecciona la Modalidad</h2>
            <p className="text-gray-600 text-center mb-6">Elige el deporte para tu campeonato</p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => handleSportSelect(sport.id)}
                  className="p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition text-center group"
                >
                  <div className="text-3xl mb-2">{sport.icon}</div>
                  <div className="text-sm font-medium text-gray-800 group-hover:text-blue-600">{sport.name}</div>
                </button>
              ))}
            </div>

            <button onClick={() => setShowSportModal(false)} className="mt-6 w-full py-3 text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Modal: Criterio de Clasificación */}
      {showCriteriaModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCriteriaModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-2xl w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Criterio de Clasificación</h2>
            <p className="text-gray-600 text-center mb-6">Arrastra los criterios para cambiar el orden de prioridad</p>
            
            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {classificationCriteria.map((criterionId, index) => {
                const criterion = CRITERIA_OPTIONS.find(c => c.id === criterionId)
                return (
                  <div
                    key={criterionId}
                    draggable
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      const draggedIndex = parseInt(e.dataTransfer.getData('index'))
                      handleMoveCriteria(draggedIndex, index)
                    }}
                    onDragStart={(e) => e.dataTransfer.setData('index', index.toString())}
                    className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 cursor-move transition bg-white"
                  >
                    <span className="text-lg text-gray-400">⋮⋮</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{criterion?.label}</p>
                      <p className="text-xs text-gray-500">{criterion?.description}</p>
                    </div>
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                      {index + 1}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700">
                <span className="font-semibold">💡 Tip:</span> El orden determina la prioridad para desempate. El criterio en posición 1 tiene máxima prioridad.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowCriteriaModal(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCriteriaConfirm}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Nuevo Campeonato */}
      {showChampionshipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowChampionshipModal(false)}>
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Nuevo Campeonato</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Campeonato</label>
                <input
                  type="text"
                  value={championshipName}
                  onChange={(e) => setChampionshipName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none"
                  placeholder="Ej: Copa Oro"
                />
              </div>

              {selectedChampionshipType !== 'multiple' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Fases del Campeonato</label>
                  <div className="space-y-2">
                    <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                      <input
                        type="radio"
                        name="format"
                        value="todos_contra_todos"
                        checked={championshipFormat === 'todos_contra_todos'}
                        onChange={(e) => setChampionshipFormat(e.target.value)}
                        className="mr-3 mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Todos contra todos</p>
                        <p className="text-xs text-gray-500">Una única fase donde todos los equipos juegan entre sí</p>
                      </div>
                    </label>
                    <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                      <input
                        type="radio"
                        name="format"
                        value="liga_eliminacion"
                        checked={championshipFormat === 'liga_eliminacion'}
                        onChange={(e) => setChampionshipFormat(e.target.value)}
                        className="mr-3 mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Todos contra todos + Eliminatoria</p>
                        <p className="text-xs text-gray-500">Liga inicial seguida de fase eliminatoria con los mejores equipos</p>
                      </div>
                    </label>
                    <label className="flex items-start p-4 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                      <input
                        type="radio"
                        name="format"
                        value="eliminacion"
                        checked={championshipFormat === 'eliminacion'}
                        onChange={(e) => setChampionshipFormat(e.target.value)}
                        className="mr-3 mt-1"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-gray-800">Eliminatoria</p>
                        <p className="text-xs text-gray-500">Sistema de eliminación directa</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {selectedChampionshipType !== 'multiple' ? (
                <p className="text-sm text-gray-500 italic">
                  * Se pueden crear o eliminar fases más tarde
                </p>
              ) : (
                <p className="text-sm text-gray-500 italic">
                  * Podrás crear y configurar las categorías y sus fases en el panel de inicio del campeonato.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowChampionshipModal(false)}
                className="px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateChampionship}
                disabled={!championshipName.trim() || loading}
                className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Campeonato'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2 text-center">¿Eliminar Campeonato?</h2>
            <p className="text-gray-600 text-center mb-4">
              <strong>&quot;{deleteConfirm.tournament.name}&quot;</strong> se eliminará permanentemente.
            </p>

            <p className="text-sm text-red-600 text-center mb-6 font-medium">
              Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-3 border-2 border-gray-300 rounded-xl text-gray-600 hover:bg-gray-50 transition font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmForceDelete}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition font-medium"
              >
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}