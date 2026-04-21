'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Tournament {
  id: string
  name: string
  description: string | null
  sportType: string
  status: string
  organizer: { name: string }
}

interface Message {
  id: string
  content: string
  sender: { name: string }
  createdAt: string
}

interface Match {
  id: string
  roundName: string
  matchDate: string
  homeTeam: { id: string; name: string }
  awayTeam: { id: string; name: string }
  homeScore: number | null
  awayScore: number | null
  status: string
}

interface TournamentTeam {
  id: string
  team: { id: string; name: string }
}

type MenuType = 'inicio' | 'clasificacion'

export default function TournamentPage() {
  const params = useParams()
  const router = useRouter()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([])
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [activeMenu, setActiveMenu] = useState<MenuType>('inicio')
  const [showAddTeam, setShowAddTeam] = useState(false)
  const [showAddMatch, setShowAddMatch] = useState(false)
  const [selectedRound, setSelectedRound] = useState('1')
  const [roundDate, setRoundDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [showGenType, setShowGenType] = useState(false)
  const [matchType, setMatchType] = useState<'ida' | 'idayvuelta'>('ida')
  const [editingScore, setEditingScore] = useState<{matchId: string, home: number, away: number} | null>(null)

  const tournamentId = params.id as string

  useEffect(() => {
    fetchData()
  }, [tournamentId, activeMenu])

  const fetchData = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('No token')
      setLoading(false)
      return
    }
    
    try {
      if (activeMenu === 'inicio') {
        console.log('Fetching inicio...')
        const [tRes, mRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/tournaments/${tournamentId}/messages`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        console.log('tRes status:', tRes.status)
        const tData = await tRes.json()
        console.log('tData:', tData)
        setTournament(tData)
        if (mRes.ok) setMessages(await mRes.json())
      } else if (activeMenu === 'clasificacion') {
        console.log('Fetching clasificacion...', tournamentId)
        const [matchesRes, teamsRes, allTeamsRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}/matches`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/tournaments/${tournamentId}/teams`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        console.log('matchesRes:', matchesRes.status, 'teamsRes:', teamsRes.status, 'allTeamsRes:', allTeamsRes.status)
        
        if (matchesRes.ok) {
          const m = await matchesRes.json()
          console.log('matches:', m.length)
          setMatches(m)
        }
        if (teamsRes.ok) {
          const t = await teamsRes.json()
          console.log('tournamentTeams:', t.length)
          setTournamentTeams(t)
        }
        const at = await allTeamsRes.json()
        console.log('allTeams:', at.length)
        setAllTeams(Array.isArray(at) ? at : [])
      }
    } catch (error) {
      console.error('Error fetching:', error)
    }
    setLoading(false)
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newMessage }),
    })

    if (res.ok) {
      setNewMessage('')
      fetchData()
    }
  }

  const handleAddTeam = async (teamId: string) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ teamId }),
    })

    if (res.ok) {
      setShowAddTeam(false)
      fetchData()
    }
  }

  const addAllTeams = async () => {
    const token = localStorage.getItem('token')
    const teamsToAdd = allTeams.filter(t => !tournamentTeams.some(tt => tt.team.id === t.id))
    
    for (const team of teamsToAdd) {
      await fetch(`/api/tournaments/${tournamentId}/teams`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: team.id }),
      })
    }
    fetchData()
  }

  const handleGenerateMatches = async () => {
    setShowGenType(false)
    if (tournamentTeams.length < 2) {
      alert('Necesitas al menos 2 equipos')
      return
    }
    setGenerating(true)
    const token = localStorage.getItem('token')
    const date = roundDate || new Date().toISOString()
    
    console.log('Generating with teams:', tournamentTeams.length, 'type:', matchType)
    
    const res = await fetch(`/api/tournaments/${tournamentId}/matches?action=generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundName: '1', roundDate: date, matchType }),
    })

    const data = await res.json()
    console.log('Generate response:', res.status, data)
    
    if (res.ok) {
      setShowAddMatch(false)
      fetchData()
    } else {
      alert(data.error || 'Error al generar')
    }
    setGenerating(false)
  }

  const getStandings = () => {
    const teamStats: Record<string, { name: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }> = {}
    
    tournamentTeams.forEach(tt => {
      teamStats[tt.team.id] = { name: tt.team.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }
    })
    
    matches.forEach(m => {
      if (!teamStats[m.homeTeam.id]) teamStats[m.homeTeam.id] = { name: m.homeTeam.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }
      if (!teamStats[m.awayTeam.id]) teamStats[m.awayTeam.id] = { name: m.awayTeam.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 }
      
      if (m.homeScore !== null && m.awayScore !== null) {
        teamStats[m.homeTeam.id].played++
        teamStats[m.awayTeam.id].played++
        teamStats[m.homeTeam.id].gf += m.homeScore
        teamStats[m.homeTeam.id].ga += m.awayScore
        teamStats[m.awayTeam.id].gf += m.awayScore
        teamStats[m.awayTeam.id].ga += m.homeScore
        
        if (m.homeScore > m.awayScore) {
          teamStats[m.homeTeam.id].won++
          teamStats[m.awayTeam.id].lost++
          teamStats[m.homeTeam.id].points += 3
        } else if (m.homeScore < m.awayScore) {
          teamStats[m.awayTeam.id].won++
          teamStats[m.homeTeam.id].lost++
          teamStats[m.awayTeam.id].points += 3
        } else {
          teamStats[m.homeTeam.id].drawn++
          teamStats[m.awayTeam.id].drawn++
          teamStats[m.homeTeam.id].points++
          teamStats[m.awayTeam.id].points++
        }
      }
    })

    return Object.values(teamStats).sort((a, b) => b.points - a.points || b.gf - b.ga)
  }

  const shareUrl = `https://copafacil.com/${tournamentId}`
  const sportIcon = getSportIcon(tournament?.sportType || '')

  const allRounds = [...new Set(matches.map(m => m.roundName))].sort((a, b) => {
  const na = parseInt(a) || 0
  const nb = parseInt(b) || 0
  return na - nb
})
const rounds = allRounds.length > 0 ? allRounds.map(r => `${r}º Fase`) : ['1º Fase']

  if (loading) return <div className="p-8">Cargando...</div>
  if (!tournament) return <div className="p-8">Torneo no encontrado. <button onClick={fetchData}>Recargar</button></div>

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Left Sidebar */}
      <div className="w-48 bg-white shadow-lg flex-shrink-0">
        <div className="p-4">
          <button onClick={() => router.push('/dashboard')} className="text-gray-500 text-sm mb-4">
            ← Volver
          </button>
          <button onClick={fetchData} className="text-blue-500 text-xs ml-2">
            🔄
          </button>
          <h2 className="font-bold text-lg mb-4 truncate">{tournament?.name || 'Torneo'}</h2>
          <nav className="space-y-1">
            <button
              onClick={() => setActiveMenu('inicio')}
              className={`w-full text-left px-3 py-2 rounded-lg ${activeMenu === 'inicio' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              🏠 Inicio
            </button>
            <button
              onClick={() => setActiveMenu('clasificacion')}
              className={`w-full text-left px-3 py-2 rounded-lg ${activeMenu === 'clasificacion' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              📊 Clasificación
            </button>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        {activeMenu === 'inicio' && (
          <div className="max-w-2xl">
            {/* Banner */}
            <div className="relative h-32 bg-gradient-to-b from-green-600 to-green-800 rounded-t-xl">
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-7xl opacity-30">{sportIcon}</span>
              </div>
            </div>
            
            <div className="bg-white rounded-b-xl shadow-lg p-6">
              <h1 className="text-2xl font-bold mb-2">{tournament.name}</h1>
              <p className="text-gray-600 mb-4">Organizado por <span className="font-semibold">{tournament?.organizer?.name || 'Organizador'}</span></p>
              
              <button onClick={() => setShowQR(!showQR)} className="flex items-center gap-2 text-blue-600 mb-4">
                <span>📤</span> <span className="font-medium">Compartir</span>
              </button>

              {showQR && (
                <div className="p-4 bg-gray-50 rounded-xl mb-4">
                  <input type="text" readOnly value={shareUrl} className="w-full px-3 py-2 border rounded-lg text-sm" onClick={(e) => (e.target as HTMLInputElement).select()} />
                  <p className="text-xs text-gray-400 mt-1">{tournamentId}</p>
                </div>
              )}

              <h2 className="text-xl font-bold mb-4">💬 Mensajes</h2>
              <form onSubmit={handleSendMessage} className="mb-4">
                <div className="flex gap-2">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Escribe un mensaje..." className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none" />
                  <button type="submit" disabled={!newMessage.trim()} className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50">Enviar</button>
                </div>
              </form>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {messages.length > 0 ? messages.map((msg) => (
                  <div key={msg.id} className="p-3 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{msg.sender.name}</span>
                      <span className="text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-600">{msg.content}</p>
                  </div>
                )) : <p className="text-center text-gray-400 py-4">No hay mensajes aún</p>}
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'clasificacion' && (
          <div className="flex gap-6">
            {/* Tabla de Clasificación - Izquierda */}
            <div className="flex-1 bg-white rounded-xl shadow-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <div className="mb-2">
                <select className="px-3 py-2 border rounded-lg font-medium">
                  <option>1º Fase</option>
                  <option>Estadísticas</option>
                </select>
              </div>
              <h2 className="text-xl font-bold mb-4">📊 CLASIFICACIÓN</h2>
                <div className="flex gap-2">
                  {allTeams.length > tournamentTeams.length && (
                    <button onClick={() => addAllTeams()} className="text-green-600 text-sm">+ AgregarTodos</button>
                  )}
                  <button onClick={() => setShowAddTeam(true)} className="text-blue-600 text-sm">+ Agregar</button>
                </div>
              </div>

              {tournamentTeams.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">No hay equipos</p>
                  <button onClick={() => setShowAddTeam(true)} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Agregar Equipo</button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="px-2 py-2 text-center">#</th>
                        <th className="px-2 py-2 text-left">Equipo</th>
                        <th className="px-2 py-2 text-center">Pts</th>
                        <th className="px-2 py-2 text-center">J</th>
                        <th className="px-2 py-2 text-center">G</th>
                        <th className="px-2 py-2 text-center">E</th>
                        <th className="px-2 py-2 text-center">P</th>
                        <th className="px-2 py-2 text-center">GF</th>
                        <th className="px-2 py-2 text-center">GC</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getStandings().map((team, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="px-2 py-2 text-center font-medium">{idx + 1}</td>
                          <td className="px-2 py-2 font-medium">{team.name}</td>
                          <td className="px-2 py-2 text-center font-bold">{team.points}</td>
                          <td className="px-2 py-2 text-center">{team.played}</td>
                          <td className="px-2 py-2 text-center">{team.won}</td>
                          <td className="px-2 py-2 text-center">{team.drawn}</td>
                          <td className="px-2 py-2 text-center">{team.lost}</td>
                          <td className="px-2 py-2 text-center">{team.gf}</td>
                          <td className="px-2 py-2 text-center">{team.ga}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Panel de Juegos - Derecha */}
            <div className="w-96 bg-white rounded-xl shadow-lg p-4">
              <h2 className="text-lg font-bold mb-3">⚽ Juegos</h2>
              
              <div className="flex gap-2 mb-3">
                <select className="flex-1 px-3 py-2 border rounded-lg">
                  <option>1º Fase</option>
                </select>
                <select 
                  value={selectedRound}
                  onChange={(e) => setSelectedRound(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg"
                >
                  <option value="">Seleccionar Fecha</option>
                  {matches.length > 0 && [...new Set(matches.map(m => m.roundName))].sort((a,b) => {
                    const na = parseInt(a) || 0
                    const nb = parseInt(b) || 0
                    return na - nb
                  }).map(r => (
                    <option key={r} value={r}>{parseInt(r) || 1}º Fecha</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                {tournamentTeams.length >= 2 ? (
                  <>
                    <button 
                      onClick={() => setShowGenType(true)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm"
                    >
                      ⚡ Generar Partidos
                    </button>
                    <button className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm">
                      + Agregar Fecha
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-orange-600">Agrega al menos 2 equipos</p>
                )}
              </div>

              {/* Partidos de la fecha seleccionada */}
              <div className="space-y-2 mt-4">
                <h3 className="font-medium text-sm text-gray-600">{selectedRound}</h3>
                {matches.filter(m => m.roundName === selectedRound).map(m => (
                  <div key={m.id} className="p-2 bg-gray-50 rounded-lg flex items-center justify-between text-sm">
                    <span className="flex-1 text-right truncate">{m.homeTeam.name}</span>
                    <span className="px-2 font-bold">
                      {m.homeScore !== null ? `${m.homeScore} - ${m.awayScore}` : 'vs'}
                    </span>
                    <span className="flex-1 text-left truncate">{m.awayTeam.name}</span>
                  </div>
                ))}
                {matches.filter(m => m.roundName === selectedRound).length === 0 && (
                  <p className="text-center text-gray-400 text-sm py-4">No hay partidos</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Team Modal */}
      {showAddTeam && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddTeam(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Agregar Equipo</h3>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {allTeams.filter(t => !tournamentTeams.some(tt => tt.team.id === t.id)).map(team => (
                <button key={team.id} onClick={() => handleAddTeam(team.id)} className="w-full text-left p-3 border rounded-lg hover:bg-blue-50">
                  {team.name}
                </button>
              ))}
              {allTeams.filter(t => !tournamentTeams.some(tt => tt.team.id === t.id)).length === 0 && (
                <p className="text-center text-gray-400">Todos los equipos ya están agregados</p>
              )}
            </div>
            <button onClick={() => setShowAddTeam(false)} className="mt-4 w-full py-2 border rounded-lg">Cerrar</button>
          </div>
        </div>
      )}

      {/* Generate Matches Modal */}
      {showAddMatch && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddMatch(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Generar Partidos</h3>
            <p className="text-sm text-gray-600 mb-4">Se generarán todos los partidos (todos contra todos)</p>
            <button 
              onClick={handleGenerateMatches} 
              disabled={generating || tournamentTeams.length < 2}
              className="w-full py-3 bg-green-600 text-white rounded-lg disabled:opacity-50"
            >
              {generating ? 'Generando...' : '⚡ Generar Partidos'}
            </button>
            <button onClick={() => setShowAddMatch(false)} className="mt-3 w-full py-2 border rounded-lg">Cancelar</button>
          </div>
        </div>
      )}

      {/* Generate Match Type Modal */}
      {showGenType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowGenType(false)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold mb-4">Tipo de Fixture</h3>
            <p className="text-sm text-gray-600 mb-4">Selecciona el tipo de partidos</p>
            
            <div className="space-y-3 mb-4">
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="matchType" value="ida" checked={matchType === 'ida'} onChange={() => setMatchType('ida')} className="mr-3" />
                <div>
                  <div className="font-medium">Solo Ida</div>
                  <div className="text-xs text-gray-500">Cada equipo juega una vez contra otro</div>
                </div>
              </label>
              <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <input type="radio" name="matchType" value="idayvuelta" checked={matchType === 'idayvuelta'} onChange={() => setMatchType('idayvuelta')} className="mr-3" />
                <div>
                  <div className="font-medium">Ida y Vuelta</div>
                  <div className="text-xs text-gray-500">Partido de local y visita</div>
                </div>
              </label>
            </div>

            <button 
              onClick={handleGenerateMatches}
              disabled={generating}
              className="w-full py-3 bg-green-600 text-white rounded-lg disabled:opacity-50"
            >
              {generating ? 'Generando...' : '⚡ Generar Partidos'}
            </button>
            <button onClick={() => setShowGenType(false)} className="mt-3 w-full py-2 border rounded-lg">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

function getSportIcon(sportType: string): string {
  const icons: Record<string, string> = {
    FUTBOL_11: '⚽', FUTSAL: '⚽', FUTBOL_7: '⚽', FUTBOL_SALA: '⚽',
    BALONMANO: '🤾', BALONCESTO: '🏀', VOLEY: '🏐', VOLEY_PLAYA: '🏐',
    TENIS_MESA: '🏓', TENIS: '🎾', BEACH_TENNIS: '🏖️', AJEDREZ: '♟️',
    ATLETISMO: '🏃', DEPORTE_GENERICO: '🏅', DISPAROS: '🔫',
    BATTLE_ROYALE: '🎮', MOBA_LOL: '🛡️', MOBA_DOTA: '🛡️',
  }
  return icons[sportType] || '🏆'
}