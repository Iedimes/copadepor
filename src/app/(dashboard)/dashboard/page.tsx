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
  { id: 'FUTBOL_11', name: 'Fútbol 11', icon: '⚽' },
  { id: 'FUTSAL', name: 'Futsal', icon: '⚽' },
  { id: 'FUTBOL_7', name: 'Fútbol 7', icon: '⚽' },
  { id: 'FUTBOL_SALA', name: 'Fútbol Sala', icon: '⚽' },
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({ tournaments: 0, teams: 0, matches: 0, players: 0 })
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [showTypeModal, setShowTypeModal] = useState(false)
  const [showSportModal, setShowSportModal] = useState(false)
  const [showChampionshipModal, setShowChampionshipModal] = useState(false)
  const [selectedSport, setSelectedSport] = useState('')
  const [championshipName, setChampionshipName] = useState('')
  const [championshipFormat, setChampionshipFormat] = useState('todos_contra_todos')
  const [selectedChampionshipType, setSelectedChampionshipType] = useState<'single' | 'multiple' | ''>('')
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
        
        const tournamentsData = await tournamentsRes.json()
        const teamsData = await teamsRes.json()
        const matchesData = await matchesRes.json()
        
        setTournaments(tournamentsData)
        setStats({
          tournaments: tournamentsData.length,
          teams: teamsData.length,
          matches: matchesData.length,
          players: 0,
        })
      } catch (error) {
        console.error('Error fetching data:', error)
      }
    }
    fetchData()
  }, [])

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

    if (type === 'single') {
      setTimeout(() => setShowSportModal(true), 100)
    } else {
      router.push('/dashboard/tournaments/new?type=multiple')
    }
  }

  const handleSportSelect = (sportId: string) => {
    console.log('Selected sport:', sportId)
    setSelectedSport(sportId)
    setShowSportModal(false)
    setTimeout(() => {
      console.log('Modal state:', { showChampionshipModal: true, selectedSport: sportId })
      setShowChampionshipModal(true)
    }, 100)
  }

  const handleDeleteTournament = async (e: React.MouseEvent, tournament: Tournament) => {
    e.stopPropagation()
    if (!confirm(`¿Eliminar "${tournament.name}"?`)) return
    
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournament.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (res.ok) {
      setTournaments(tournaments.filter(t => t.id !== tournament.id))
      setStats({ ...stats, tournaments: stats.tournaments - 1 })
    } else {
      const err = await res.json()
      alert(err.error || 'Error al eliminar')
    }
  }

  const handleCreateChampionship = async () => {
    if (!championshipName.trim() || !selectedSport) {
      alert('Por favor completa todos los campos')
      return
    }
    
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      console.log('Sending:', { name: championshipName, sportType: selectedSport, format: championshipFormat })
      
      const res = await fetch('/api/tournaments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: championshipName,
          sportType: selectedSport,
          format: championshipFormat,
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Mis Campeonatos</h1>
      </div>

      {tournaments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No hay Campeonatos</h2>
          <p className="text-gray-500 mb-8">Crea tu primer campeonato para comenzar</p>
          <button 
            onClick={() => setShowTypeModal(true)}
            className="bg-blue-600 text-white px-8 py-4 rounded-xl font-medium hover:bg-blue-700 text-lg"
          >
            + Nuevo Campeonato
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tournament) => (
            <div 
              key={tournament.id} 
              className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition cursor-pointer"
              onClick={() => router.push(`/dashboard/tournaments/${tournament.id}`)}
            >
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4">
                <div className="flex justify-between items-start">
                  <span className="text-4xl">⚽</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tournament.status)}`}>
                    {getStatusLabel(tournament.status)}
                  </span>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-2">{tournament.name}</h3>
                <div className="text-sm text-gray-500">
                  <p>📅 {new Date(tournament.startDate).toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={(e) => handleDeleteTournament(e, tournament)}
                  className="mt-3 text-red-600 hover:text-red-800 text-sm"
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
          
          <button 
            onClick={() => setShowTypeModal(true)}
            className="border-2 border-dashed border-gray-300 rounded-xl p-6 flex flex-col items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 transition"
          >
            <span className="text-4xl mb-2">+</span>
            <span className="font-medium">Agregar Campeonato</span>
          </button>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fases del Campeonato</label>
                <div className="space-y-2">
                  <label className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50">
                    <input
                      type="radio"
                      name="format"
                      value="todos_contra_todos"
                      checked={championshipFormat === 'todos_contra_todos'}
                      onChange={(e) => setChampionshipFormat(e.target.value)}
                      className="mr-3"
                    />
                    <span>Todos contra todos</span>
                  </label>
                  <label className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50">
                    <input
                      type="radio"
                      name="format"
                      value="liga_eliminacion"
                      checked={championshipFormat === 'liga_eliminacion'}
                      onChange={(e) => setChampionshipFormat(e.target.value)}
                      className="mr-3"
                    />
                    <span>Todos contra todos + Eliminatoria</span>
                  </label>
                  <label className="flex items-center p-3 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-50">
                    <input
                      type="radio"
                      name="format"
                      value="eliminacion"
                      checked={championshipFormat === 'eliminacion'}
                      onChange={(e) => setChampionshipFormat(e.target.value)}
                      className="mr-3"
                    />
                    <span>Eliminatoria</span>
                  </label>
                </div>
              </div>

              <p className="text-sm text-gray-500 italic">
                * Se pueden crear o eliminar fases más tarde
              </p>
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
    </div>
  )
}