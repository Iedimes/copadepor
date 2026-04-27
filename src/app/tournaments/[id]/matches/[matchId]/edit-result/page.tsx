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

export default function EditResultPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string
  const matchId = params.matchId as string

  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [matchStatus, setMatchStatus] = useState<MatchStatus>('NO_REALIZADO')

  // Home team goals state
  const [homeGoals, setHomeGoals] = useState<Array<{
    id: string
    scorerId: string
    assistId: string
    defineTime: boolean
    timeType: '1°' | '2°' | '3°' | '4°' | 'PRORROGA'
    minutes: number
    seconds: number
  }>>([])

  // Away team goals state
  const [awayGoals, setAwayGoals] = useState<Array<{
    id: string
    scorerId: string
    assistId: string
    defineTime: boolean
    timeType: '1°' | '2°' | '3°' | '4°' | 'PRORROGA'
    minutes: number
    seconds: number
  }>>([])

  // Home team cards state
  const [homeCards, setHomeCards] = useState<Array<{
    id: string
    playerId: string
    type: 'YELLOW_CARD' | 'RED_CARD' | 'DOUBLE_YELLOW_CARD'
    defineTime: boolean
    timeType: '1°' | '2°' | '3°' | '4°' | 'PRORROGA'
    minutes: number
    seconds: number
  }>>([])

  // Away team cards state
  const [awayCards, setAwayCards] = useState<Array<{
    id: string
    playerId: string
    type: 'YELLOW_CARD' | 'RED_CARD' | 'DOUBLE_YELLOW_CARD'
    defineTime: boolean
    timeType: '1°' | '2°' | '3°' | '4°' | 'PRORROGA'
    minutes: number
    seconds: number
  }>>([])

  useEffect(() => {
    fetchMatch()
  }, [matchId])

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
      // Fetch match details
      const matchRes = await fetch(`/api/matches/${matchId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!matchRes.ok) throw new Error('Failed to fetch match')
      const matchData = await matchRes.json()
      setMatch(matchData)
      setMatchStatus(matchData.status || 'NO_REALIZADO')

      if (matchData.events) {
        const homeEvents = matchData.events.filter((e: any) => e.teamId === matchData.homeTeam.id && e.type === 'GOAL')
        const awayEvents = matchData.events.filter((e: any) => e.teamId === matchData.awayTeam.id && e.type === 'GOAL')

        setHomeGoals(homeEvents.map((e: any) => ({
          id: e.id,
          scorerId: e.playerId || '',
          assistId: e.assistId || '',
          defineTime: !!e.timeType,
          timeType: e.timeType || '1°',
          minutes: e.minute || 0,
          seconds: e.second || 0
        })))

        setAwayGoals(awayEvents.map((e: any) => ({
          id: e.id,
          scorerId: e.playerId || '',
          assistId: e.assistId || '',
          defineTime: !!e.timeType,
          timeType: e.timeType || '1°',
          minutes: e.minute || 0,
          seconds: e.second || 0
        })))

        const homeCardEvents = matchData.events.filter((e: any) => e.teamId === matchData.homeTeam.id && ['YELLOW_CARD', 'RED_CARD', 'DOUBLE_YELLOW_CARD'].includes(e.type))
        const awayCardEvents = matchData.events.filter((e: any) => e.teamId === matchData.awayTeam.id && ['YELLOW_CARD', 'RED_CARD', 'DOUBLE_YELLOW_CARD'].includes(e.type))

        setHomeCards(homeCardEvents.map((e: any) => ({
          id: e.id,
          playerId: e.playerId || '',
          type: e.type,
          defineTime: !!e.timeType,
          timeType: e.timeType || '1°',
          minutes: e.minute || 0,
          seconds: e.second || 0
        })))

        setAwayCards(awayCardEvents.map((e: any) => ({
          id: e.id,
          playerId: e.playerId || '',
          type: e.type,
          defineTime: !!e.timeType,
          timeType: e.timeType || '1°',
          minutes: e.minute || 0,
          seconds: e.second || 0
        })))
      }

      // Fetch players for home team
      const homePlayersRes = await fetch(`/api/teams/${matchData.homeTeam.id}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (homePlayersRes.ok) {
        const homePlayers = await homePlayersRes.json()
        setMatch(prev => prev ? { ...prev, homeTeam: { ...prev.homeTeam, players: homePlayers } } : null)
      }

      // Fetch players for away team
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

  const addHomeGoal = () => {
    setHomeGoals(prev => [...prev, {
      id: Date.now().toString(),
      scorerId: '',
      assistId: '',
      defineTime: false,
      timeType: '1°',
      minutes: 0,
      seconds: 0
    }])
  }

  const addAwayGoal = () => {
    setAwayGoals(prev => [...prev, {
      id: Date.now().toString(),
      scorerId: '',
      assistId: '',
      defineTime: false,
      timeType: '1°',
      minutes: 0,
      seconds: 0
    }])
  }

  const removeHomeGoal = (goalId: string) => {
    setHomeGoals(prev => prev.filter(g => g.id !== goalId))
  }

  const removeAwayGoal = (goalId: string) => {
    setAwayGoals(prev => prev.filter(g => g.id !== goalId))
  }

  const addHomeCard = () => {
    setHomeCards(prev => [...prev, {
      id: Date.now().toString(),
      playerId: '',
      type: 'YELLOW_CARD',
      defineTime: false,
      timeType: '1°',
      minutes: 0,
      seconds: 0
    }])
  }

  const addAwayCard = () => {
    setAwayCards(prev => [...prev, {
      id: Date.now().toString(),
      playerId: '',
      type: 'YELLOW_CARD',
      defineTime: false,
      timeType: '1°',
      minutes: 0,
      seconds: 0
    }])
  }

  const removeHomeCard = (cardId: string) => {
    setHomeCards(prev => prev.filter(c => c.id !== cardId))
  }

  const removeAwayCard = (cardId: string) => {
    setAwayCards(prev => prev.filter(c => c.id !== cardId))
  }

  const handleSave = async () => {
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      // Prepare events
      const events = [
        ...homeGoals.map(g => ({ ...g, teamId: match?.homeTeam.id, type: 'GOAL' })),
        ...awayGoals.map(g => ({ ...g, teamId: match?.awayTeam.id, type: 'GOAL' })),
        ...homeCards.map(c => ({ ...c, teamId: match?.homeTeam.id })),
        ...awayCards.map(c => ({ ...c, teamId: match?.awayTeam.id }))
      ]

      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          status: matchStatus,
          homeScore: homeGoals.length,
          awayScore: awayGoals.length,
          events
        })
      })

      if (!res.ok) throw new Error('Failed to save match')
      
      router.back()
    } catch (err) {
      console.error(err)
      alert('Error al guardar el resultado')
    }
  }

  if (loading) return <div className="p-8">Cargando...</div>
  if (error) return <div className="p-8 text-red-500">{error}</div>
  if (!match) return <div className="p-8">Partido no encontrado</div>

  const statusOptions: MatchStatus[] = ['NO_REALIZADO', 'EN_VIVO', 'FINALIZADO']

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header with back button and status */}
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => router.back()} className="text-blue-600 flex items-center gap-2">
            ← Volver
          </button>
          <div className="flex items-center gap-4">
            <label className="text-sm text-gray-600">Estado del partido:</label>
            <select
              value={matchStatus}
              onChange={(e) => setMatchStatus(e.target.value as MatchStatus)}
              className="px-4 py-2 border rounded-lg"
            >
              {statusOptions.map(option => (
                <option key={option} value={option}>
                  {option === 'NO_REALIZADO' ? 'No realizado' : option === 'EN_VIVO' ? 'En Vivo' : 'Finalizado'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Teams divider */}
        <div className="flex gap-6">
          {/* Home Team */}
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-4 text-center">{match.homeTeam.name}</h2>

            {/* Goals Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Goles</h3>
                <button onClick={addHomeGoal} className="text-sm text-blue-600">+ Añadir Gol</button>
              </div>
              {homeGoals.map(goal => (
                <div key={goal.id} className="border p-3 rounded-lg mb-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Gol #{homeGoals.indexOf(goal) + 1}</span>
                    <button onClick={() => removeHomeGoal(goal.id)} className="text-red-500 text-sm">Eliminar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Gol del jugador</label>
                      <select
                        value={goal.scorerId}
                        onChange={(e) => setHomeGoals(prev => prev.map(g => g.id === goal.id ? { ...g, scorerId: e.target.value } : g))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Seleccionar jugador</option>
                        {match.homeTeam.players?.map(player => (
                          <option key={player.id} value={player.id}>{player.number ? `${player.number}. ` : ''}{player.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Asistencia</label>
                      <select
                        value={goal.assistId}
                        onChange={(e) => setHomeGoals(prev => prev.map(g => g.id === goal.id ? { ...g, assistId: e.target.value } : g))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Seleccionar jugador</option>
                        {match.homeTeam.players?.map(player => (
                          <option key={player.id} value={player.id}>{player.number ? `${player.number}. ` : ''}{player.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={goal.defineTime}
                      onChange={(e) => setHomeGoals(prev => prev.map(g => g.id === goal.id ? { ...g, defineTime: e.target.checked } : g))}
                      id={`home-define-time-${goal.id}`}
                    />
                    <label htmlFor={`home-define-time-${goal.id}`} className="text-sm text-gray-600">Definir tiempo</label>
                  </div>
                  {goal.defineTime && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tiempo</label>
                        <select
                          value={goal.timeType}
                          onChange={(e) => setHomeGoals(prev => prev.map(g => g.id === goal.id ? { ...g, timeType: e.target.value as '1°' | '2°' | '3°' | '4°' | 'PRORROGA' } : g))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="1°">1° Tiempo</option>
                          <option value="2°">2° Tiempo</option>
                          <option value="3°">3° Tiempo</option>
                          <option value="4°">4° Tiempo</option>
                          <option value="PRORROGA">Prórroga</option>
                        </select>
                      </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Minutos</label>
                            <input
                              type="number"
                              value={goal.minutes}
                              onChange={(e) => setHomeGoals(prev => prev.map(g => g.id === goal.id ? { ...g, minutes: parseInt(e.target.value) || 0 } : g))}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Segundos</label>
                            <input
                              type="number"
                              value={goal.seconds}
                              onChange={(e) => setHomeGoals(prev => prev.map(g => g.id === goal.id ? { ...g, seconds: parseInt(e.target.value) || 0 } : g))}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              min="0"
                              max="59"
                            />
                          </div>
                        </div>
                    </div>
                  )}
                </div>
              ))}
              {homeGoals.length === 0 && <p className="text-sm text-gray-400">No hay goles registrados</p>}
            </div>

            {/* Cards Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Tarjetas</h3>
                <button onClick={addHomeCard} className="text-sm text-blue-600">+ Añadir Tarjeta</button>
              </div>
              {homeCards.map(card => (
                <div key={card.id} className="border p-3 rounded-lg mb-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Tarjeta #{homeCards.indexOf(card) + 1}</span>
                    <button onClick={() => removeHomeCard(card.id)} className="text-red-500 text-sm">Eliminar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Jugador</label>
                      <select
                        value={card.playerId}
                        onChange={(e) => setHomeCards(prev => prev.map(c => c.id === card.id ? { ...c, playerId: e.target.value } : c))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Seleccionar jugador</option>
                        {match.homeTeam.players?.map(player => (
                          <option key={player.id} value={player.id}>{player.number ? `${player.number}. ` : ''}{player.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                      <select
                        value={card.type}
                        onChange={(e) => setHomeCards(prev => prev.map(c => c.id === card.id ? { ...c, type: e.target.value as any } : c))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="YELLOW_CARD">Amarilla</option>
                        <option value="DOUBLE_YELLOW_CARD">Doble Amarilla (Roja)</option>
                        <option value="RED_CARD">Roja Directa</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={card.defineTime}
                      onChange={(e) => setHomeCards(prev => prev.map(c => c.id === card.id ? { ...c, defineTime: e.target.checked } : c))}
                      id={`home-card-define-time-${card.id}`}
                    />
                    <label htmlFor={`home-card-define-time-${card.id}`} className="text-sm text-gray-600">Definir tiempo</label>
                  </div>
                  {card.defineTime && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tiempo</label>
                        <select
                          value={card.timeType}
                          onChange={(e) => setHomeCards(prev => prev.map(c => c.id === card.id ? { ...c, timeType: e.target.value as any } : c))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="1°">1° Tiempo</option>
                          <option value="2°">2° Tiempo</option>
                          <option value="3°">3° Tiempo</option>
                          <option value="4°">4° Tiempo</option>
                          <option value="PRORROGA">Prórroga</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Minutos</label>
                          <input
                            type="number"
                            value={card.minutes}
                            onChange={(e) => setHomeCards(prev => prev.map(c => c.id === card.id ? { ...c, minutes: parseInt(e.target.value) || 0 } : c))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Segundos</label>
                          <input
                            type="number"
                            value={card.seconds}
                            onChange={(e) => setHomeCards(prev => prev.map(c => c.id === card.id ? { ...c, seconds: parseInt(e.target.value) || 0 } : c))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            min="0"
                            max="59"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {homeCards.length === 0 && <p className="text-sm text-gray-400">No hay tarjetas registradas</p>}
            </div>

            {/* Other sections (buttons for now) */}
            <div className="space-y-3">
              <button className="w-full py-2 border rounded-lg text-sm">Faltas</button>
              <button className="w-full py-2 border rounded-lg text-sm">Alineación (Añadir)</button>
              <button className="w-full py-2 border rounded-lg text-sm">Sustituciones (Añadir)</button>
              <button className="w-full py-2 border rounded-lg text-sm">Gol en contra (Añadir)</button>
              <button className="w-full py-2 border rounded-lg text-sm">Portero (Añadir)</button>
              <button className="w-full py-2 border rounded-lg text-sm">Jugadas del partido (Añadir)</button>
            </div>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-300" />

          {/* Away Team */}
          <div className="flex-1">
            <h2 className="text-xl font-bold mb-4 text-center">{match.awayTeam.name}</h2>

            {/* Goals Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Goles</h3>
                <button onClick={addAwayGoal} className="text-sm text-blue-600">+ Añadir Gol</button>
              </div>
              {awayGoals.map(goal => (
                <div key={goal.id} className="border p-3 rounded-lg mb-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Gol #{awayGoals.indexOf(goal) + 1}</span>
                    <button onClick={() => removeAwayGoal(goal.id)} className="text-red-500 text-sm">Eliminar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Gol del jugador</label>
                      <select
                        value={goal.scorerId}
                        onChange={(e) => setAwayGoals(prev => prev.map(g => g.id === goal.id ? { ...g, scorerId: e.target.value } : g))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Seleccionar jugador</option>
                        {match.awayTeam.players?.map(player => (
                          <option key={player.id} value={player.id}>{player.number ? `${player.number}. ` : ''}{player.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Asistencia</label>
                      <select
                        value={goal.assistId}
                        onChange={(e) => setAwayGoals(prev => prev.map(g => g.id === goal.id ? { ...g, assistId: e.target.value } : g))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Seleccionar jugador</option>
                        {match.awayTeam.players?.map(player => (
                          <option key={player.id} value={player.id}>{player.number ? `${player.number}. ` : ''}{player.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={goal.defineTime}
                      onChange={(e) => setAwayGoals(prev => prev.map(g => g.id === goal.id ? { ...g, defineTime: e.target.checked } : g))}
                      id={`away-define-time-${goal.id}`}
                    />
                    <label htmlFor={`away-define-time-${goal.id}`} className="text-sm text-gray-600">Definir tiempo</label>
                  </div>
                  {goal.defineTime && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tiempo</label>
                        <select
                          value={goal.timeType}
                          onChange={(e) => setAwayGoals(prev => prev.map(g => g.id === goal.id ? { ...g, timeType: e.target.value as '1°' | '2°' | '3°' | '4°' | 'PRORROGA' } : g))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="1°">1° Tiempo</option>
                          <option value="2°">2° Tiempo</option>
                          <option value="3°">3° Tiempo</option>
                          <option value="4°">4° Tiempo</option>
                          <option value="PRORROGA">Prórroga</option>
                        </select>
                      </div>
                        <div className="grid grid-cols-2 gap-3 mt-3">
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Minutos</label>
                            <input
                              type="number"
                              value={goal.minutes}
                              onChange={(e) => setAwayGoals(prev => prev.map(g => g.id === goal.id ? { ...g, minutes: parseInt(e.target.value) || 0 } : g))}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              min="0"
                            />
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 mb-1">Segundos</label>
                            <input
                              type="number"
                              value={goal.seconds}
                              onChange={(e) => setAwayGoals(prev => prev.map(g => g.id === goal.id ? { ...g, seconds: parseInt(e.target.value) || 0 } : g))}
                              className="w-full px-3 py-2 border rounded-lg text-sm"
                              min="0"
                              max="59"
                            />
                          </div>
                        </div>
                    </div>
                  )}
                </div>
              ))}
              {awayGoals.length === 0 && <p className="text-sm text-gray-400">No hay goles registrados</p>}
            </div>

            {/* Cards Section */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Tarjetas</h3>
                <button onClick={addAwayCard} className="text-sm text-blue-600">+ Añadir Tarjeta</button>
              </div>
              {awayCards.map(card => (
                <div key={card.id} className="border p-3 rounded-lg mb-3 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Tarjeta #{awayCards.indexOf(card) + 1}</span>
                    <button onClick={() => removeAwayCard(card.id)} className="text-red-500 text-sm">Eliminar</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Jugador</label>
                      <select
                        value={card.playerId}
                        onChange={(e) => setAwayCards(prev => prev.map(c => c.id === card.id ? { ...c, playerId: e.target.value } : c))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="">Seleccionar jugador</option>
                        {match.awayTeam.players?.map(player => (
                          <option key={player.id} value={player.id}>{player.number ? `${player.number}. ` : ''}{player.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Tipo</label>
                      <select
                        value={card.type}
                        onChange={(e) => setAwayCards(prev => prev.map(c => c.id === card.id ? { ...c, type: e.target.value as any } : c))}
                        className="w-full px-3 py-2 border rounded-lg text-sm"
                      >
                        <option value="YELLOW_CARD">Amarilla</option>
                        <option value="DOUBLE_YELLOW_CARD">Doble Amarilla (Roja)</option>
                        <option value="RED_CARD">Roja Directa</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={card.defineTime}
                      onChange={(e) => setAwayCards(prev => prev.map(c => c.id === card.id ? { ...c, defineTime: e.target.checked } : c))}
                      id={`away-card-define-time-${card.id}`}
                    />
                    <label htmlFor={`away-card-define-time-${card.id}`} className="text-sm text-gray-600">Definir tiempo</label>
                  </div>
                  {card.defineTime && (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Tiempo</label>
                        <select
                          value={card.timeType}
                          onChange={(e) => setAwayCards(prev => prev.map(c => c.id === card.id ? { ...c, timeType: e.target.value as any } : c))}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        >
                          <option value="1°">1° Tiempo</option>
                          <option value="2°">2° Tiempo</option>
                          <option value="3°">3° Tiempo</option>
                          <option value="4°">4° Tiempo</option>
                          <option value="PRORROGA">Prórroga</option>
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Minutos</label>
                          <input
                            type="number"
                            value={card.minutes}
                            onChange={(e) => setAwayCards(prev => prev.map(c => c.id === card.id ? { ...c, minutes: parseInt(e.target.value) || 0 } : c))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            min="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Segundos</label>
                          <input
                            type="number"
                            value={card.seconds}
                            onChange={(e) => setAwayCards(prev => prev.map(c => c.id === card.id ? { ...c, seconds: parseInt(e.target.value) || 0 } : c))}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            min="0"
                            max="59"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {awayCards.length === 0 && <p className="text-sm text-gray-400">No hay tarjetas registradas</p>}
            </div>

            {/* Other sections (buttons for now) */}
            <div className="space-y-3">
              <button className="w-full py-2 border rounded-lg text-sm">Faltas</button>
              <button className="w-full py-2 border rounded-lg text-sm">Alineación (Añadir)</button>
              <button className="w-full py-2 border rounded-lg text-sm">Sustituciones (Añadir)</button>
              <button className="w-full py-2 border rounded-lg text-sm">Gol en contra (Añadir)</button>
              <button className="w-full py-2 border rounded-lg text-sm">Portero (Añadir)</button>
              <button className="w-full py-2 border rounded-lg text-sm">Jugadas del partido (Añadir)</button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="mt-6">
          <button
            onClick={handleSave}
            className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
          >
            Guardar Resultado
          </button>
        </div>
      </div>
    </div>
  )
}
