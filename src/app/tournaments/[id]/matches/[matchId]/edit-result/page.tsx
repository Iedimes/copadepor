'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface Match {
  id: string
  roundName: string
  matchDate: string
  homeTeam: { id: string; name: string; players?: Player[] }
  awayTeam: { id: string; name: string; players?: Player[] }
  homeScore: number | null
  awayScore: number | null
  status: string
}

interface Player {
  id: string
  name: string
  number?: number
}

type MatchStatus = 'NO_REALIZADO' | 'EN_VIVO' | 'FINALIZADO'

interface BaseEvent {
  id: string
  playerId: string
  assistId: string
  type: string
  defineTime: boolean
  timeType: '1°' | '2°' | '3°' | '4°' | 'PRORROGA'
  minutes: number
  seconds: number
  detail: string
  x?: number
  y?: number
}

function EventSection({
  title,
  events,
  setEvents,
  players,
  defaultType,
  showAssist = false,
  assistLabel = "Asistencia",
  showType = false,
  typeOptions = [],
  showDetail = false,
  detailLabel = "Descripción",
  playerLabel = "Jugador"
}: {
  title: string
  events: BaseEvent[]
  setEvents: React.Dispatch<React.SetStateAction<BaseEvent[]>>
  players: Player[]
  defaultType: string
  showAssist?: boolean
  assistLabel?: string
  showType?: boolean
  typeOptions?: { value: string, label: string }[]
  showDetail?: boolean
  detailLabel?: string
  playerLabel?: string
}) {
  const addEvent = () => {
    setEvents(prev => [...prev, {
      id: Date.now().toString(),
      playerId: '',
      assistId: '',
      type: defaultType,
      defineTime: false,
      timeType: '1°',
      minutes: 0,
      seconds: 0,
      detail: ''
    }])
  }

  const removeEvent = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  const updateEvent = (id: string, field: keyof BaseEvent, value: any) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e))
  }

  return (
    <div className="mb-6 bg-gray-50 p-4 rounded-xl border">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-gray-700">{title}</h3>
        <button onClick={addEvent} className="text-sm font-medium text-blue-600 hover:text-blue-800 bg-blue-50 px-3 py-1 rounded-lg">+ Añadir</button>
      </div>
      {events.map((evt, index) => (
        <div key={evt.id} className="border bg-white p-4 rounded-lg mb-3 shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-gray-500">#{index + 1}</span>
            <button onClick={() => removeEvent(evt.id)} className="text-red-500 hover:text-red-700 text-sm font-medium">Eliminar</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{playerLabel}</label>
              <select
                value={evt.playerId}
                onChange={(e) => updateEvent(evt.id, 'playerId', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white"
              >
                <option value="">Seleccionar...</option>
                {players.map(player => (
                  <option key={player.id} value={player.id}>{player.number ? `${player.number}. ` : ''}{player.name}</option>
                ))}
              </select>
            </div>
            {showAssist && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{assistLabel}</label>
                <select
                  value={evt.assistId}
                  onChange={(e) => updateEvent(evt.id, 'assistId', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white"
                >
                  <option value="">Seleccionar...</option>
                  {players.map(player => (
                    <option key={player.id} value={player.id}>{player.number ? `${player.number}. ` : ''}{player.name}</option>
                  ))}
                </select>
              </div>
            )}
            {showType && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={evt.type}
                  onChange={(e) => updateEvent(evt.id, 'type', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white"
                >
                  {typeOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
            {showDetail && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">{detailLabel}</label>
                <input
                  type="text"
                  value={evt.detail}
                  onChange={(e) => updateEvent(evt.id, 'detail', e.target.value)}
                  placeholder="Escribe una descripción..."
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 focus:bg-white"
                />
              </div>
            )}
          </div>
          <div className="pt-2 border-t mt-2">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={evt.defineTime}
                onChange={(e) => updateEvent(evt.id, 'defineTime', e.target.checked)}
                id={`time-${evt.id}`}
                className="rounded text-blue-600"
              />
              <label htmlFor={`time-${evt.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">Definir momento exacto</label>
            </div>
            {evt.defineTime && (
              <div className="grid grid-cols-3 gap-3 bg-blue-50 p-3 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tiempo</label>
                  <select
                    value={evt.timeType}
                    onChange={(e) => updateEvent(evt.id, 'timeType', e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm bg-white"
                  >
                    <option value="1°">1° Tiempo</option>
                    <option value="2°">2° Tiempo</option>
                    <option value="3°">3° Tiempo</option>
                    <option value="4°">4° Tiempo</option>
                    <option value="PRORROGA">Prórroga</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Minutos</label>
                  <input
                    type="number"
                    value={evt.minutes}
                    onChange={(e) => updateEvent(evt.id, 'minutes', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 border rounded text-sm bg-white"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Segundos</label>
                  <input
                    type="number"
                    value={evt.seconds}
                    onChange={(e) => updateEvent(evt.id, 'seconds', parseInt(e.target.value) || 0)}
                    className="w-full px-2 py-1 border rounded text-sm bg-white"
                    min="0"
                    max="59"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
      {events.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No hay registros</p>}
    </div>
  )
}

function PitchLineup({ lineup, setLineup, players }: { lineup: BaseEvent[], setLineup: React.Dispatch<React.SetStateAction<BaseEvent[]>>, players: Player[] }) {
  const handlePitchClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('.player-node')) return; // Ignore clicks on existing players

    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setLineup(prev => [...prev, {
      id: Date.now().toString(),
      playerId: '',
      assistId: '',
      type: 'LINEUP',
      defineTime: false,
      timeType: '1°',
      minutes: 0,
      seconds: 0,
      detail: '',
      x,
      y
    }])
  }

  const updatePlayer = (id: string, playerId: string) => {
    setLineup(prev => prev.map(p => p.id === id ? { ...p, playerId } : p))
  }

  const removePlayer = (id: string) => {
    setLineup(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="mb-6 bg-gray-50 p-4 rounded-xl border">
      <h3 className="font-bold text-gray-700 mb-3">Alineación en Cancha</h3>
      <p className="text-xs text-gray-500 mb-2">Haz clic en la cancha para ubicar a un jugador.</p>

      <div
        className="relative w-full aspect-[4/3] bg-green-600 rounded-lg overflow-hidden border-4 border-green-700 cursor-crosshair shadow-inner"
        onClick={handlePitchClick}
        style={{
          backgroundImage: 'radial-gradient(circle at center, transparent 20%, rgba(255,255,255,0.2) 20%, rgba(255,255,255,0.2) 21%, transparent 21%), linear-gradient(to right, transparent 49.5%, rgba(255,255,255,0.4) 49.5%, rgba(255,255,255,0.4) 50.5%, transparent 50.5%)'
        }}
      >
        {/* Center circle and lines */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-16 h-32 -translate-y-1/2 border-2 border-white/40 border-l-0"></div>
          <div className="absolute top-1/2 right-0 w-16 h-32 -translate-y-1/2 border-2 border-white/40 border-r-0"></div>
        </div>

        {lineup.map(player => (
          <div
            key={player.id}
            className="player-node absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1 z-10"
            style={{ left: `${player.x}%`, top: `${player.y}%` }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); removePlayer(player.id) }}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-4 h-4 text-[10px] flex items-center justify-center hover:bg-red-600 z-20"
            >
              ✕
            </button>
            <div className="w-8 h-8 rounded-full bg-white border-2 border-blue-600 shadow-md flex items-center justify-center text-xs font-bold">
              {players.find(p => p.id === player.playerId)?.number || '?'}
            </div>
            <select
              value={player.playerId}
              onChange={(e) => updatePlayer(player.id, e.target.value)}
              className="w-24 text-[10px] py-0.5 px-1 rounded shadow-sm border border-gray-300"
              onClick={e => e.stopPropagation()}
            >
              <option value="">Jugador...</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  )
}

function BasketballPointsSection({
  title,
  goals,
  setGoals,
  players,
  onAddClick,
  onEditClick
}: {
  title: string
  goals: BaseEvent[]
  setGoals: React.Dispatch<React.SetStateAction<BaseEvent[]>>
  players: Player[]
  onAddClick: () => void
  onEditClick: (player: Player, p1: number, p2: number, p3: number) => void
}) {
  const scorerIds = Array.from(new Set(goals.filter(g => g.playerId).map(g => g.playerId)))

  const playerStats = scorerIds.map(id => {
    const player = players.find(p => p.id === id)
    const playerEvts = goals.filter(g => g.playerId === id)
    const p1 = playerEvts.filter(g => g.detail === '1').length
    const p2 = playerEvts.filter(g => g.detail === '2' || g.detail === '').length
    const p3 = playerEvts.filter(g => g.detail === '3').length
    const total = p1 * 1 + p2 * 2 + p3 * 3
    return {
      player,
      playerId: id,
      p1,
      p2,
      p3,
      total
    }
  }).filter(s => s.player)

  const handleRemove = (playerId: string) => {
    setGoals(prev => prev.filter(g => g.playerId !== playerId))
  }

  return (
    <div className="mb-6 bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-slate-800 tracking-tight flex items-center gap-2">
          <span>🏀</span> {title}
        </h3>
        <button
          onClick={onAddClick}
          className="text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-4 py-2 rounded-xl transition-all"
        >
          + Añadir Puntos
        </button>
      </div>

      <div className="space-y-3">
        {playerStats.map(({ player, p1, p2, p3, total }) => (
          player && (
            <div key={player.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow transition-all">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs border border-blue-100">
                  {player.number || '#'}
                </div>
                <div>
                  <div className="font-black text-slate-800 text-sm">{player.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    T1: {p1} | T2: {p2} | T3: {p3}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-black text-blue-600">{total} pts</div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditClick(player, p1, p2, p3)}
                    className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all text-xs font-bold"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleRemove(player.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            </div>
          )
        ))}

        {playerStats.length === 0 && (
          <div className="text-center py-6 text-slate-400 font-bold italic text-xs">
            No hay puntos registrados aún
          </div>
        )}
      </div>
    </div>
  )
}

export default function EditResultPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string
  const matchId = params.matchId as string

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('NO_REALIZADO')

  // Events state mapping
  const [homeGoals, setHomeGoals] = useState<BaseEvent[]>([])
  const [awayGoals, setAwayGoals] = useState<BaseEvent[]>([])
  const [homeCards, setHomeCards] = useState<BaseEvent[]>([])
  const [awayCards, setAwayCards] = useState<BaseEvent[]>([])
  const [homeFouls, setHomeFouls] = useState<BaseEvent[]>([])
  const [awayFouls, setAwayFouls] = useState<BaseEvent[]>([])
  const [homeSubs, setHomeSubs] = useState<BaseEvent[]>([])
  const [awaySubs, setAwaySubs] = useState<BaseEvent[]>([])
  const [homeOwnGoals, setHomeOwnGoals] = useState<BaseEvent[]>([])
  const [awayOwnGoals, setAwayOwnGoals] = useState<BaseEvent[]>([])
  const [homeGks, setHomeGks] = useState<BaseEvent[]>([])
  const [awayGks, setAwayGks] = useState<BaseEvent[]>([])
  const [homeHighlights, setHomeHighlights] = useState<BaseEvent[]>([])
  const [awayHighlights, setAwayHighlights] = useState<BaseEvent[]>([])
  const [homeLineup, setHomeLineup] = useState<BaseEvent[]>([])
  const [awayLineup, setAwayLineup] = useState<BaseEvent[]>([])

  const sportType = (match as any)?.category?.sportType || (match as any)?.tournament?.sportType || ''
  const isBasketball = sportType === 'BALONCESTO' || sportType === 'BASQUET'

  const getBasketballScore = (goals: BaseEvent[]) => {
    return goals.reduce((acc, g) => acc + (parseInt(g.detail) || 2), 0)
  }

  // Basketball stats states
  const [showBasketballPlayerSelect, setShowBasketballPlayerSelect] = useState<{ teamType: 'home' | 'away' } | null>(null)
  const [basketballEditingPlayer, setBasketballEditingPlayer] = useState<{
    teamType: 'home' | 'away'
    player: Player
    p1: number
    p2: number
    p3: number
  } | null>(null)

  useEffect(() => {
    fetchMatch()
  }, [matchId])

  const parseEvents = (events: any[], teamId: string, typeFilter: string | string[]) => {
    const isArrayFilter = Array.isArray(typeFilter);
    return events
      .filter((e: any) => e.teamId === teamId && (isArrayFilter ? typeFilter.includes(e.type) : e.type === typeFilter))
      .map((e: any) => ({
        id: e.id,
        playerId: e.playerId || '',
        assistId: e.assistId || '',
        type: e.type,
        defineTime: !!e.timeType,
        timeType: e.timeType || '1°',
        minutes: e.minute || 0,
        seconds: e.second || 0,
        detail: e.detail || '',
        x: e.detail && e.type === 'LINEUP' ? JSON.parse(e.detail).x : undefined,
        y: e.detail && e.type === 'LINEUP' ? JSON.parse(e.detail).y : undefined,
      }))
  }

  const fetchMatch = async () => {
    setLoading(true)
    setError('')
    const token = localStorage.getItem('token')
    if (!token) {
      setError('No token found')
      setLoading(false)
      return
    }

    try {
      const matchRes = await fetch(`/api/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!matchRes.ok) throw new Error('Failed to fetch match')
      const matchData = await matchRes.json()
      setMatch(matchData)
      setMatchStatus(matchData.status || 'NO_REALIZADO')

      if (matchData.events) {
        setHomeGoals(parseEvents(matchData.events, matchData.homeTeam.id, 'GOAL'))
        setAwayGoals(parseEvents(matchData.events, matchData.awayTeam.id, 'GOAL'))
        setHomeCards(parseEvents(matchData.events, matchData.homeTeam.id, ['YELLOW_CARD', 'RED_CARD', 'DOUBLE_YELLOW_CARD']))
        setAwayCards(parseEvents(matchData.events, matchData.awayTeam.id, ['YELLOW_CARD', 'RED_CARD', 'DOUBLE_YELLOW_CARD']))
        setHomeFouls(parseEvents(matchData.events, matchData.homeTeam.id, 'FOUL'))
        setAwayFouls(parseEvents(matchData.events, matchData.awayTeam.id, 'FOUL'))
        setHomeSubs(parseEvents(matchData.events, matchData.homeTeam.id, 'SUBSTITUTION'))
        setAwaySubs(parseEvents(matchData.events, matchData.awayTeam.id, 'SUBSTITUTION'))
        setHomeOwnGoals(parseEvents(matchData.events, matchData.homeTeam.id, 'OWN_GOAL'))
        setAwayOwnGoals(parseEvents(matchData.events, matchData.awayTeam.id, 'OWN_GOAL'))
        setHomeGks(parseEvents(matchData.events, matchData.homeTeam.id, 'GOALKEEPER'))
        setAwayGks(parseEvents(matchData.events, matchData.awayTeam.id, 'GOALKEEPER'))
        setHomeHighlights(parseEvents(matchData.events, matchData.homeTeam.id, 'HIGHLIGHT'))
        setAwayHighlights(parseEvents(matchData.events, matchData.awayTeam.id, 'HIGHLIGHT'))
        setHomeLineup(parseEvents(matchData.events, matchData.homeTeam.id, 'LINEUP'))
        setAwayLineup(parseEvents(matchData.events, matchData.awayTeam.id, 'LINEUP'))
      }

      const homePlayersRes = await fetch(`/api/teams/${matchData.homeTeam.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (homePlayersRes.ok) {
        const homePlayers = await homePlayersRes.json()
        setMatch(prev => prev ? { ...prev, homeTeam: { ...prev.homeTeam, players: homePlayers } } : null)
      }

      const awayPlayersRes = await fetch(`/api/teams/${matchData.awayTeam.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (awayPlayersRes.ok) {
        const awayPlayers = await awayPlayersRes.json()
        setMatch(prev => prev ? { ...prev, awayTeam: { ...prev.awayTeam, players: awayPlayers } } : null)
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching data')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      const serializeEvents = (events: BaseEvent[], teamId: string) => {
        return events.map(e => ({
          ...e,
          teamId,
          detail: e.type === 'LINEUP' ? JSON.stringify({ x: e.x, y: e.y }) : e.detail
        }))
      }

      const allEvents = [
        ...serializeEvents(homeGoals, match?.homeTeam.id || ''),
        ...serializeEvents(awayGoals, match?.awayTeam.id || ''),
        ...serializeEvents(homeCards, match?.homeTeam.id || ''),
        ...serializeEvents(awayCards, match?.awayTeam.id || ''),
        ...serializeEvents(homeFouls, match?.homeTeam.id || ''),
        ...serializeEvents(awayFouls, match?.awayTeam.id || ''),
        ...serializeEvents(homeSubs, match?.homeTeam.id || ''),
        ...serializeEvents(awaySubs, match?.awayTeam.id || ''),
        ...serializeEvents(homeOwnGoals, match?.homeTeam.id || ''),
        ...serializeEvents(awayOwnGoals, match?.awayTeam.id || ''),
        ...serializeEvents(homeGks, match?.homeTeam.id || ''),
        ...serializeEvents(awayGks, match?.awayTeam.id || ''),
        ...serializeEvents(homeHighlights, match?.homeTeam.id || ''),
        ...serializeEvents(awayHighlights, match?.awayTeam.id || ''),
        ...serializeEvents(homeLineup, match?.homeTeam.id || ''),
        ...serializeEvents(awayLineup, match?.awayTeam.id || ''),
      ]

      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: matchStatus,
          homeScore: isBasketball ? getBasketballScore(homeGoals) : homeGoals.length,
          awayScore: isBasketball ? getBasketballScore(awayGoals) : awayGoals.length,
          events: allEvents
        })
      })

      if (!res.ok) throw new Error('Failed to save match')

      router.back()
    } catch (err) {
      console.error(err)
      alert('Error al guardar el resultado')
    }
  }

  if (loading) return <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8"><div className="text-xl font-bold text-gray-500 animate-pulse">Cargando partido...</div></div>
  if (error) return <div className="p-8 text-red-500 font-medium">{error}</div>
  if (!match) return <div className="p-8 text-gray-500">Partido no encontrado</div>

  const statusOptions: MatchStatus[] = ['NO_REALIZADO', 'EN_VIVO', 'FINALIZADO']

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-6 pb-24">
      <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">

        {/* Header Section */}
        <div className="bg-slate-800 p-6 text-white flex flex-col md:flex-row justify-between items-center gap-4 border-b border-slate-700">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-slate-300 hover:text-white transition bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-medium">
              ← Volver
            </button>
            <h1 className="text-xl font-bold">Registro del Partido</h1>
          </div>
          <div className="flex items-center gap-3 bg-slate-700 px-4 py-2 rounded-lg">
            <label className="text-sm font-medium text-slate-300 whitespace-nowrap">Estado:</label>
            <select
              value={matchStatus}
              onChange={(e) => setMatchStatus(e.target.value as MatchStatus)}
              className="bg-slate-600 text-white border-none rounded focus:ring-2 focus:ring-blue-500 text-sm font-semibold py-1 px-2"
            >
              {statusOptions.map(option => (
                <option key={option} value={option}>
                  {option === 'NO_REALIZADO' ? 'No realizado' : option === 'EN_VIVO' ? 'En Vivo' : 'Finalizado'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">

            {/* Home Team */}
            <div className="pt-6 lg:pt-0 lg:pr-4">
              <div className="flex items-center justify-center gap-4 mb-8 bg-blue-50 py-4 rounded-xl border border-blue-100">
                <h2 className="text-2xl font-black text-blue-900">{match.homeTeam.name}</h2>
                <div className="bg-blue-600 text-white text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-xl shadow-inner">
                  {isBasketball ? getBasketballScore(homeGoals) : homeGoals.length}
                </div>
              </div>

              <div className="space-y-2">
                {isBasketball ? (
                  <BasketballPointsSection
                    title="Puntos"
                    goals={homeGoals}
                    setGoals={setHomeGoals}
                    players={match.homeTeam.players || []}
                    onAddClick={() => setShowBasketballPlayerSelect({ teamType: 'home' })}
                    onEditClick={(player, p1, p2, p3) => setBasketballEditingPlayer({ teamType: 'home', player, p1, p2, p3 })}
                  />
                ) : (
                  <>
                    <PitchLineup lineup={homeLineup} setLineup={setHomeLineup} players={match.homeTeam.players || []} />
                    <EventSection title="Goles" events={homeGoals} setEvents={setHomeGoals} players={match.homeTeam.players || []} defaultType="GOAL" showAssist={true} playerLabel="Anotador" />
                  </>
                )}
                <EventSection title="Tarjetas" events={homeCards} setEvents={setHomeCards} players={match.homeTeam.players || []} defaultType="YELLOW_CARD" showType={true} typeOptions={[{ value: 'YELLOW_CARD', label: 'Amarilla' }, { value: 'DOUBLE_YELLOW_CARD', label: 'Doble Amarilla' }, { value: 'RED_CARD', label: 'Roja Directa' }]} />
                <EventSection title="Faltas" events={homeFouls} setEvents={setHomeFouls} players={match.homeTeam.players || []} defaultType="FOUL" showDetail={true} detailLabel="Motivo de falta" />
                <EventSection title="Sustituciones" events={homeSubs} setEvents={setHomeSubs} players={match.homeTeam.players || []} defaultType="SUBSTITUTION" showAssist={true} playerLabel="Entra" assistLabel="Sale" showDetail={true} detailLabel="Motivo" />
                <EventSection title="Goles en Contra" events={homeOwnGoals} setEvents={setHomeOwnGoals} players={match.homeTeam.players || []} defaultType="OWN_GOAL" showDetail={true} />
                <EventSection title="Portero (Atajadas/Intervenciones)" events={homeGks} setEvents={setHomeGks} players={match.homeTeam.players || []} defaultType="GOALKEEPER" showDetail={true} detailLabel="Descripción" />
                <EventSection title="Jugadas del Partido" events={homeHighlights} setEvents={setHomeHighlights} players={match.homeTeam.players || []} defaultType="HIGHLIGHT" showDetail={true} detailLabel="Descripción de jugada" />
              </div>
            </div>

            {/* Away Team */}
            <div className="pt-8 lg:pt-0 lg:pl-8">
              <div className="flex items-center justify-center gap-4 mb-8 bg-red-50 py-4 rounded-xl border border-red-100">
                <h2 className="text-2xl font-black text-red-900">{match.awayTeam.name}</h2>
                <div className="bg-red-600 text-white text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-xl shadow-inner">
                  {isBasketball ? getBasketballScore(awayGoals) : awayGoals.length}
                </div>
              </div>

              <div className="space-y-2">
                {isBasketball ? (
                  <BasketballPointsSection
                    title="Puntos"
                    goals={awayGoals}
                    setGoals={setAwayGoals}
                    players={match.awayTeam.players || []}
                    onAddClick={() => setShowBasketballPlayerSelect({ teamType: 'away' })}
                    onEditClick={(player, p1, p2, p3) => setBasketballEditingPlayer({ teamType: 'away', player, p1, p2, p3 })}
                  />
                ) : (
                  <>
                    <PitchLineup lineup={awayLineup} setLineup={setAwayLineup} players={match.awayTeam.players || []} />
                    <EventSection title="Goles" events={awayGoals} setEvents={setAwayGoals} players={match.awayTeam.players || []} defaultType="GOAL" showAssist={true} playerLabel="Anotador" />
                  </>
                )}
                <EventSection title="Tarjetas" events={awayCards} setEvents={setAwayCards} players={match.awayTeam.players || []} defaultType="YELLOW_CARD" showType={true} typeOptions={[{ value: 'YELLOW_CARD', label: 'Amarilla' }, { value: 'DOUBLE_YELLOW_CARD', label: 'Doble Amarilla' }, { value: 'RED_CARD', label: 'Roja Directa' }]} />
                <EventSection title="Faltas" events={awayFouls} setEvents={setAwayFouls} players={match.awayTeam.players || []} defaultType="FOUL" showDetail={true} detailLabel="Motivo de falta" />
                <EventSection title="Sustituciones" events={awaySubs} setEvents={setAwaySubs} players={match.awayTeam.players || []} defaultType="SUBSTITUTION" showAssist={true} playerLabel="Entra" assistLabel="Sale" showDetail={true} detailLabel="Motivo" />
                <EventSection title="Goles en Contra" events={awayOwnGoals} setEvents={setAwayOwnGoals} players={match.awayTeam.players || []} defaultType="OWN_GOAL" showDetail={true} />
                <EventSection title="Portero (Atajadas/Intervenciones)" events={awayGks} setEvents={setAwayGks} players={match.awayTeam.players || []} defaultType="GOALKEEPER" showDetail={true} detailLabel="Descripción" />
                <EventSection title="Jugadas del Partido" events={awayHighlights} setEvents={setAwayHighlights} players={match.awayTeam.players || []} defaultType="HIGHLIGHT" showDetail={true} detailLabel="Descripción de jugada" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t shadow-[0_-10px_30px_rgba(0,0,0,0.05)] flex justify-center z-50">
        <button
          onClick={handleSave}
          className="w-full max-w-lg py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:shadow-blue-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Guardar Resultado Oficial
        </button>
      </div>

      {/* MODAL: SELECCIONAR JUGADOR BALONCESTO */}
      {showBasketballPlayerSelect && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={() => setShowBasketballPlayerSelect(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-black text-slate-800 uppercase tracking-wider text-xs flex items-center gap-2">
                <span>🏀</span> Seleccionar Anotador
              </h3>
              <button onClick={() => setShowBasketballPlayerSelect(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all font-black">✕</button>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-4 space-y-1">
              {((showBasketballPlayerSelect.teamType === 'home' ? match.homeTeam.players : match.awayTeam.players) || []).map(player => (
                <button
                  key={player.id}
                  onClick={() => {
                    const teamType = showBasketballPlayerSelect.teamType
                    const goals = teamType === 'home' ? homeGoals : awayGoals
                    const playerEvts = goals.filter(g => g.playerId === player.id)
                    const p1 = playerEvts.filter(g => g.detail === '1').length
                    const p2 = playerEvts.filter(g => g.detail === '2' || g.detail === '').length
                    const p3 = playerEvts.filter(g => g.detail === '3').length

                    setBasketballEditingPlayer({
                      teamType,
                      player,
                      p1,
                      p2,
                      p3
                    })
                    setShowBasketballPlayerSelect(null)
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 transition-all text-left group"
                >
                  <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                    {player.number || '#'}
                  </div>
                  <div className="font-bold text-slate-700 text-sm group-hover:text-slate-900 transition-all">{player.name}</div>
                </button>
              ))}
              {((showBasketballPlayerSelect.teamType === 'home' ? match.homeTeam.players : match.awayTeam.players) || []).length === 0 && (
                <div className="text-center py-12">
                  <div className="text-slate-300 text-3xl">👥</div>
                  <p className="text-slate-400 text-xs mt-2 italic font-bold">No hay jugadores registrados aún</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTAR TIROS BALONCESTO */}
      {basketballEditingPlayer && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[210] p-4" onClick={() => setBasketballEditingPlayer(null)}>
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ajustar Puntos</div>
                <h3 className="font-black text-slate-800 text-base mt-0.5">
                  {basketballEditingPlayer.player.number ? `#${basketballEditingPlayer.player.number} ` : ''}{basketballEditingPlayer.player.name}
                </h3>
              </div>
              <button onClick={() => setBasketballEditingPlayer(null)} className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all font-black">✕</button>
            </div>

            <div className="p-6 space-y-4">
              {/* Lanzamiento de 1 punto */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-black text-slate-800 text-sm">Lanzamiento de 1 punto</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Tiros libres</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBasketballEditingPlayer(prev => prev ? { ...prev, p1: Math.max(0, prev.p1 - 1) } : null)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-slate-800 text-lg">{basketballEditingPlayer.p1}</span>
                  <button
                    onClick={() => setBasketballEditingPlayer(prev => prev ? { ...prev, p1: prev.p1 + 1 } : null)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Lanzamiento de 2 puntos */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-black text-slate-800 text-sm">Lanzamiento de 2 puntos</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Tiros dobles de campo</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBasketballEditingPlayer(prev => prev ? { ...prev, p2: Math.max(0, prev.p2 - 1) } : null)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-slate-800 text-lg">{basketballEditingPlayer.p2}</span>
                  <button
                    onClick={() => setBasketballEditingPlayer(prev => prev ? { ...prev, p2: prev.p2 + 1 } : null)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Lanzamiento de 3 puntos */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <div className="font-black text-slate-800 text-sm">Lanzamiento de 3 puntos</div>
                  <div className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Tiros triples</div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setBasketballEditingPlayer(prev => prev ? { ...prev, p3: Math.max(0, prev.p3 - 1) } : null)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-black text-slate-800 text-lg">{basketballEditingPlayer.p3}</span>
                  <button
                    onClick={() => setBasketballEditingPlayer(prev => prev ? { ...prev, p3: prev.p3 + 1 } : null)}
                    className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold hover:bg-slate-100 hover:border-slate-300 active:scale-95 transition-all shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total */}
              <div className="pt-4 border-t flex justify-between items-center px-2">
                <span className="font-black text-slate-400 uppercase tracking-wider text-[10px]">Total Acumulado:</span>
                <span className="font-black text-blue-600 text-lg">
                  {basketballEditingPlayer.p1 * 1 + basketballEditingPlayer.p2 * 2 + basketballEditingPlayer.p3 * 3} pts
                </span>
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setBasketballEditingPlayer(null)}
                className="flex-1 py-3 text-slate-500 font-bold text-xs uppercase tracking-wider hover:bg-slate-100 rounded-xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  const { teamType, player, p1, p2, p3 } = basketballEditingPlayer
                  const setGoals = teamType === 'home' ? setHomeGoals : setAwayGoals

                  setGoals(prev => {
                    const filtered = prev.filter(g => g.playerId !== player.id)
                    const newEvts: BaseEvent[] = []

                    for (let i = 0; i < p1; i++) {
                      newEvts.push({
                        id: `BASKET_${player.id}_1_${Date.now()}_${i}`,
                        playerId: player.id,
                        assistId: '',
                        type: 'GOAL',
                        defineTime: false,
                        timeType: '1°',
                        minutes: 0,
                        seconds: 0,
                        detail: '1'
                      })
                    }
                    for (let i = 0; i < p2; i++) {
                      newEvts.push({
                        id: `BASKET_${player.id}_2_${Date.now()}_${i}`,
                        playerId: player.id,
                        assistId: '',
                        type: 'GOAL',
                        defineTime: false,
                        timeType: '1°',
                        minutes: 0,
                        seconds: 0,
                        detail: '2'
                      })
                    }
                    for (let i = 0; i < p3; i++) {
                      newEvts.push({
                        id: `BASKET_${player.id}_3_${Date.now()}_${i}`,
                        playerId: player.id,
                        assistId: '',
                        type: 'GOAL',
                        defineTime: false,
                        timeType: '1°',
                        minutes: 0,
                        seconds: 0,
                        detail: '3'
                      })
                    }

                    return [...filtered, ...newEvts]
                  })

                  setBasketballEditingPlayer(null)
                }}
                className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs uppercase tracking-wider hover:shadow-lg hover:shadow-blue-500/20 rounded-xl shadow-md transition-all active:scale-95"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
