'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'

interface Tournament {
  id: string
  name: string
  description: string | null
  sportType: string
  status: string
  organizer: { name: string }
  classificationCriteria: string
  phaseSystem: string
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
  phaseName: string
  advantageTeamId?: string | null
  events?: any[]
}

interface TournamentTeam {
  id: string
  team: { id: string; name: string }
}

type MenuType = 'inicio' | 'clasificacion' | 'estadisticas'

export default function TournamentPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [tournamentTeams, setTournamentTeams] = useState<TournamentTeam[]>([])
  const [allTeams, setAllTeams] = useState<{ id: string; name: string }[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [showQR, setShowQR] = useState(false)
  const [activeMenu, setActiveMenu] = useState<MenuType>(() => {
    const view = searchParams.get('view')
    return view === 'clasificacion' ? 'clasificacion' : 'inicio'
  })
  const [selectedRound, setSelectedRound] = useState('1')
  const [roundDate, setRoundDate] = useState('')
  const [generating, setGenerating] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [showGenType, setShowGenType] = useState(false)
  const [selectedPhase, setSelectedPhase] = useState('Primera Fase')
  const [phases, setPhases] = useState<string[]>(['Primera Fase'])
  const [matchType, setMatchType] = useState<'ida' | 'idayvuelta'>('ida')
  
  const [editingMatchData, setEditingMatchData] = useState<{ id: string, homeScore: number | null, awayScore: number | null, status: string } | null>(null)
  const [showEditResult, setShowEditResult] = useState(false)
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null)
  const [showConfigMenu, setShowConfigMenu] = useState(false)
  const [showFixtureMenu, setShowFixtureMenu] = useState(false)
  const [showAddMatchModal, setShowAddMatchModal] = useState(false)
  const [showMatchMenu, setShowMatchMenu] = useState(false)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [showPlayoffDraw, setShowPlayoffDraw] = useState(false)

  const tournamentId = params.id as string

  useEffect(() => {
    fetchData()
  }, [tournamentId, activeMenu])

  useEffect(() => {
    const view = searchParams.get('view')
    if (view === 'clasificacion' && activeMenu === 'inicio') {
      setActiveMenu('clasificacion')
    }
  }, [searchParams])

  const fetchData = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    if (!token) {
      setLoading(false)
      return
    }
    
    try {
      const tRes = await fetch(`/api/tournaments/${tournamentId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (tRes.ok) {
        const tData = await tRes.json()
        setTournament(tData)
      }

      if (activeMenu === 'inicio') {
        const mRes = await fetch(`/api/tournaments/${tournamentId}/messages`, { headers: { Authorization: `Bearer ${token}` } })
        if (mRes.ok) setMessages(await mRes.json())
      } else if (activeMenu === 'clasificacion' || activeMenu === 'estadisticas') {
        const [matchesRes, teamsRes, allTeamsRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}/matches`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/tournaments/${tournamentId}/teams`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }),
        ])
        
        if (matchesRes.ok) {
          const m = await matchesRes.json()
          setMatches(m)
          const rounds = [...new Set(m.map((x: any) => String(x.roundName)))].sort((a: any, b: any) => parseInt(a) - parseInt(b))
          if (rounds.length > 0 && (!selectedRound || !rounds.includes(selectedRound))) {
            setSelectedRound(rounds[0])
          }
          const p = [...new Set(m.map((x: any) => x.phaseName || 'Primera Fase'))] as string[]
          setPhases(p.length > 0 ? p : ['Primera Fase'])
        }
        if (teamsRes.ok) setTournamentTeams(await teamsRes.json())
        if (allTeamsRes.ok) setAllTeams(await allTeamsRes.json())
      }
    } catch (error) {
      console.error(error)
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

  const handleCreateStage = async (stageName: string, numMatches: number) => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/matches?action=generatePlayoff`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ stageName, numMatches, phaseName: selectedPhase }),
    })
    if (res.ok) {
      alert(`${stageName} generados con éxito`)
      fetchData()
    } else {
      alert('Error al generar etapa')
    }
  }

  const handleCreateAdvantagePlayoff = () => {
    setShowPlayoffDraw(true)
  }

  const handlePhaseChange = (val: string) => {
    if (val === 'NEW') {
      const name = prompt('Nombre de la nueva fase:')
      if (name) {
        if (!phases.includes(name)) {
          setPhases([...phases, name])
          setSelectedPhase(name)
        }
      }
      return
    }
    setSelectedPhase(val)
  }

  const handleGenerateMatches = async (type: 'ida' | 'idayvuelta') => {
    setShowGenType(false); setGenerating(true)
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/matches?action=generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundName: '1', roundDate: roundDate || new Date().toISOString(), matchType: type, phaseName: selectedPhase }),
    })
    if (res.ok) {
      await fetchData();
      setSelectedRound('1');
    } else {
      alert('Error al generar');
    }
    setGenerating(false)
  }

  const handleOpenMatchModal = (m: any) => {
    const homePlayers = m.homeTeam._count?.teamMembers || 0
    const awayPlayers = m.awayTeam._count?.teamMembers || 0

    if (homePlayers === 0) {
      alert(`El equipo ${m.homeTeam.name} no tiene jugadores. Redirigiendo para cargar plantilla...`)
      router.push(`/tournaments/${tournamentId}/add-players?teamId=${m.homeTeam.id}&teamName=${encodeURIComponent(m.homeTeam.name)}`)
      return
    }
    if (awayPlayers === 0) {
      alert(`El equipo ${m.awayTeam.name} no tiene jugadores. Redirigiendo para cargar plantilla...`)
      router.push(`/tournaments/${tournamentId}/add-players?teamId=${m.awayTeam.id}&teamName=${encodeURIComponent(m.awayTeam.name)}`)
      return
    }

    setSelectedMatchId(m.id)
    setShowMatchMenu(true)
  }

  const handleRemoveMatch = async (matchId: string) => {
    if (!confirm('¿Eliminar este partido?')) return
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      setShowMatchMenu(false)
      fetchData()
    } else alert('Error al eliminar')
  }

  const getStandings = () => {
    const stats: Record<string, any> = {}
    tournamentTeams.forEach(tt => { stats[tt.team.id] = { name: tt.team.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 } })
    
    // Filter matches by selected phase
    const phaseMatches = matches.filter(m => (m.phaseName || 'Primera Fase') === selectedPhase)
    
    phaseMatches.forEach(m => {
      const isE = editingMatchData?.id === m.id
      const hS = isE ? editingMatchData.homeScore : m.homeScore
      const aS = isE ? editingMatchData.awayScore : m.awayScore
      const st = isE ? editingMatchData.status : m.status
      if (hS !== null && aS !== null && st !== 'NO_REALIZADO') {
        const h = stats[m.homeTeam.id]; const a = stats[m.awayTeam.id];
        if (h && a) {
          h.played++; a.played++; h.gf += hS; h.ga += aS; a.gf += aS; a.ga += hS
          if (hS > aS) { h.won++; a.lost++; h.points += 3 }
          else if (hS < aS) { a.won++; h.lost++; a.points += 3 }
          else { h.drawn++; a.drawn++; h.points++; a.points++ }
        }
      }
    })

    const criteria = (tournament?.classificationCriteria || 'PUNTOS,GOLES,GOLES_A_FAVOR').split(',')

    return Object.values(stats).map(s => ({
      ...s,
      diff: s.gf - s.ga,
      perc: s.played > 0 ? Math.round((s.points / (s.played * 3)) * 100) : 0
    })).sort((a: any, b: any) => {
      for (const criterion of criteria) {
        if (criterion === 'PUNTOS' && b.points !== a.points) return b.points - a.points
        if (criterion === 'GOLES' && b.diff !== a.diff) return b.diff - a.diff
        if (criterion === 'GOLES_A_FAVOR' && b.gf !== a.gf) return b.gf - a.gf
      }
      return 0
    })
  }

  const getTeamRankings = () => {
    const stats: Record<string, any> = {}
    tournamentTeams.forEach(tt => { 
      stats[tt.team.id] = { id: tt.team.id, name: tt.team.name, gf: 0, ga: 0, red: 0, yellow: 0, totalCards: 0 } 
    })

    matches.forEach(m => {
      const hS = m.homeScore; const aS = m.awayScore;
      if (hS !== null && aS !== null && m.status !== 'NO_REALIZADO') {
        const h = stats[m.homeTeam.id]; const a = stats[m.awayTeam.id]
        if (h && a) {
          h.gf += hS; h.ga += aS; a.gf += aS; a.ga += hS
        }
      }
      (m.events || []).forEach((e: any) => {
        const t = stats[e.teamId]
        if (!t) return
        if (e.type === 'RED_CARD') { t.red++; t.totalCards++ }
        else if (e.type === 'YELLOW_CARD') { t.yellow++; t.totalCards++ }
        else if (e.type === 'DOUBLE_YELLOW_CARD') { t.red++; t.yellow++; t.totalCards += 2 }
      })
    })

    const list = Object.values(stats)
    return {
      bestAttack: [...list].sort((a, b) => b.gf - a.gf).slice(0, 5),
      bestDefense: [...list].sort((a, b) => a.ga - b.ga).slice(0, 5),
      redCards: [...list].sort((a, b) => b.red - a.red).filter(x => x.red > 0).slice(0, 5),
      totalCards: [...list].sort((a, b) => b.totalCards - a.totalCards).filter(x => x.totalCards > 0).slice(0, 5)
    }
  }

  const getTopScorers = () => {
    const scorers: Record<string, { name: string; team: string; goals: number }> = {}
    matches.forEach(m => {
      (m.events || []).forEach((e: any) => {
        if (e.type === 'GOAL') {
          const pName = e.player?.name || 'Desconocido'
          const tName = e.team?.name || ''
          if (!scorers[pName]) scorers[pName] = { name: pName, team: tName, goals: 0 }
          scorers[pName].goals++
        }
      })
    })
    return Object.values(scorers).sort((a, b) => b.goals - a.goals).slice(0, 10)
  }

  const getTopDisciplined = () => {
    const players: Record<string, { name: string; team: string; yellow: number; red: number }> = {}
    matches.forEach(m => {
      (m.events || []).forEach((e: any) => {
        const pName = e.player?.name || 'Desconocido'
        const tName = e.team?.name || ''
        if (!players[pName]) players[pName] = { name: pName, team: tName, yellow: 0, red: 0 }
        if (e.type === 'YELLOW_CARD') players[pName].yellow++
        if (e.type === 'RED_CARD') players[pName].red++
        if (e.type === 'DOUBLE_YELLOW_CARD') { players[pName].yellow++; players[pName].red++ }
      })
    })
    return Object.values(players).sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow)).slice(0, 10)
  }

  const shareUrl = `https://copafacil.com/${tournamentId}`
  const sportIcon = getSportIcon(tournament?.sportType || '')

  if (loading && !tournament) return <div className="p-8">Cargando...</div>
  if (!tournament) return <div className="p-8">No encontrado. <button onClick={fetchData}>Recargar</button></div>

  return (
    <>
    <div className="min-h-screen bg-[#F8FAFC] flex relative overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-56 bg-white border-r border-slate-100 flex-shrink-0 z-10">
        <div className="p-6">
          <button onClick={() => router.push('/dashboard')} className="text-slate-400 text-xs font-black uppercase tracking-widest mb-8 hover:text-blue-600 transition flex items-center gap-2">← Dashboard</button>
          <div className="mb-8">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Torneo</div>
            <h2 className="font-black text-xl text-slate-800 leading-tight">{tournament.name}</h2>
          </div>
          <nav className="space-y-1">
            <button onClick={() => setActiveMenu('inicio')} className={`w-full text-left px-4 py-3 rounded-2xl font-black text-sm transition-all ${activeMenu === 'inicio' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>🏠 Inicio</button>
            <button onClick={() => setActiveMenu('clasificacion')} className={`w-full text-left px-4 py-3 rounded-2xl font-black text-sm transition-all ${activeMenu === 'clasificacion' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>📊 Clasificación</button>
            <button onClick={() => setActiveMenu('estadisticas')} className={`w-full text-left px-4 py-3 rounded-2xl font-black text-sm transition-all ${activeMenu === 'estadisticas' ? 'bg-blue-600 text-white shadow-xl shadow-blue-100' : 'text-slate-500 hover:bg-slate-50'}`}>🏆 Estadísticas</button>
          </nav>

          {/* Phase Selector */}
          <div className="mt-8 px-4">
            <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-2">Fase Activa</div>
            <select 
              value={selectedPhase}
              onChange={(e) => handlePhaseChange(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-black text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
            >
              {phases.map(p => <option key={p} value={p}>{p}</option>)}
              <option value="NEW">+ Nueva Fase</option>
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        {activeMenu === 'inicio' ? (
          <div className="max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl font-black">{sportIcon}</div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">{tournament.name}</h1>
              <p className="text-slate-400 font-bold mb-8 flex items-center gap-2 italic">Organizado por <span className="text-blue-600 not-italic">{tournament?.organizer?.name}</span></p>
              
              <div className="flex gap-4 mb-10">
                <button onClick={() => setShowQR(!showQR)} className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-600 transition-all flex items-center gap-2 shadow-lg"><span>📤</span> Compartir Link</button>
                <button className="bg-slate-50 text-slate-600 px-6 py-3 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all">Configuración</button>
              </div>

              {showQR && <div className="p-6 bg-slate-50 rounded-[2rem] mb-10 border-2 border-dashed border-slate-200 animate-in zoom-in-95"><div className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-widest text-center">URL Pública</div><div className="bg-white p-4 rounded-xl font-mono text-xs text-blue-600 break-all border border-slate-100 shadow-sm">{shareUrl}</div></div>}
              
              <div className="border-t border-slate-100 pt-10">
                <h2 className="text-2xl font-black text-slate-900 mb-6">💬 Tablón de Mensajes</h2>
                <form onSubmit={handleSendMessage} className="flex gap-3 mb-8">
                  <input type="text" value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Publicar un anuncio importante..." className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl outline-none transition-all focus:ring-2 focus:ring-blue-500 font-medium text-slate-700" />
                  <button type="submit" className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">Publicar</button>
                </form>
                <div className="space-y-6">
                  {messages.length === 0 && <div className="text-center py-10 text-slate-300 font-black uppercase text-xs tracking-widest italic">No hay mensajes aún</div>}
                  {messages.map(m => (
                    <div key={m.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-3">
                        <span className="font-black text-sm text-slate-800">{m.sender.name}</span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{new Date(m.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 text-sm leading-relaxed">{m.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : activeMenu === 'clasificacion' ? (
          <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto h-full">
            {/* Classification OR Bracket */}
            <div className="flex-1 max-w-[1000px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 border border-slate-50 overflow-y-auto">
                <div className="animate-in fade-in duration-500">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-4">
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">📊 {selectedPhase}</h2>
                      <button onClick={() => setShowConfigMenu(true)} className="bg-slate-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm hover:scale-110 transition-all">+</button>
                    </div>
                    <button onClick={() => router.push(`/tournaments/${tournamentId}/add-teams`)} className="bg-slate-50 text-slate-600 px-5 py-2.5 rounded-2xl text-xs font-black hover:bg-blue-50 hover:text-blue-600 transition-all">GESTOR DE EQUIPOS</button>
                  </div>
                  
                  <div className="overflow-x-auto rounded-3xl border border-slate-100 mb-10">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                          <th className="p-4 text-center rounded-tl-3xl">Pos</th>
                          <th className="p-4 text-left">EQUIPOS</th>
                          <th className="p-4 text-center">Pts</th>
                          <th className="p-4 text-center">J</th>
                          <th className="p-4 text-center">G</th>
                          <th className="p-4 text-center">E</th>
                          <th className="p-4 text-center">P</th>
                          <th className="p-4 text-center">GF</th>
                          <th className="p-4 text-center">GC</th>
                          <th className="p-4 text-center">DIF</th>
                          <th className="p-4 text-center">%</th>
                          <th className="p-4 text-center rounded-tr-3xl">PE</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {getStandings().map((t, i) => (
                          <tr key={i} className="hover:bg-slate-50/80 transition-all cursor-default">
                            <td className="p-4 text-center font-black text-white bg-slate-900">{i+1}</td>
                            <td className="p-4 font-black text-slate-800 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-[10px]">🏆</div>
                              {t.name}
                            </td>
                            <td className="p-4 text-center font-black text-blue-600 text-lg">{t.points}</td>
                            <td className="p-4 text-center text-slate-500 font-bold">{t.played}</td>
                            <td className="p-4 text-center text-slate-500 font-bold">{t.won}</td>
                            <td className="p-4 text-center text-slate-500 font-bold">{t.drawn}</td>
                            <td className="p-4 text-center text-slate-500 font-bold">{t.lost}</td>
                            <td className="p-4 text-center text-slate-500 font-bold">{t.gf}</td>
                            <td className="p-4 text-center text-slate-500 font-bold">{t.ga}</td>
                            <td className="p-4 text-center font-black text-slate-800">{t.diff > 0 ? `+${t.diff}` : t.diff}</td>
                            <td className="p-4 text-center text-slate-400 font-bold">{t.perc}%</td>
                            <td className="p-4 text-center text-slate-400 font-bold">0</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {(selectedPhase.toLowerCase().includes('final') || selectedPhase.toLowerCase().includes('eliminatoria')) && (
                    <>
                      <div className="flex justify-between items-center mb-10 border-t border-slate-100 pt-10">
                        <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">🌳 Cuadro de Llaves</h2>
                        <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase italic">Esquema Visual</span>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-10">
                        <BracketColumn title="Cuartos" matches={matches.filter(m => (m.phaseName || 'Primera Fase') === selectedPhase && m.roundName.toLowerCase().includes('cuarto'))} />
                        <BracketColumn title="Semis" matches={matches.filter(m => (m.phaseName || 'Primera Fase') === selectedPhase && m.roundName.toLowerCase().includes('semi'))} />
                        <BracketColumn title="Final" matches={matches.filter(m => (m.phaseName || 'Primera Fase') === selectedPhase && m.roundName.toLowerCase().includes('final'))} />
                      </div>
                    </>
                  )}
                </div>
            </div>

            {/* Calendar */}
            <div className="w-full xl:w-[450px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50 flex flex-col flex-shrink-0 overflow-hidden">
              <div className="bg-[#0F172A] p-6 flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-2">Juegos</h2>
                <div className="flex gap-2">
                  <select 
                    value={selectedPhase} 
                    onChange={(e) => handlePhaseChange(e.target.value)}
                    className="bg-slate-800 text-white text-[10px] font-black rounded-lg px-2 py-1 outline-none border border-slate-700"
                  >
                    {phases.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="NEW" className="text-blue-400 font-bold text-center italic">+ Nueva Fase</option>
                  </select>
                  <select value={selectedRound} onChange={e => setSelectedRound(e.target.value)} className="bg-slate-800 text-white text-[10px] font-black rounded-lg px-2 py-1 outline-none border border-slate-700">
                    {Array.from(new Set(matches.filter(m => (m.phaseName || 'Primera Fase') === selectedPhase).map(m => m.roundName))).sort((a,b) => {
                      const isANum = !isNaN(Number(a));
                      const isBNum = !isNaN(Number(b));
                      if (isANum && isBNum) return Number(a) - Number(b);
                      return a.localeCompare(b);
                    }).map(r => <option key={r} value={r}>{!isNaN(Number(r)) ? `${r}º Fecha` : r}</option>)}
                  </select>
                  <div className="relative group">
                    <button className="bg-orange-600 text-white text-[10px] font-black rounded-lg px-3 py-1 hover:bg-orange-500 transition-all shadow-lg shadow-orange-900/20 flex items-center gap-1">
                      ETAPAS ▾
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-orange-600 rounded-xl shadow-2xl overflow-hidden hidden group-hover:block z-50 animate-in fade-in zoom-in duration-200">
                      <button onClick={handleCreateAdvantagePlayoff} className="w-full text-left px-4 py-3 text-white text-[10px] font-black hover:bg-orange-500 border-b border-orange-500/30 flex items-center gap-2">🎲 SORTEO CUARTOS <span className="bg-white/20 px-1.5 py-0.5 rounded text-[8px]">TOP 8</span></button>
                      <button onClick={() => { setSelectedRound('Cuartos'); handleCreateStage('Cuartos', 4); }} className="w-full text-left px-4 py-3 text-white text-[10px] font-black hover:bg-orange-500 border-b border-orange-500/30">CUARTOS (VACÍO)</button>
                      <button onClick={() => { setSelectedRound('Semi Final'); handleCreateStage('Semi Final', 2); }} className="w-full text-left px-4 py-3 text-white text-[10px] font-black hover:bg-orange-500 border-b border-orange-500/30">SEMI FINAL</button>
                      <button onClick={() => { setSelectedRound('Final'); handleCreateStage('Final', 1); }} className="w-full text-left px-4 py-3 text-white text-[10px] font-black hover:bg-orange-500">FINAL</button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar flex-1 flex flex-col">
                {matches.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-4">
                    <button onClick={() => setShowGenType(true)} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl">Generar Partidos</button>
                    <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">0</div>
                    <button className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl">Agregar Fecha</button>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center mb-4">
                      <button onClick={() => setShowFixtureMenu(true)} className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-black text-xl shadow-lg hover:scale-110 transition-all shadow-blue-100">+</button>
                    </div>
                    {matches.filter(m => (m.phaseName || 'Primera Fase') === selectedPhase && String(m.roundName) === selectedRound).map(m => {
                      const isE = editingMatchData?.id === m.id; const hS = isE ? editingMatchData.homeScore : m.homeScore; const aS = isE ? editingMatchData.awayScore : m.awayScore; const st = isE ? editingMatchData.status : m.status
                      return (
                        <div key={m.id} onClick={() => handleOpenMatchModal(m)} className={`relative flex items-center justify-between p-4 group cursor-pointer transition-all ${isE ? 'scale-[1.02]' : ''}`}>
                          {/* Home Team */}
                          <div className="flex flex-col items-center gap-2 w-24">
                            <div className="w-14 h-14 rounded-xl bg-green-500 flex items-center justify-center text-white text-2xl shadow-lg relative">
                              <span className="absolute -top-2 text-yellow-400 text-sm">👑</span>
                              🏆
                              {m.advantageTeamId === m.homeTeam?.id && <div className="absolute -right-2 -bottom-2 w-6 h-6 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-lg" title="Ventaja deportiva">🛡️</div>}
                            </div>
                            <span className="text-[11px] font-black text-slate-600 text-center uppercase truncate w-full">{m.homeTeam?.name || 'Por definir'}</span>
                          </div>

                          {/* Score Block */}
                          <div className="flex flex-col items-center">
                            <div className="bg-white border border-slate-100 rounded-xl px-6 py-2 shadow-sm flex flex-col items-center min-w-[100px]">
                              <div className="text-2xl font-black text-slate-800 tracking-tighter">
                                {hS !== null && st !== 'NO_REALIZADO' ? `${hS} : ${aS}` : ':'}
                              </div>
                              {st !== 'NO_REALIZADO' && (
                                <div className={`text-[8px] font-black px-3 py-0.5 rounded-md mt-1 uppercase ${st === 'EN_VIVO' ? 'bg-yellow-400 text-slate-900 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                                  {st === 'EN_VIVO' ? 'En Vivo' : 'Finalizado'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Away Team */}
                          <div className="flex flex-col items-center gap-2 w-24">
                            <div className="w-14 h-14 rounded-xl bg-green-500 flex items-center justify-center text-white text-2xl shadow-lg relative">
                              <span className="absolute -top-2 text-yellow-400 text-sm">👑</span>
                              🏆
                              {m.advantageTeamId === m.awayTeam?.id && <div className="absolute -right-2 -bottom-2 w-6 h-6 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-lg" title="Ventaja deportiva">🛡️</div>}
                            </div>
                            <span className="text-[11px] font-black text-slate-600 text-center uppercase truncate w-full">{m.awayTeam?.name || 'Por definir'}</span>
                          </div>

                          {isE && <div className="absolute inset-0 border-2 border-blue-500 rounded-[2rem] pointer-events-none"></div>}
                        </div>
                      )
                    })}
                    <div className="mt-10 pt-10 border-t border-slate-100">
                      <h3 className="bg-[#0F172A] text-white p-4 rounded-t-[1.5rem] text-center font-black text-xs uppercase tracking-widest">Estadísticas de la fecha</h3>
                      <div className="bg-slate-50 rounded-b-[1.5rem] p-6">
                        <RoundStatistics matches={matches.filter(m => (m.phaseName || 'Primera Fase') === selectedPhase && String(m.roundName) === selectedRound)} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] mb-2">Resumen General</div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">🏆 Estadísticas del Torneo</h2>
              </div>
              <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex gap-8">
                <div className="text-center">
                  <div className="text-[9px] font-black text-slate-300 uppercase">Partidos</div>
                  <div className="text-xl font-black text-slate-800">{matches.length}</div>
                </div>
                <div className="text-center">
                  <div className="text-[9px] font-black text-slate-300 uppercase">Goles</div>
                  <div className="text-xl font-black text-slate-800">{matches.reduce((acc, m) => acc + (m.homeScore || 0) + (m.awayScore || 0), 0)}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Scorers */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 border border-slate-50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl">🥅</div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Tabla de Goleadores</h3>
                </div>
                <div className="overflow-hidden rounded-3xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                        <th className="p-4 text-center">Pos</th>
                        <th className="p-4 text-left">Jugador</th>
                        <th className="p-4 text-left">Equipo</th>
                        <th className="p-4 text-center">Goles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {getTopScorers().length === 0 ? (
                        <tr><td colSpan={4} className="p-12 text-center text-slate-300 font-bold italic">No hay goles registrados aún</td></tr>
                      ) : getTopScorers().map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition-all">
                          <td className="p-4 text-center font-black text-slate-400">{i+1}</td>
                          <td className="p-4 font-black text-slate-800">{p.name}</td>
                          <td className="p-4 text-slate-500 font-bold text-xs uppercase">{p.team}</td>
                          <td className="p-4 text-center font-black text-blue-600 text-lg">{p.goals}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Disciplined Players */}
              <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 border border-slate-50">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-2xl">🟨</div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Tabla de Sanciones</h3>
                </div>
                <div className="overflow-hidden rounded-3xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                        <th className="p-4 text-center">Pos</th>
                        <th className="p-4 text-left">Jugador</th>
                        <th className="p-4 text-left">Equipo</th>
                        <th className="p-4 text-center">🟨</th>
                        <th className="p-4 text-center">🟥</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {getTopDisciplined().length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-slate-300 font-bold italic">Sin tarjetas registradas</td></tr>
                      ) : getTopDisciplined().map((p: any, i: number) => (
                        <tr key={i} className="hover:bg-slate-50 transition-all">
                          <td className="p-4 text-center font-black text-slate-400">{i+1}</td>
                          <td className="p-4 font-black text-slate-800">{p.name}</td>
                          <td className="p-4 text-slate-500 font-bold text-xs uppercase">{p.team}</td>
                          <td className="p-4 text-center font-black text-yellow-500 text-lg">{p.yellow}</td>
                          <td className="p-4 text-center font-black text-red-500 text-lg">{p.red}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Global Rankings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-8">
              <RankingCard title="Mejor ataque" label="Goles" data={getTeamRankings().bestAttack} field="gf" />
              <RankingCard title="Mejor defensa" label="Goles" data={getTeamRankings().bestDefense} field="ga" />
              <RankingCard title="Tarjeta roja" label="Ctd" data={getTeamRankings().redCards} field="red" />
              <RankingCard title="Todas las tarjetas" label="Ctd" data={getTeamRankings().totalCards} field="totalCards" />
            </div>
          </div>
        )}
      </div>

      {/* REFINED CENTERED MODAL - ALIGNED TO LEAVE CALENDAR VISIBLE */}
      {showEditResult && editingMatchId && (
        <div className="fixed inset-0 bg-slate-900/10 flex items-center justify-center z-[100] p-4 lg:pr-[480px]">
          <EditResultModal 
            matchId={editingMatchId} 
            onUpdate={d => setEditingMatchData({ id: editingMatchId, ...d })}
            onClose={() => { setShowEditResult(false); setEditingMatchId(null); setEditingMatchData(null); fetchData(); }} 
          />
        </div>
      )}

      {/* Match Quick Menu */}
      {selectedMatch && !showEditResult && (
        <div className="fixed inset-0 bg-slate-900/10 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMatch(null)}>
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-center mb-2 text-slate-900">{selectedMatch.homeTeam.name}</h3>
            <div className="text-center font-black text-slate-300 text-xs mb-2">VS</div>
            <h3 className="text-2xl font-black text-center mb-8 text-slate-900">{selectedMatch.awayTeam.name}</h3>
            <div className="space-y-3">
              <button onClick={() => { setEditingMatchId(selectedMatch.id); setShowEditResult(true); setSelectedMatch(null); }} className="w-full py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"><span>📝</span> EDITAR RESULTADO</button>
              <button onClick={() => setSelectedMatch(null)} className="w-full py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Fixture Type Modal */}
      {showGenType && (
        <div className="fixed inset-0 bg-slate-900/10 flex items-center justify-center z-50 p-4" onClick={() => setShowGenType(false)}>
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-center mb-8 text-slate-900">Configurar Fixture</h3>
            <div className="space-y-3">
              <button onClick={() => handleGenerateMatches('ida')} className="w-full p-5 bg-slate-50 text-slate-800 rounded-2xl font-black hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100">SOLO IDA (Round Robin)</button>
              <button onClick={() => handleGenerateMatches('idayvuelta')} className="w-full p-5 bg-slate-50 text-slate-800 rounded-2xl font-black hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100">IDA Y VUELTA</button>
            </div>
          </div>
        </div>
      )}

      {/* CENTRAL CONFIG MENU */}
      {showConfigMenu && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setShowConfigMenu(false)}>
          <div className="bg-[#0F172A] rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 space-y-1">
              <MenuOption icon="⚽" label="Generar Fixture" onClick={() => { setShowConfigMenu(false); setShowGenType(true); }} />
              <MenuOption icon="👥" label="Equipos" onClick={() => { setShowConfigMenu(false); router.push(`/tournaments/${tournamentId}/add-teams`); }} />
              <MenuOption icon="💠" label="Grupos" onClick={() => { setShowConfigMenu(false); }} />
              <MenuOption icon="💎" label="Fases" onClick={() => { setShowConfigMenu(false); }} />
              <MenuOption icon="📥" label="Exportar" onClick={() => { setShowConfigMenu(false); }} />
              <MenuOption icon="📋" label="Tabla" onClick={() => { setShowConfigMenu(false); }} />
              <MenuOption icon="📑" label="Criterios de clasificación" onClick={() => { setShowConfigMenu(false); }} />
              <MenuOption icon="🔄" label="Reordenar" onClick={() => { setShowConfigMenu(false); }} />
            </div>
            <div className="p-4 bg-slate-800/50">
              <button onClick={() => setShowConfigMenu(false)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-all">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* FIXTURE ACTIONS MENU */}
      {showFixtureMenu && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setShowFixtureMenu(false)}>
          <div className="bg-[#0F172A] rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 space-y-1">
              <MenuOption icon="➕" label="Agregar fecha" onClick={() => setShowFixtureMenu(false)} />
              <MenuOption icon="⚽" label="Agregar partido" onClick={() => { setShowFixtureMenu(false); setShowAddMatchModal(true); }} />
              <MenuOption icon="📝" label="Editar Fecha" onClick={() => setShowFixtureMenu(false)} />
              <MenuOption icon="⇅" label="Reordenar rondas" onClick={() => setShowFixtureMenu(false)} />
              <MenuOption icon="📥" label="Exportar" onClick={() => setShowFixtureMenu(false)} />
            </div>
            <div className="p-4 bg-slate-800/50">
              <button onClick={() => setShowFixtureMenu(false)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-all">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MANUAL ADD MATCH MODAL */}
      {showAddMatchModal && (
        <AddMatchModal 
          teams={tournamentTeams} 
          tournamentId={tournamentId}
          phaseName={selectedPhase}
          onClose={() => setShowAddMatchModal(false)} 
          onSuccess={() => { setShowAddMatchModal(false); fetchData(); }} 
        />
      )}
      {/* MATCH ACTIONS MENU */}
      {showMatchMenu && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-[110] p-4" onClick={() => setShowMatchMenu(false)}>
          <div className="bg-[#0F172A] rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-4 space-y-1">
              <MenuOption icon="📖" label="Ver partido" onClick={() => setShowMatchMenu(false)} />
              <MenuOption icon="📋" label="Seleccionar equipos" onClick={() => setShowMatchMenu(false)} />
              <MenuOption icon="✔️" label="Editar resultado" onClick={() => { 
                const m = matches.find(x => x.id === selectedMatchId);
                if (m) {
                  setEditingMatchData({ id: m.id, homeScore: m.homeScore, awayScore: m.awayScore, status: m.status });
                  setEditingMatchId(m.id);
                  setShowEditResult(true);
                }
                setShowMatchMenu(false);
              }} />
              <MenuOption icon="✏️" label="Editar informacion" onClick={() => setShowMatchMenu(false)} />
              
              <div className="h-px bg-slate-800 my-2 mx-4"></div>
              
              <MenuOption icon="🔄" label="Restaurar" color="text-red-400" onClick={() => setShowMatchMenu(false)} />
              <MenuOption icon="✕" label="Quitar" color="text-red-500" onClick={() => { if (selectedMatchId) handleRemoveMatch(selectedMatchId); }} />
            </div>
            <div className="p-4 bg-slate-800/50 text-center">
              <button onClick={() => setShowMatchMenu(false)} className="w-full py-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] hover:text-white transition-all">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
    {showPlayoffDraw && (
      <PlayoffDrawModal
        tournamentId={tournamentId}
        phaseName={selectedPhase}
        matches={matches}
        tournamentTeams={tournamentTeams}
        onClose={() => setShowPlayoffDraw(false)}
        onSuccess={() => { setShowPlayoffDraw(false); setSelectedRound('Cuartos'); fetchData(); }}
      />
    )}
    </>
  )
}

function PlayoffDrawModal({ tournamentId, phaseName, matches, tournamentTeams, onClose, onSuccess }: any) {
  const [withAdvantage, setWithAdvantage] = useState(true)
  const [drawResult, setDrawResult] = useState<{ home: any; away: any; advantage: string | null }[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'pots' | 'draw' | 'confirm'>('pots')

  // Calculate standings from completed matches
  const stats: Record<string, any> = {}
  tournamentTeams.forEach((tt: any) => {
    stats[tt.team.id] = { id: tt.team.id, name: tt.team.name, points: 0, gf: 0, ga: 0, played: 0, won: 0, drawn: 0, lost: 0 }
  })
  matches.filter((m: any) => m.status === 'FINALIZADO' || m.status === 'COMPLETED').forEach((m: any) => {
    if (!m.homeTeam || !m.awayTeam) return
    if (m.homeScore === null || m.awayScore === null) return
    const h = stats[m.homeTeam.id]
    const a = stats[m.awayTeam.id]
    if (!h || !a) return
    h.played++; a.played++
    h.gf += m.homeScore; h.ga += m.awayScore
    a.gf += m.awayScore; a.ga += m.homeScore
    if (m.homeScore > m.awayScore) { h.points += 3; h.won++; a.lost++ }
    else if (m.homeScore < m.awayScore) { a.points += 3; a.won++; h.lost++ }
    else { h.points++; a.points++; h.drawn++; a.drawn++ }
  })

  const standings = Object.values(stats).sort((a: any, b: any) =>
    b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  )

  const pot1 = standings.slice(0, 4)
  const pot2 = standings.slice(4, 8)

  const handleDraw = () => {
    const shuffledPot2 = [...pot2].sort(() => Math.random() - 0.5)
    const result = pot1.map((team: any, i: number) => ({
      home: team,
      away: shuffledPot2[i],
      advantage: withAdvantage ? team.id : null
    }))
    setDrawResult(result)
    setStep('draw')
  }

  const handleConfirm = async () => {
    if (!drawResult) return
    setLoading(true)
    const token = localStorage.getItem('token')

    // Delete existing Cuartos matches in this phase first
    await fetch(`/api/tournaments/${tournamentId}/matches?action=deleteStage&stageName=Cuartos&phaseName=${encodeURIComponent(phaseName)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })

    // Create the 4 quarter-final matches
    for (const match of drawResult) {
      await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          homeTeamId: match.home.id,
          awayTeamId: match.away.id,
          matchDate: new Date().toISOString(),
          roundName: 'Cuartos',
          phaseName,
          advantageTeamId: match.advantage,
        }),
      })
    }
    setLoading(false)
    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in fade-in duration-300" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="bg-slate-900 p-6 flex items-center justify-between">
          <div>
            <div className="text-orange-400 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Fase Final</div>
            <h2 className="text-2xl font-black text-white">🎲 Sorteo de Cuartos de Final</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white font-black text-2xl transition-all">✕</button>
        </div>

        <div className="p-8">
          {step === 'pots' && (
            <>
              {standings.length < 8 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⚠️</div>
                  <p className="font-black text-slate-700">Se necesitan al menos 8 equipos con resultados</p>
                  <p className="text-slate-400 text-sm mt-2">Actualmente hay {standings.length} equipos con partidos jugados</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-6 mb-8">
                    {/* Pot 1 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-black">1</div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bombo 1 — Cabezas de Serie</span>
                      </div>
                      <div className="space-y-2">
                        {pot1.map((t: any, i: number) => (
                          <div key={t.id} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
                            <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-[11px] font-black">{i + 1}</div>
                            <span className="font-black text-slate-800 text-sm flex-1">{t.name}</span>
                            <span className="text-orange-600 font-black text-sm">{t.points}pts</span>
                            {withAdvantage && <span title="Tiene ventaja deportiva" className="text-blue-500">🛡️</span>}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pot 2 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-slate-600 rounded-full flex items-center justify-center text-white text-[10px] font-black">2</div>
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Bombo 2</span>
                      </div>
                      <div className="space-y-2">
                        {pot2.map((t: any, i: number) => (
                          <div key={t.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3">
                            <div className="w-7 h-7 bg-slate-600 text-white rounded-full flex items-center justify-center text-[11px] font-black">{i + 5}</div>
                            <span className="font-black text-slate-800 text-sm flex-1">{t.name}</span>
                            <span className="text-slate-500 font-black text-sm">{t.points}pts</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Advantage toggle */}
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center justify-between mb-6">
                    <div>
                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">🛡️ Ventaja Deportiva</div>
                      <div className="text-slate-500 text-xs mt-0.5">Los equipos del Bombo 1 clasifican con empate</div>
                    </div>
                    <button
                      onClick={() => setWithAdvantage(!withAdvantage)}
                      className={`w-12 h-6 rounded-full transition-all duration-300 relative ${withAdvantage ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all duration-300 shadow ${withAdvantage ? 'left-6' : 'left-0.5'}`} />
                    </button>
                  </div>

                  <button
                    onClick={handleDraw}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-400 text-white font-black rounded-2xl text-sm uppercase tracking-[0.2em] transition-all shadow-lg shadow-orange-200 flex items-center justify-center gap-3"
                  >
                    🎲 REALIZAR SORTEO ALEATORIO
                  </button>
                </>
              )}
            </>
          )}

          {step === 'draw' && drawResult && (
            <>
              <div className="text-center mb-6">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Resultado del Sorteo</div>
                <h3 className="text-xl font-black text-slate-900 mt-1">Cuartos de Final</h3>
              </div>
              <div className="space-y-3 mb-8">
                {drawResult.map((match, i) => (
                  <div key={i} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest text-center mb-3">Partido {i + 1}</div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 text-right">
                        <span className="font-black text-slate-800 text-sm">{match.home.name}</span>
                        {match.advantage === match.home.id && <span className="ml-1" title="Ventaja deportiva">🛡️</span>}
                        <div className="text-[9px] text-orange-500 font-black uppercase">Bombo 1 · {match.home.points}pts</div>
                      </div>
                      <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white font-black text-xs flex-shrink-0">VS</div>
                      <div className="flex-1">
                        <span className="font-black text-slate-800 text-sm">{match.away.name}</span>
                        <div className="text-[9px] text-slate-400 font-black uppercase">Bombo 2 · {match.away.points}pts</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {withAdvantage && (
                <div className="bg-blue-50 rounded-2xl p-3 text-center text-xs text-blue-700 font-bold mb-6">
                  🛡️ Los equipos del Bombo 1 tienen <b>Ventaja Deportiva</b> — clasifican con empate
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setStep('pots')} className="py-3 bg-slate-100 text-slate-700 font-black rounded-2xl text-xs hover:bg-slate-200 transition-all">
                  ↩ Volver a sortear
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  className="py-3 bg-slate-900 text-white font-black rounded-2xl text-xs hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : '✅ CONFIRMAR CUADRO'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function AddMatchModal({ teams, tournamentId, onClose, onSuccess, ...props }: any) {
  const [homeId, setHomeId] = useState('')
  const [awayId, setAwayId] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [round, setRound] = useState('1')
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!homeId || !awayId || homeId === awayId) return alert('Selecciona equipos distintos')
    setLoading(true)
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeTeamId: homeId, awayTeamId: awayId, matchDate: date, roundName: round, phaseName: props.phaseName }),
    })
    if (res.ok) onSuccess(); else alert('Error al crear')
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[120] p-4" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl font-black text-slate-900 mb-8 text-center uppercase tracking-tight">Agregar Partido</h3>
        <div className="space-y-6">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Equipo Local</label>
            <select value={homeId} onChange={e => setHomeId(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border border-slate-100 focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="">Seleccionar...</option>
              {teams.map((t: any) => <option key={t.id} value={t.team.id}>{t.team.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Equipo Visitante</label>
            <select value={awayId} onChange={e => setAwayId(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border border-slate-100 focus:ring-2 focus:ring-blue-500 transition-all">
              <option value="">Seleccionar...</option>
              {teams.map((t: any) => <option key={t.id} value={t.team.id}>{t.team.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Fecha</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border border-slate-100 transition-all" />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nº Fecha</label>
              <input type="text" value={round} onChange={e => setRound(e.target.value)} placeholder="Ej: 1" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-700 outline-none border border-slate-100 transition-all" />
            </div>
          </div>
          <div className="pt-4 flex gap-3">
            <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all uppercase tracking-widest disabled:opacity-50">
              {loading ? 'Guardando...' : 'Crear Partido'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MenuOption({ icon, label, onClick, color = "text-white" }: { icon: string, label: string, onClick: () => void, color?: string }) {
  return (
    <button 
      onClick={onClick}
      className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-800 transition-all rounded-[1.5rem] group text-left"
    >
      <span className={`text-xl group-hover:scale-125 transition-transform ${color}`}>{icon}</span>
      <span className={`font-bold text-sm tracking-tight ${color}`}>{label}</span>
    </button>
  )
}

function EditResultModal({ matchId, onClose, onUpdate }: { matchId: string, onClose: () => void, onUpdate: (d: any) => void }) {
  const [match, setMatch] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [st, setSt] = useState('NO_REALIZADO')
  
  const [hG, setHG] = useState<any[]>([]); const [aG, setAG] = useState<any[]>([])
  const [hC, setHC] = useState<any[]>([]); const [aC, setAC] = useState<any[]>([])
  const [hF, setHF] = useState<any[]>([]); const [aF, setAF] = useState<any[]>([])
  const [hS, setHS] = useState<any[]>([]); const [aS, setAS] = useState<any[]>([])
  const [hO, setHO] = useState<any[]>([]); const [aO, setAO] = useState<any[]>([])
  const [hK, setHK] = useState<any[]>([]); const [aK, setAK] = useState<any[]>([])
  const [hHi, setHHi] = useState<any[]>([]); const [aHi, setAHi] = useState<any[]>([])
  const [hL, setHL] = useState<any[]>([]); const [aL, setAL] = useState<any[]>([])

  useEffect(() => { fetchMatch() }, [matchId])
  useEffect(() => { if (match) onUpdate({ homeScore: hG.length, awayScore: aG.length, status: st }) }, [hG.length, aG.length, st])

  const fetchMatch = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/matches/${matchId}`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setMatch(data); setSt(data.status || 'NO_REALIZADO')
    const parse = (tId: string, type: any) => (data.events || []).filter((e: any) => e.teamId === tId && (Array.isArray(type) ? type.includes(e.type) : e.type === type)).map((e: any) => ({ ...e, minutes: e.minute || 0, timeType: e.timeType || '1°', detail: e.detail || '', x: e.detail && e.type === 'LINEUP' ? JSON.parse(e.detail).x : 0, y: e.detail && e.type === 'LINEUP' ? JSON.parse(e.detail).y : 0 }))
    const [hM, aM] = await Promise.all([fetch(`/api/teams/${data.homeTeam.id}/members`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()), fetch(`/api/teams/${data.awayTeam.id}/members`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())])
    setHG(parse(data.homeTeam.id, 'GOAL')); setHC(parse(data.homeTeam.id, ['YELLOW_CARD', 'RED_CARD', 'DOUBLE_YELLOW_CARD'])); setHF(parse(data.homeTeam.id, 'FOUL')); setHS(parse(data.homeTeam.id, 'SUBSTITUTION')); setHO(parse(data.homeTeam.id, 'OWN_GOAL')); setHK(parse(data.homeTeam.id, 'GOALKEEPER')); setHHi(parse(data.homeTeam.id, 'HIGHLIGHT')); setHL(parse(data.homeTeam.id, 'LINEUP'))
    setAG(parse(data.awayTeam.id, 'GOAL')); setAC(parse(data.awayTeam.id, ['YELLOW_CARD', 'RED_CARD', 'DOUBLE_YELLOW_CARD'])); setAF(parse(data.awayTeam.id, 'FOUL')); setAS(parse(data.awayTeam.id, 'SUBSTITUTION')); setAO(parse(data.awayTeam.id, 'OWN_GOAL')); setAK(parse(data.awayTeam.id, 'GOALKEEPER')); setAHi(parse(data.awayTeam.id, 'HIGHLIGHT')); setAL(parse(data.awayTeam.id, 'LINEUP'))
    setMatch((p: any) => ({ ...p, homeTeam: { ...p.homeTeam, players: hM }, awayTeam: { ...p.awayTeam, players: aM } }))
    setLoading(false)
  }

  const handleSave = async () => {
    const token = localStorage.getItem('token')
    const serialize = (evs: any[], tId: string) => evs.map(e => ({
      teamId: tId, playerId: e.playerId || null, assistId: e.assistId || null,
      type: e.type, minute: parseInt(e.minutes as any) || 0, second: 0,
      timeType: e.timeType || '1°', detail: e.type === 'LINEUP' ? JSON.stringify({ x: e.x, y: e.y }) : (e.detail || '')
    }))
    const isNR = st === 'NO_REALIZADO'
    const all = isNR ? [] : [
      ...serialize(hG, match.homeTeam.id), ...serialize(aG, match.awayTeam.id),
      ...serialize(hC, match.homeTeam.id), ...serialize(aC, match.awayTeam.id),
      ...serialize(hF, match.homeTeam.id), ...serialize(aF, match.awayTeam.id),
      ...serialize(hS, match.homeTeam.id), ...serialize(aS, match.awayTeam.id),
      ...serialize(hO, match.homeTeam.id), ...serialize(aO, match.awayTeam.id),
      ...serialize(hK, match.homeTeam.id), ...serialize(aK, match.awayTeam.id),
      ...serialize(hHi, match.homeTeam.id), ...serialize(aHi, match.awayTeam.id),
      ...serialize(hL, match.homeTeam.id), ...serialize(aL, match.awayTeam.id),
    ].filter(e => e.type)

    const res = await fetch(`/api/matches/${matchId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: st, homeScore: isNR ? null : hG.length, awayScore: isNR ? null : aG.length, events: all })
    })
    if (res.ok) onClose(); else alert('Error al guardar')
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden animate-in zoom-in-95 duration-500">
      {/* Slim Header */}
      <div className="bg-slate-900 px-8 py-5 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black tracking-tight">{match.homeTeam.name} <span className="text-blue-400 mx-2">{hG.length} : {aG.length}</span> {match.awayTeam.name}</h2>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado:</span>
            <select value={st} onChange={e => setSt(e.target.value)} className="bg-slate-800 text-[10px] font-black rounded-xl px-4 py-2 outline-none border border-slate-700 hover:border-blue-500 transition-all">
              <option value="NO_REALIZADO">NO REALIZADO</option><option value="EN_VIVO">EN VIVO</option><option value="FINALIZADO">FINALIZADO</option>
            </select>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center hover:bg-red-500 transition-all text-sm font-black shadow-lg">✕</button>
        </div>
      </div>

      {/* Main Body - Row for Each Team */}
      <div className="flex-1 overflow-y-auto px-8 pt-5 pb-4 bg-[#FDFDFD] space-y-4 custom-scrollbar">
        <TeamRowSection team={match.homeTeam} goals={hG} setGoals={setHG} cards={hC} setCards={setHC} fouls={hF} setFouls={setHF} subs={hS} setSubs={setHS} own={hO} setOwn={setHO} gk={hK} setGk={setHK} hi={hHi} setHi={setHHi} lin={hL} setLin={setHL} color="blue" />
        <div className="flex items-center gap-4">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">vs</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>
        <TeamRowSection team={match.awayTeam} goals={aG} setGoals={setAG} cards={aC} setCards={setAC} fouls={aF} setFouls={setAF} subs={aS} setSubs={setAS} own={aO} setOwn={setAO} gk={aK} setGk={setAK} hi={aHi} setHi={setAHi} lin={aL} setLin={setAL} color="red" />
      </div>

      {/* Action Footer */}
      <div className="px-10 py-6 border-t border-slate-50 bg-white flex gap-4 shadow-[0_-20px_40px_rgba(0,0,0,0.02)]">
        <button onClick={onClose} className="flex-1 py-4 border-2 border-slate-100 rounded-2xl font-black text-xs text-slate-400 uppercase tracking-widest hover:bg-slate-50 transition-all">Cancelar</button>
        <button onClick={handleSave} className="flex-[4] py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-2xl shadow-blue-200 uppercase tracking-[0.2em] transition-all active:scale-[0.98]">Guardar Resultado Oficial</button>
      </div>
    </div>
  )
}

function TeamRowSection({ team, goals, setGoals, cards, setCards, fouls, setFouls, subs, setSubs, own, setOwn, gk, setGk, hi, setHi, lin, setLin, color }: any) {
  const [tab, setTab] = useState('goles')
  const tabs = [
    { id: 'goles', label: 'Goles', i: '🥅' },
    { id: 'tarjetas', label: 'Tarjetas', i: '🟨' },
    { id: 'faltas', label: 'Faltas', i: '⚠️' },
    { id: 'subs', label: 'Cambios', i: '🔄' },
    { id: 'otros', label: 'Otros', i: '✨' },
    { id: 'alineacion', label: 'Cancha', i: '⚽' },
  ]
  
  return (
    <div className="flex gap-5">
      {/* Left: Info & Tabs */}
      <div className="flex-1 min-w-0">
        {/* Team header - compact */}
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg shadow-md ${color === 'blue' ? 'bg-blue-600' : 'bg-red-600'}`}>{goals.length}</div>
          <div>
            <h3 className="font-black text-base text-slate-800 leading-tight">{team.name.toUpperCase()}</h3>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{goals.length} {goals.length === 1 ? 'gol' : 'goles'} registrados</div>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-1 bg-slate-50 p-1 rounded-2xl mb-3 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-shrink-0 px-3 py-1.5 rounded-xl font-black text-[9px] uppercase transition-all ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
              {t.i} {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="min-h-[180px]">
          {tab === 'goles' && <RowFormSection title="⚽ Goles anotados" evs={goals} setEvs={setGoals} players={team.players || []} color={color} assist={true} type="GOAL" pLabel="Goleador" aLabel="Asistente" />}
          {tab === 'tarjetas' && <RowFormSection title="🟨 Tarjetas disciplinarias" evs={cards} setEvs={setCards} players={team.players || []} color={color} isType={true} type="YELLOW_CARD" opts={[
            { v: 'YELLOW_CARD',        label: '🟨 Amarilla',            hint: '1ª falta' },
            { v: 'DOUBLE_YELLOW_CARD', label: '🟨🟥 2ª Amarilla → Expulsado', hint: 'Acumulación' },
            { v: 'RED_CARD',           label: '🟥 Roja Directa',       hint: 'Expulsión inmediata' },
          ]} />}
          {tab === 'faltas' && <RowFormSection title="⚠️ Faltas cometidas" evs={fouls} setEvs={setFouls} players={team.players || []} color={color} detail={true} type="FOUL" pLabel="Infractor" />}
          {tab === 'subs' && <RowFormSection title="🔄 Sustituciones" evs={subs} setEvs={setSubs} players={team.players || []} color={color} assist={true} pLabel="Entra al campo" aLabel="Sale del campo" type="SUBSTITUTION" />}
          {tab === 'otros' && (
            <div className="space-y-4">
              <RowFormSection title="⚽ Autogoles" evs={own} setEvs={setOwn} players={team.players || []} color={color} detail={true} type="OWN_GOAL" pLabel="Jugador" />
              <RowFormSection title="🧤 Acciones del Portero" evs={gk} setEvs={setGk} players={team.players || []} color={color} detail={true} type="GOALKEEPER" pLabel="Portero" />
            </div>
          )}
          {tab === 'alineacion' && (
            <div className="bg-slate-50 rounded-2xl p-3 text-center">
              <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">La cancha táctica aparece a la derecha →</div>
              <div className="text-slate-300 text-xs">Haz clic sobre la cancha para colocar jugadores</div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Small Pitch */}
      <div className="w-72 shrink-0">
        <div className="bg-slate-900 p-3 rounded-[2rem] shadow-xl overflow-hidden">
          <div className="text-[8px] font-black text-slate-500 uppercase tracking-widest text-center mb-1.5">⚽ Cancha Táctica — clic para añadir</div>
          <PitchV6 lin={lin} setLin={setLin} players={team.players || []} color={color} />
        </div>
      </div>
    </div>
  )
}

function RowFormSection({ title, evs, setEvs, players, color, assist, aLabel = 'Asistente', pLabel = 'Jugador', isType, opts, detail, type }: any) {
  const add = () => setEvs([...evs, { id: Date.now().toString(), playerId: '', assistId: '', type, minutes: 0, timeType: '1°', detail: '' }])
  const up = (id: string, f: string, v: any) => setEvs(evs.map((e: any) => e.id === id ? { ...e, [f]: v } : e))
  const rm = (id: string) => setEvs(evs.filter((e: any) => e.id !== id))
  return (
    <div className="animate-in fade-in zoom-in-95 duration-300">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-[10px] font-black text-slate-500 tracking-wide">{title}</h4>
        <button onClick={add} className={`text-[9px] font-black px-3 py-1.5 rounded-xl text-white transition-all active:scale-95 shadow-sm ${color === 'blue' ? 'bg-blue-600' : 'bg-red-600'}`}>+ Añadir</button>
      </div>

      <div className="space-y-2">
        {evs.map((e: any) => (
          <div key={e.id} className="bg-slate-50 rounded-2xl relative group border border-transparent hover:border-slate-200 transition-all overflow-hidden">
            <button onClick={() => rm(e.id)} className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition text-xs z-10">✕</button>

            {/* Main row: time + player (+ assist) all inline */}
            <div className="flex items-center gap-2 p-2 pr-8">
              {/* Time block */}
              <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-1 shadow-sm shrink-0 border border-slate-100">
                <div className="flex items-baseline gap-0.5">
                  <input type="number" min={0} max={120} value={e.minutes} onChange={v => up(e.id, 'minutes', v.target.value)} className="w-10 bg-transparent border-none text-xl font-black p-0 text-center outline-none text-slate-800" placeholder="0" />
                  <span className="text-xs font-black text-slate-400">'</span>
                </div>
                <select value={e.timeType} onChange={v => up(e.id, 'timeType', v.target.value)} className="bg-transparent border-none text-[9px] font-bold p-0 outline-none text-slate-400 uppercase tracking-widest cursor-pointer hover:text-slate-600 transition-colors">
                  <option value="1°">1°T</option>
                  <option value="2°">2°T</option>
                </select>
              </div>

              {/* Player + Assist */}
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-[8px] font-black text-slate-400 w-16 shrink-0 uppercase tracking-wider">{pLabel}</span>
                  <select value={e.playerId} onChange={v => up(e.id, 'playerId', v.target.value)} className="flex-1 bg-white border-none rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm outline-none text-slate-700">
                    <option value="">Seleccionar...</option>
                    {players.map((p: any) => <option key={p.id} value={p.id}>{p.number ? `#${p.number} ` : ''}{p.name}</option>)}
                  </select>
                </div>
                {assist && (
                  <div className="flex items-center gap-1">
                    <span className="text-[8px] font-black text-slate-400 w-16 shrink-0 uppercase tracking-wider">{aLabel}</span>
                    <select value={e.assistId} onChange={v => up(e.id, 'assistId', v.target.value)} className="flex-1 bg-white border-none rounded-xl px-3 py-1.5 text-xs font-bold shadow-sm outline-none text-slate-700">
                      <option value="">Ninguno</option>
                      {players.map((p: any) => <option key={p.id} value={p.id}>{p.number ? `#${p.number} ` : ''}{p.name}</option>)}
                    </select>
                  </div>
                )}
                {detail && (
                  <input type="text" value={e.detail} onChange={v => up(e.id, 'detail', v.target.value)}
                    className="w-full bg-white border-none rounded-xl px-3 py-1.5 text-[10px] font-bold shadow-sm outline-none text-slate-600" placeholder="Descripción opcional..." />
                )}
              </div>
            </div>

            {/* Card type selector - full descriptive */}
            {isType && (
              <div className="px-2 pb-2">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Tipo de tarjeta</div>
                <div className="flex flex-col gap-1">
                  {opts.map((o: any) => (
                    <button key={o.v} onClick={() => up(e.id, 'type', o.v)}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black transition-all text-left ${
                        e.type === o.v ? 'bg-slate-800 text-white shadow-md' : 'bg-white border border-slate-100 text-slate-500 hover:border-slate-300'
                      }`}>
                      <span>{o.label}</span>
                      {o.hint && <span className={`text-[8px] font-bold uppercase tracking-widest ${e.type === o.v ? 'text-slate-400' : 'text-slate-300'}`}>{o.hint}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      {evs.length === 0 && (
        <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-2xl">
          <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest italic">Sin eventos registrados</div>
          <div className="text-[8px] text-slate-200 mt-1">Usa el botón Añadir para registrar</div>
        </div>
      )}
    </div>
  )
}

function PitchV6({ lin, setLin, players, color }: any) {
  const add = (e: any) => { if (e.target.closest('.pn')) return; const rect = e.currentTarget.getBoundingClientRect(); setLin([...lin, { id: Date.now().toString(), playerId: '', type: 'LINEUP', x: (e.clientX - rect.left) / rect.width * 100, y: (e.clientY - rect.top) / rect.height * 100 }]) }
  const up = (id: string, pid: string) => setLin(lin.map((p: any) => p.id === id ? { ...p, playerId: pid } : p))
  const rm = (id: string) => setLin(lin.filter((p: any) => p.id !== id))
  return (
    <div className="relative aspect-[4/3] bg-green-700 rounded-[1.5rem] overflow-hidden cursor-crosshair border-2 border-white/10 shadow-inner" onClick={add} style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '10% 10%' }}>
      <div className="absolute inset-0 pointer-events-none opacity-20"><div className="absolute top-0 bottom-0 left-1/2 w-px bg-white"></div><div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-white rounded-full"></div></div>
      {lin.map((p: any) => (
        <div key={p.id} className="pn absolute -translate-x-1/2 -translate-y-1/2 group/pn z-10" style={{ left: `${p.x}%`, top: `${p.y}%` }}>
          <div className={`w-8 h-8 rounded-full bg-white shadow-2xl flex items-center justify-center border-2 ${color === 'blue' ? 'border-blue-600' : 'border-red-600'} transition-all group-hover/pn:scale-125`}><span className={`text-[9px] font-black ${color === 'blue' ? 'text-blue-600' : 'text-red-600'}`}>{players.find((pl: any) => pl.id === p.playerId)?.number || '?'}</span></div>
          <div className="absolute top-full mt-1 left-1/2 -translate-x-1/2 scale-0 group-hover/pn:scale-100 transition origin-top z-20"><select value={p.playerId} onChange={v => up(p.id, v.target.value)} className="bg-slate-800 text-white rounded-lg p-1 text-[7px] font-black uppercase outline-none shadow-2xl"><option value="">...</option>{players.map((pl: any) => <option key={pl.id} value={pl.id}>{pl.name}</option>)}</select></div>
          <button onClick={() => rm(p.id)} className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 text-white rounded-lg text-[8px] scale-0 group-hover/pn:scale-100 flex items-center justify-center shadow-lg transition-all">✕</button>
        </div>
      ))}
    </div>
  )
}

function RankingCard({ title, label, data, field }: any) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
      <div className="bg-[#4CAF50] p-4 text-center">
        <h3 className="text-white font-black uppercase tracking-widest text-sm">{title}</h3>
      </div>
      <div className="p-0">
        <table className="w-full">
          <thead className="bg-[#4CAF50]/10 text-[10px] font-black text-[#4CAF50] uppercase tracking-widest">
            <tr>
              <th className="px-6 py-3 text-left">Equipos</th>
              <th className="px-6 py-3 text-right">{label}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {data.length === 0 ? (
              <tr>
                <td colSpan={2} className="px-6 py-10 text-center text-slate-300 font-bold italic text-xs uppercase tracking-widest">Aún no hay datos</td>
              </tr>
            ) : (
              data.map((item: any, idx: number) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-black text-slate-400">#{idx + 1}</span>
                      <span className="font-bold text-slate-700">{item.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center justify-center w-10 h-10 bg-slate-100 rounded-xl font-black text-slate-900">{item[field]}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function getSportIcon(sportType: string): string {
  const icons: Record<string, string> = { FUTBOL_11: '⚽', FUTSAL: '⚽', FUTBOL_7: '⚽', FUTBOL_SALA: '⚽' }
  return icons[sportType] || '🏆'
}

function RoundStatistics({ matches }: { matches: any[] }) {
  const stats = {
    matches: matches.length,
    goals: 0,
    scorers: {} as Record<string, { name: string; team: string; goals: number }>,
    yellowCards: {} as Record<string, { name: string; team: string; count: number }>,
    redCards: {} as Record<string, { name: string; team: string; count: number }>,
  }

  matches.forEach(m => {
    const hS = m.homeScore
    const aS = m.awayScore
    if (hS !== null) stats.goals += hS
    if (aS !== null) stats.goals += aS
    
    m.events?.forEach((e: any) => {
      const pName = e.player?.name || 'Desconocido'
      const tName = e.team?.name || ''
      if (e.type === 'GOAL') {
        if (!stats.scorers[pName]) stats.scorers[pName] = { name: pName, team: tName, goals: 0 }
        stats.scorers[pName].goals++
      } else if (e.type === 'YELLOW_CARD') {
        if (!stats.yellowCards[pName]) stats.yellowCards[pName] = { name: pName, team: tName, count: 0 }
        stats.yellowCards[pName].count++
      } else if (e.type === 'RED_CARD') {
        if (!stats.redCards[pName]) stats.redCards[pName] = { name: pName, team: tName, count: 0 }
        stats.redCards[pName].count++
      }
    })
  })

  const topScorers = Object.values(stats.scorers).sort((a, b) => b.goals - a.goals).slice(0, 5)
  const topYellows = Object.values(stats.yellowCards).sort((a, b) => b.count - a.count).slice(0, 5)

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-2xl text-center shadow-sm border border-slate-100">
          <div className="text-[10px] font-black text-slate-300 uppercase mb-1">Juegos</div>
          <div className="text-2xl font-black text-slate-800">{stats.matches}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl text-center shadow-sm border border-slate-100">
          <div className="text-[10px] font-black text-slate-300 uppercase mb-1">Goles</div>
          <div className="text-2xl font-black text-slate-800">{stats.goals}</div>
        </div>
      </div>

      <section>
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 text-white p-3 text-center text-[10px] font-black uppercase tracking-widest">Goles</div>
          <div className="divide-y divide-slate-50">
            {topScorers.length === 0 ? <div className="p-4 text-center text-[10px] text-slate-300 font-black italic">Sin datos</div> : topScorers.map(s => (
              <div key={s.name} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">👤</div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-700 uppercase">{s.name}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{s.team}</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-900">{s.goals}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          <div className="bg-slate-900 text-white p-3 text-center text-[10px] font-black uppercase tracking-widest">Tarjeta Amarilla</div>
          <div className="divide-y divide-slate-50">
            {topYellows.length === 0 ? <div className="p-4 text-center text-[10px] text-slate-300 font-black italic">Sin datos</div> : topYellows.map(s => (
              <div key={s.name} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center text-[10px]">👤</div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-700 uppercase">{s.name}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{s.team}</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-900">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}


function BracketColumn({ title, matches }: { title: string, matches: any[] }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center">
        <h4 className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mb-4">{title}</h4>
      </div>
      <div className="flex flex-col gap-10 flex-1 justify-around">
        {matches.length === 0 ? (
          <div className="border-2 border-dashed border-slate-50 rounded-3xl p-8 text-center text-[10px] font-black text-slate-200 uppercase tracking-widest">Esperando cruces</div>
        ) : (
          matches.map(m => <BracketMatch key={m.id} match={m} />)
        )}
      </div>
    </div>
  )
}

function BracketMatch({ match }: { match: any }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 shadow-sm hover:shadow-md transition-all">
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-black text-slate-700 truncate w-24 uppercase flex items-center gap-1">
            {match.homeTeam?.name || 'POR DEFINIR'}
            {match.advantageTeamId === match.homeTeam?.id && <span title="Ventaja deportiva">🛡️</span>}
          </span>
          <span className="bg-white px-2 py-1 rounded-lg font-black text-xs text-slate-900 border border-slate-100">{match.homeScore ?? '-'}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-[11px] font-black text-slate-700 truncate w-24 uppercase flex items-center gap-1">
            {match.awayTeam?.name || 'POR DEFINIR'}
            {match.advantageTeamId === match.awayTeam?.id && <span title="Ventaja deportiva">🛡️</span>}
          </span>
          <span className="bg-white px-2 py-1 rounded-lg font-black text-xs text-slate-900 border border-slate-100">{match.awayScore ?? '-'}</span>
        </div>
      </div>
    </div>
  )
}