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
  homePlaceholder?: string | null
  awayPlaceholder?: string | null
  groupName?: string | null
  notes?: string | null
  homePenaltyScore?: number | null
  awayPenaltyScore?: number | null
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
  const [phases, setPhases] = useState<any[]>([])
  const firstPhaseName = phases.length > 0 ? phases[0].name : 'Primera Fase';
  const [matchType, setMatchType] = useState<'ida' | 'idayvuelta'>('ida')

  // Fases Modals State
  const [showPhasesList, setShowPhasesList] = useState(false)
  const [showPhaseType, setShowPhaseType] = useState(false)
  const [showEditPhase, setShowEditPhase] = useState(false)
  const [editPhaseData, setEditPhaseData] = useState<{ name: string, type: string, order: number, isClassification: boolean, continueFromId: string | null }>({ name: '', type: 'LIGA', order: 0, isClassification: true, continueFromId: null })
  const [showPhaseTeams, setShowPhaseTeams] = useState(false)
  const [showPhaseContinue, setShowPhaseContinue] = useState(false)

  // Knockout Modals State
  const [showKnockoutSource, setShowKnockoutSource] = useState(false)
  const [showKnockoutTeamCount, setShowKnockoutTeamCount] = useState(false)
  const [showKnockoutTeamSelection, setShowKnockoutTeamSelection] = useState(false)
  const [knockoutTeamCount, setKnockoutTeamCount] = useState(8)
  const [selectedKnockoutTeams, setSelectedKnockoutTeams] = useState<any[]>([])
  
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
        const [matchesRes, teamsRes, allTeamsRes, phasesRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}/matches`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/tournaments/${tournamentId}/teams`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/teams', { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/tournaments/${tournamentId}/phases`, { headers: { Authorization: `Bearer ${token}` } }),
        ])
        
        if (phasesRes && phasesRes.ok) {
          const pData = await phasesRes.json()
          setPhases(pData)
          if (pData.length > 0 && !pData.some((p: any) => p.name === selectedPhase)) {
            setSelectedPhase(pData[0].name)
          }
        }

        if (matchesRes.ok) {
          const m = await matchesRes.json()
          setMatches(m)
          const phaseRounds = [...new Set(m.filter((x: any) => (x.phaseName || firstPhaseName) === selectedPhase).map((x: any) => String(x.roundName)))].sort((a: any, b: any) => {
            const isANum = !isNaN(Number(a));
            const isBNum = !isNaN(Number(b));
            if (isANum && isBNum) return Number(a) - Number(b);
            const order: any = { 'cuartos de final': 1, 'semifinal': 2, 'final': 3 };
            const aO = order[a.toLowerCase()] || 99;
            const bO = order[b.toLowerCase()] || 99;
            if (aO !== bO) return aO - bO;
            return a.localeCompare(b);
          }) as string[]
          if (phaseRounds.length > 0 && (!selectedRound || !phaseRounds.includes(selectedRound))) {
            setSelectedRound(phaseRounds[0])
          }
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



  const handleGenerateMatches = async (type: 'ida' | 'idayvuelta') => {
    if (tournamentTeams.length === 0) return alert('Debes agregar equipos antes.')

    const firstPhaseName = phases.length > 0 ? phases[0].name : 'Primera Fase';
    if (selectedPhase !== firstPhaseName) {
      const primeraFaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === firstPhaseName)
      const pendingPrimeraFase = primeraFaseMatches.filter(m => m.status === 'NO_REALIZADO' || m.status === 'EN_VIVO')
      if (primeraFaseMatches.length === 0 || pendingPrimeraFase.length > 0) {
        return alert(`No se puede generar partidos de esta fase porque aún no se han jugado todos los partidos de la fase inicial (${firstPhaseName}).`)
      }
    }

    setGenerating(true)
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/matches?action=generate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ roundName: '1', roundDate: roundDate || new Date().toISOString(), matchType: type, phaseName: selectedPhase }),
    })
    if (res.ok) {
      await fetchData()
      setSelectedRound('1')
      setShowGenType(false)
    }
    setGenerating(false)
  }

  const handleCreateAdvantagePlayoff = () => {
    if (tournamentTeams.length === 0) return alert('Debes agregar equipos antes.')

    const firstPhaseName = phases.length > 0 ? phases[0].name : 'Primera Fase';
    if (selectedPhase !== firstPhaseName) {
      const primeraFaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === firstPhaseName)
      const pendingPrimeraFase = primeraFaseMatches.filter(m => m.status === 'NO_REALIZADO' || m.status === 'EN_VIVO')
      if (primeraFaseMatches.length === 0 || pendingPrimeraFase.length > 0) {
        return alert(`No se puede generar partidos de esta fase porque aún no se han jugado todos los partidos de la fase inicial (${firstPhaseName}).`)
      }
    }
    setShowPlayoffDraw(true)
  }

  const handleGenerateSemifinals = async () => {
    if (tournamentTeams.length === 0) return alert('Debes agregar equipos antes.')
    const firstPhaseName = phases.length > 0 ? phases[0].name : 'Primera Fase';
    if (selectedPhase !== firstPhaseName) {
      const primeraFaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === firstPhaseName)
      const pendingPrimeraFase = primeraFaseMatches.filter(m => m.status === 'NO_REALIZADO' || m.status === 'EN_VIVO')
      if (primeraFaseMatches.length === 0 || pendingPrimeraFase.length > 0) {
        return alert(`No se puede generar partidos de esta fase porque aún no se han jugado todos los partidos de la fase inicial (${firstPhaseName}).`)
      }
    }
    if (!confirm('¿Generar semifinales basándose en los resultados de Cuartos de Final?')) return;
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/matches?action=generateSemifinals`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseName: selectedPhase }),
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message)
      setSelectedRound('Semi Final')
      fetchData()
    } else {
      alert(data.error || 'Error al generar semifinales')
    }
  }

  const handleGenerateFinal = async () => {
    if (tournamentTeams.length === 0) return alert('Debes agregar equipos antes.')
    const firstPhaseName = phases.length > 0 ? phases[0].name : 'Primera Fase';
    if (selectedPhase !== firstPhaseName) {
      const primeraFaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === firstPhaseName)
      const pendingPrimeraFase = primeraFaseMatches.filter(m => m.status === 'NO_REALIZADO' || m.status === 'EN_VIVO')
      if (primeraFaseMatches.length === 0 || pendingPrimeraFase.length > 0) {
        return alert(`No se puede generar partidos de esta fase porque aún no se han jugado todos los partidos de la fase inicial (${firstPhaseName}).`)
      }
    }
    if (!confirm('¿Generar la Final basándose en los resultados de Semifinales?')) return;
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/matches?action=generateFinal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseName: selectedPhase }),
    })
    const data = await res.json()
    if (res.ok) {
      alert(data.message)
      setSelectedRound('Final')
      fetchData()
    } else {
      alert(data.error || 'Error al generar la final')
    }
  }

  const handlePhaseChange = (val: string) => {
    if (val === 'estadisticas') {
      setActiveMenu('estadisticas')
      return
    }
    setActiveMenu('clasificacion')
    setSelectedPhase(val)
    const phaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === val)
    if (phaseMatches.length > 0) {
      const rounds = [...new Set(phaseMatches.map((x: any) => String(x.roundName)))].sort((a: any, b: any) => {
        const isANum = !isNaN(Number(a));
        const isBNum = !isNaN(Number(b));
        if (isANum && isBNum) return Number(a) - Number(b);
        const order: any = { 'cuartos de final': 1, 'semifinal': 2, 'final': 3 };
        const aO = order[a.toLowerCase()] || 99;
        const bO = order[b.toLowerCase()] || 99;
        if (aO !== bO) return aO - bO;
        return a.localeCompare(b);
      })
      if (rounds.length > 0) {
        setSelectedRound(rounds[0])
      }
    } else {
      setSelectedRound('')
    }
  }

  const handleSavePhase = async () => {
    const token = localStorage.getItem('token')
    const res = await fetch(`/api/tournaments/${tournamentId}/phases`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(editPhaseData),
    })
    if (res.ok) {
      await fetchData()
      setSelectedPhase(editPhaseData.name)
      setShowEditPhase(false)
    } else {
      alert('Error al guardar fase')
    }
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
    tournamentTeams.forEach(tt => { stats[tt.team.id] = { id: tt.team.id, name: tt.team.name, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 } })
    
    // Filter matches by selected phase AND EXCLUDE playoffs
    const phaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && !['Cuartos de final', 'Semifinal', 'Final', 'Cuartos', 'Semi Final'].includes(String(m.roundName)))
    
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
        if (e.type === 'RED_CARD' || e.type === 'DOUBLE_YELLOW_CARD') { t.red++; t.totalCards++ }
        else if (e.type === 'YELLOW_CARD') { t.yellow++; t.totalCards++ }
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
    const scorers: Record<string, { name: string; team: string; goals: number; penalties: number }> = {}
    matches.forEach(m => {
      (m.events || []).forEach((e: any) => {
        if (e.type === 'GOAL' || e.type === 'OWN_GOAL') {
          const pName = e.player?.name;
          const tName = e.team?.name || ''
          const isPenal = e.detail === 'PENAL'
          const displayName = pName ? (e.type === 'OWN_GOAL' ? `${pName} (A.G.)` : pName) : (e.type === 'OWN_GOAL' ? 'Autogol' : 'Desconocido')
          const key = e.type === 'OWN_GOAL' ? `AG_${pName || 'anon'}_${e.id}` : (pName || 'Desconocido')
          
          if (!scorers[key]) scorers[key] = { name: displayName, team: tName, goals: 0, penalties: 0 }
          scorers[key].goals++
          if (isPenal) scorers[key].penalties++
        }
      })
    })
    return Object.values(scorers).map(s => ({
      ...s,
      name: `${s.name}${s.penalties > 0 ? ` (${s.penalties} P)` : ''}`
    })).sort((a, b) => b.goals - a.goals).slice(0, 10)
  }

  const getTopDisciplined = () => {
    const players: Record<string, { name: string; team: string; yellow: number; red: number }> = {}
    matches.forEach(m => {
      (m.events || []).forEach((e: any) => {
        const pName = e.player?.name || 'Desconocido'
        const tName = e.team?.name || ''
        if (!players[pName]) players[pName] = { name: pName, team: tName, yellow: 0, red: 0 }
        if (e.type === 'YELLOW_CARD') players[pName].yellow++
        else if (e.type === 'RED_CARD' || e.type === 'DOUBLE_YELLOW_CARD') players[pName].red++
      })
    })
    return Object.values(players).sort((a, b) => (b.red * 3 + b.yellow) - (a.red * 3 + a.yellow)).slice(0, 10)
  }

  const BracketColumn = ({ title, matches }: { title: string, matches: any[] }) => (
    <div className="flex flex-col gap-6">
      <div className="bg-slate-900 text-white p-3 rounded-xl text-center font-black text-[10px] uppercase tracking-widest">{title}</div>
      <div className="space-y-4">
        {matches.map((m: any) => <MatchCard key={m.id} match={m} />)}
        {matches.length === 0 && <div className="text-center py-10 border-2 border-dashed border-slate-100 rounded-2xl text-[9px] font-black text-slate-300 uppercase tracking-widest">Sin partidos</div>}
      </div>
    </div>
  )

  const MatchCard = ({ match }: { match: any }) => {
    const hTeamName = match.homeTeam?.name || match.homePlaceholder || 'Por definir'
    const aTeamName = match.awayTeam?.name || match.awayPlaceholder || 'Por definir'
    return (
      <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer" onClick={() => handleOpenMatchModal(match)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">🏆</div>
            <span className="text-[11px] font-black text-slate-800 uppercase truncate w-24">{hTeamName}</span>
          </div>
          <div className="font-black text-slate-900 text-lg">{match.status === 'NO_REALIZADO' ? '-' : match.homeScore}</div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-sm">🏆</div>
            <span className="text-[11px] font-black text-slate-800 uppercase truncate w-24">{aTeamName}</span>
          </div>
          <div className="font-black text-slate-900 text-lg">{match.status === 'NO_REALIZADO' ? '-' : match.awayScore}</div>
        </div>
        {match.status === 'EN_VIVO' && <div className="mt-4 text-center"><span className="bg-yellow-400 text-slate-900 px-3 py-1 rounded-full text-[8px] font-black uppercase animate-pulse">En Vivo</span></div>}
      </div>
    )
  }


  const shareUrl = `https://copafacil.com/${tournamentId}`
  const sportIcon = getSportIcon(tournament?.sportType || '')

  if (loading && !tournament) return <div className="p-8 text-center font-black text-slate-400 uppercase tracking-widest">Cargando Torneo...</div>
  if (!tournament) return <div className="p-8 text-center text-slate-400 font-bold italic">No se encontró el torneo.</div>

  return (
    <>
    <div className="min-h-screen bg-[#F8FAFC] flex relative overflow-hidden font-sans">
      {/* Sidebar */}
      <div className="w-64 bg-[#0A1128] text-slate-400 flex flex-col h-full z-10 border-r border-white/5">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">🏆</div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase">{tournament?.name || 'Copa Depor'}</h1>
          </div>

          <nav className="space-y-2">
            <button onClick={() => setActiveMenu('inicio')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${activeMenu === 'inicio' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <span className="text-lg">🏠</span> Inicio
            </button>
            <button onClick={() => setActiveMenu('clasificacion')} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${activeMenu === 'clasificacion' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
              <span className="text-lg">📊</span> Clasificación
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm hover:bg-white/5 hover:text-white transition-all opacity-40 cursor-not-allowed">
              <span className="text-lg">📈</span> Rankings y encuestas
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm hover:bg-white/5 hover:text-white transition-all opacity-40 cursor-not-allowed">
              <span className="text-lg">📸</span> Fotos, vídeos y noticias
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm hover:bg-white/5 hover:text-white transition-all opacity-40 cursor-not-allowed mt-8">
              <span className="text-lg">⚙️</span> Configuración
            </button>
          </nav>

          <div className="mt-12">
            <button onClick={() => router.push('/dashboard')} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest text-blue-400 bg-blue-900/30 hover:bg-blue-600 hover:text-white transition-all border border-blue-900/50">
              <span>⬅</span> Mis Torneos
            </button>
          </div>
        </div>

        <div className="mt-auto p-6 border-t border-white/5">
          <div className="flex items-center justify-between gap-3 px-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-full bg-slate-800 flex-shrink-0 flex items-center justify-center font-black text-white text-sm">O</div>
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-black text-white truncate">Orlando Semidei</span>
              </div>
            </div>
            <button onClick={() => { localStorage.clear(); window.location.href = '/login'; }} className="text-[9px] font-black text-slate-500 uppercase hover:text-white transition-colors">Salir</button>
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
                <button onClick={() => router.push(`/tournaments/${tournamentId}/add-teams`)} className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg">Agregar Equipos</button>
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
        ) : (activeMenu === 'clasificacion' || activeMenu === 'estadisticas') ? (
          <div className="flex flex-col xl:flex-row gap-8 max-w-[1600px] mx-auto h-full">
            {/* Classification OR Bracket */}
            <div className="flex-1 max-w-[1000px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 border border-slate-50 overflow-y-auto">
                <div className="animate-in fade-in duration-500">
                  <div className="flex justify-between items-center mb-12 relative">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <select 
                          value={activeMenu === 'estadisticas' ? 'estadisticas' : selectedPhase}
                          onChange={(e) => handlePhaseChange(e.target.value)}
                          className="bg-transparent border border-slate-300 rounded-full pl-4 pr-8 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
                        >
                          {phases.map(p => <option key={p.id || p.name} value={p.name}>{p.name}</option>)}
                          {!phases.some(p => p.name === selectedPhase) && <option value={selectedPhase}>{selectedPhase}</option>}
                          <option value="estadisticas" className="text-blue-600 font-black">🏆 Estadísticas Generales</option>
                        </select>
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">⌄</span>
                      </div>
                    </div>

                    {/* Centered Tab Button */}
                    <div className="absolute left-1/2 -translate-x-1/2 -top-8 z-50">
                      <div className="relative group">
                         <button className="bg-[#1e1b4b] text-white w-16 h-7 rounded-b-2xl flex items-center justify-center hover:bg-[#312e81] transition-colors shadow-md border-t-0">
                           <span className="text-lg font-light leading-none mb-1">+</span>
                         </button>
                         
                         {/* Dropdown Menu */}
                         <div className="absolute left-1/2 -translate-x-1/2 top-7 w-64 bg-[#0A1128] rounded-xl shadow-2xl border border-white/10 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 overflow-hidden">
                           <div className="py-2">
                             <button onClick={() => router.push(`/tournaments/${tournamentId}/add-teams`)} className="w-full flex items-center gap-4 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors">
                               <span className="text-lg">📋</span> Equipos
                             </button>
                             <button className="w-full flex items-center gap-4 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-not-allowed opacity-50">
                               <span className="text-lg">⛖</span> Grupos
                             </button>
                             <button className="w-full flex items-center gap-4 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-not-allowed opacity-50">
                               <span className="text-lg">📚</span> Fases
                             </button>
                             <button className="w-full flex items-center gap-4 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-not-allowed opacity-50">
                               <span className="text-lg">⬇</span> Exportar
                             </button>
                             <button className="w-full flex items-center gap-4 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-not-allowed opacity-50">
                               <span className="text-lg">☰</span> Tabla
                             </button>
                             <button className="w-full flex items-center gap-4 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-not-allowed opacity-50">
                               <span className="text-lg">☑</span> Criterios de clasificación
                             </button>
                             <button className="w-full flex items-center gap-4 px-6 py-3 text-sm font-bold text-white hover:bg-white/10 transition-colors cursor-not-allowed opacity-50">
                               <span className="text-lg">⇅</span> Reordenar
                             </button>
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>
                  
                  {activeMenu === 'estadisticas' ? (
                    <div className="space-y-12 animate-in fade-in duration-500">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Top Scorers */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">🥅 Goleadores</h3>
                          <div className="overflow-hidden rounded-2xl border border-slate-50">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-900 text-white">
                                <tr>
                                  <th className="p-3 text-center">Pos</th>
                                  <th className="p-3 text-left">Jugador</th>
                                  <th className="p-3 text-center">Goles</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {getTopScorers().map((p: any, i: number) => (
                                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-center font-black text-slate-400">{i+1}</td>
                                    <td className="p-3 font-black text-slate-800">
                                      <div className="flex flex-col">
                                        <span>{p.name}</span>
                                        <span className="text-[8px] text-slate-400 uppercase">{p.team}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center font-black text-blue-600">{p.goals}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Disciplined */}
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                          <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">🟨 Sanciones</h3>
                          <div className="overflow-hidden rounded-2xl border border-slate-50">
                            <table className="w-full text-xs">
                              <thead className="bg-slate-900 text-white">
                                <tr>
                                  <th className="p-3 text-center">Pos</th>
                                  <th className="p-3 text-left">Jugador</th>
                                  <th className="p-3 text-center">🟨</th>
                                  <th className="p-3 text-center">🟥</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {getTopDisciplined().map((p: any, i: number) => (
                                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-center font-black text-slate-400">{i+1}</td>
                                    <td className="p-3 font-black text-slate-800">
                                      <div className="flex flex-col">
                                        <span>{p.name}</span>
                                        <span className="text-[8px] text-slate-400 uppercase">{p.team}</span>
                                      </div>
                                    </td>
                                    <td className="p-3 text-center font-black text-yellow-500">{p.yellow}</td>
                                    <td className="p-3 text-center font-black text-red-500">{p.red}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <RankingCard title="Mejor ataque" label="Goles" data={getTeamRankings().bestAttack} field="gf" />
                        <RankingCard title="Mejor defensa" label="Goles" data={getTeamRankings().bestDefense} field="ga" />
                        <RankingCard title="Tarjeta roja" label="Ctd" data={getTeamRankings().redCards} field="red" />
                        <RankingCard title="Todas las tarjetas" label="Ctd" data={getTeamRankings().totalCards} field="totalCards" />
                      </div>
                    </div>
                  ) : (
                    <>
                      {!selectedPhase.toLowerCase().includes('final') && !selectedPhase.toLowerCase().includes('eliminatoria') ? (
                        <div className="space-y-4 mt-2">
                          <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] text-center w-full">Clasificación</h2>
                          <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm">
                            <table className="w-full text-sm">
                              <thead>
                              <tr className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-wider">
                                <th className="p-4 text-center">Pos</th>
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
                                <th className="p-4 text-center">PE</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                              {getStandings().length === 0 ? (
                                <tr><td colSpan={12} className="p-12 text-center text-slate-300 font-bold italic">No hay partidos registrados aún</td></tr>
                              ) : getStandings().map((row: any, i: number) => (
                                <tr key={row.id} className="hover:bg-slate-50 transition-all group">
                                  <td className="p-4 text-center">
                                    <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center font-black text-sm mx-auto">{i+1}</div>
                                  </td>
                                  <td className="p-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-inner">⚽</div>
                                      <span className="font-black text-slate-800">{row.name}</span>
                                    </div>
                                  </td>
                                  <td className="p-4 text-center font-black text-blue-600 text-lg bg-blue-50/30">{row.points}</td>
                                  <td className="p-4 text-center font-bold text-slate-600">{row.played}</td>
                                  <td className="p-4 text-center text-slate-500 font-bold bg-slate-50/30">{row.won}</td>
                                  <td className="p-4 text-center text-slate-400 font-bold">{row.drawn}</td>
                                  <td className="p-4 text-center text-slate-400 font-bold bg-slate-50/30">{row.lost}</td>
                                  <td className="p-4 text-center text-slate-500 font-bold">{row.gf}</td>
                                  <td className="p-4 text-center text-slate-500 font-bold bg-slate-50/30">{row.ga}</td>
                                  <td className="p-4 text-center font-black text-slate-800">{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                                  <td className="p-4 text-center font-bold text-slate-500 bg-slate-50/30">{row.perc}</td>
                                  <td className="p-4 text-center font-bold text-slate-400">0</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      ) : (
                        <div className="py-20 text-center bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200">
                          <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">Tabla de clasificación no disponible en esta fase</p>
                        </div>
                      )}

                      {(selectedPhase.toLowerCase().includes('final') || selectedPhase.toLowerCase().includes('eliminatoria')) && (
                        <>
                          <div className="flex justify-between items-center mb-10 border-t border-slate-100 pt-10">
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">🌳 Cuadro de Llaves</h2>
                            <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase italic">Esquema Visual</span>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-10">
                            <BracketColumn title="Cuartos" matches={matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase().includes('cuarto'))} />
                            <BracketColumn title="Semis" matches={matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase().includes('semi'))} />
                            <BracketColumn title="Final" matches={matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase().includes('final'))} />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
            </div>

            {/* Calendar */}
            <div className="w-full xl:w-[450px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50 flex flex-col flex-shrink-0 overflow-hidden xl:mt-[112px]">
              <div className="bg-[#0F172A] p-6 flex justify-between items-center relative z-10">
                <h2 className="text-xl font-black text-white flex items-center gap-2">Juegos</h2>
                <div className="flex border border-white rounded-full overflow-hidden">
                  <select 
                    value={selectedPhase} 
                    onChange={(e) => handlePhaseChange(e.target.value)}
                    className="bg-transparent text-white text-[10px] font-black px-3 py-1.5 outline-none border-r border-white appearance-none cursor-pointer text-center"
                    style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                  >
                    {phases.map(p => <option key={p.id || p.name} value={p.name} className="text-black">{p.name}</option>)}
                    {!phases.some(p => p.name === selectedPhase) && <option value={selectedPhase} className="text-black">{selectedPhase}</option>}
                  </select>
                  <select value={selectedRound} onChange={e => setSelectedRound(e.target.value)} className="bg-transparent text-white text-[10px] font-black px-3 py-1.5 outline-none appearance-none cursor-pointer text-center" style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}>
                    {Array.from(new Set(matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase).map(m => m.roundName))).sort((a,b) => {
                      const isANum = !isNaN(Number(a));
                      const isBNum = !isNaN(Number(b));
                      if (isANum && isBNum) return Number(a) - Number(b);
                      const order: any = { 'cuartos de final': 1, 'semifinal': 2, 'final': 3 };
                      const aO = order[a.toLowerCase()] || 99;
                      const bO = order[b.toLowerCase()] || 99;
                      if (aO !== bO) return aO - bO;
                      return a.localeCompare(b);
                    }).map(r => <option key={r} value={r} className="text-black">{!isNaN(Number(r)) ? `${r}º Fecha` : r}</option>)}
                  </select>
                </div>
                {/* Plus button at the bottom of header */}
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2">
                  <button onClick={() => {
                    if (tournamentTeams.length === 0) {
                      alert('Debes agregar equipos al torneo antes de realizar esta acción.');
                      return;
                    }
                    setShowFixtureMenu(true)
                  }} className="bg-[#3B405A] text-white w-16 h-6 rounded-b-2xl flex items-center justify-center font-black text-xl hover:bg-[#2A2E44] transition-all">+</button>
                </div>
              </div>
              
              <div className="p-6 pt-10 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar flex-1 flex flex-col relative">
                {matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase).length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-6 pt-4">
                    <button onClick={() => {
                      if (tournamentTeams.length === 0) {
                        alert('Debes agregar equipos al torneo antes de generar los partidos.');
                        return;
                      }
                      setShowGenType(true)
                    }} className="px-8 py-3.5 bg-[#0F172A] text-white rounded-xl font-medium text-sm hover:bg-[#1E293B] transition-all shadow-md">GENERAR PARTIDOS</button>
                    <div className="text-lg text-slate-800 font-normal">o</div>
                    <button onClick={() => {
                      if (tournamentTeams.length === 0) {
                        alert('Debes agregar equipos al torneo antes de agregar una fecha.');
                        return;
                      }
                      const pending = matches.filter(m => m.status === 'NO_REALIZADO' || m.status === 'EN_VIVO')
                      if (pending.length > 0) return alert('No se puede generar partidos de la segunda fase porque aún no se han jugado todos los partidos de la primera fase.')
                      setShowAddMatchModal(true)
                    }} className="px-8 py-3.5 bg-[#0F172A] text-white rounded-xl font-medium text-sm hover:bg-[#1E293B] transition-all shadow-md">AGREGAR FECHA</button>
                  </div>
                ) : (
                  <>
                    {matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && String(m.roundName) === selectedRound).map(m => {
                      const isE = editingMatchData?.id === m.id; const hS = isE ? editingMatchData.homeScore : m.homeScore; const aS = isE ? editingMatchData.awayScore : m.awayScore; const st = isE ? editingMatchData.status : m.status
                      return (
                        <div key={m.id} onClick={() => handleOpenMatchModal(m)} className={`relative flex items-center justify-between p-4 group cursor-pointer transition-all ${isE ? 'scale-[1.02]' : ''}`}>
                          {/* Home Team */}
                          <div className="flex flex-col items-center gap-2 w-24 relative mt-3">
                            {m.advantageTeamId === m.homeTeam?.id && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg z-10 uppercase whitespace-nowrap">🛡️ Ventaja</div>}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg relative ${m.homeTeam ? 'bg-green-500 text-white' : 'bg-slate-100 border-2 border-dashed border-slate-200'}`}>
                              {m.homeTeam ? <>
                                <span className="absolute -top-2 text-yellow-400 text-sm">👑</span>
                                🏆
                              </> : <span className="text-slate-300 text-sm">?</span>}
                            </div>
                            <span className="text-[11px] font-black text-slate-600 text-center uppercase truncate w-full">{m.homeTeam?.name || m.homePlaceholder || 'Por definir'}</span>
                          </div>

                          {/* Score Block */}
                          <div className="flex flex-col items-center">
                            <div className="bg-white border border-slate-100 rounded-xl px-6 py-2 shadow-sm flex flex-col items-center min-w-[100px]">
                              <div className="text-2xl font-black text-slate-800 tracking-tighter flex flex-col items-center gap-1">
                              {hS !== null && st !== 'NO_REALIZADO' ? `${hS} : ${aS}` : ':'}
                              {st === 'FINALIZADO' && m.homePenaltyScore !== null && m.awayPenaltyScore !== null && (
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest text-center mt-1">Penales: {m.homePenaltyScore} - {m.awayPenaltyScore}</span>
                              )}
                              {st === 'NO_REALIZADO' && m.roundName !== '1' && (
                                <span className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-widest max-w-[120px] text-center">{m.notes || ''}</span>
                              )}
                            </div>
                              {st !== 'NO_REALIZADO' && (
                                <div className={`text-[8px] font-black px-3 py-0.5 rounded-md mt-1 uppercase ${st === 'EN_VIVO' ? 'bg-yellow-400 text-slate-900 animate-pulse' : 'bg-blue-100 text-blue-600'}`}>
                                  {st === 'EN_VIVO' ? 'En Vivo' : 'Finalizado'}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Away Team */}
                          <div className="flex flex-col items-center gap-2 w-24 relative mt-3">
                            {m.advantageTeamId === m.awayTeam?.id && <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full shadow-lg z-10 uppercase whitespace-nowrap">🛡️ Ventaja</div>}
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl shadow-lg relative ${m.awayTeam ? 'bg-green-500 text-white' : 'bg-slate-100 border-2 border-dashed border-slate-200'}`}>
                              {m.awayTeam ? <>
                                <span className="absolute -top-2 text-yellow-400 text-sm">👑</span>
                                🏆
                              </> : <span className="text-slate-300 text-sm">?</span>}
                            </div>
                            <span className="text-[11px] font-black text-slate-600 text-center uppercase truncate w-full">{m.awayTeam?.name || m.awayPlaceholder || 'Por definir'}</span>
                          </div>

                          {isE && <div className="absolute inset-0 border-2 border-blue-500 rounded-[2rem] pointer-events-none"></div>}
                        </div>
                      )
                    })}
                    <div className="mt-10 pt-10 border-t border-slate-100">
                      <h3 className="bg-[#0F172A] text-white p-4 rounded-t-[1.5rem] text-center font-black text-xs uppercase tracking-widest">Estadísticas de la fecha</h3>
                      <div className="bg-slate-50 rounded-b-[1.5rem] p-6">
                        <RoundStatistics matches={matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && String(m.roundName) === selectedRound)} />
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
              <MenuOption icon="💎" label="Fases" onClick={() => { setShowConfigMenu(false); setShowPhasesList(true); }} />
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
              <MenuOption icon="➕" label="Agregar partido" onClick={() => { setShowFixtureMenu(false); setShowAddMatchModal(true); }} />
              <MenuOption icon="✏️" label="Editar Fecha" onClick={() => setShowFixtureMenu(false)} />
              <MenuOption icon="⇅" label="Reordenar rondas" onClick={() => setShowFixtureMenu(false)} />
              <MenuOption icon="⇅" label="Reordenar partidos" onClick={() => setShowFixtureMenu(false)} />
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

      {/* FASES LIST MODAL */}
      {showPhasesList && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[110] p-4 backdrop-blur-sm" onClick={() => setShowPhasesList(false)}>
          <div className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-center mb-6 text-slate-900">Fases</h3>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto custom-scrollbar pr-2">
              {phases.map(p => (
                <div key={p.id || p.name} className="p-4 bg-slate-50 text-slate-800 rounded-2xl font-black border border-slate-100 flex justify-between items-center hover:border-slate-300 transition-colors">
                  <div className="cursor-pointer flex-1" onClick={() => { handlePhaseChange(p.name); setShowPhasesList(false); }}>
                    <span>{p.name}</span>
                    <span className="ml-2 text-[9px] text-slate-400 uppercase tracking-widest">{p.type === 'ELIMINATORIA' ? 'Eliminatoria' : 'Todos contra todos'}</span>
                  </div>
                  {p.name !== 'Primera Fase' && p.id && (
                    <button onClick={(e) => { e.stopPropagation(); handleDeletePhase(p.id); }} className="text-red-400 hover:text-red-600 p-2">🗑️</button>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => { setShowPhasesList(false); setShowPhaseType(true); }} className="w-full py-4 bg-[#0F172A] text-white rounded-[1.5rem] font-black text-sm hover:bg-blue-600 transition-all shadow-xl active:scale-95">Nueva fase</button>
            <button onClick={() => setShowPhasesList(false)} className="w-full mt-2 py-4 text-slate-400 font-black text-xs uppercase tracking-widest hover:text-slate-600 transition-all">Cerrar</button>
          </div>
        </div>
      )}

      {/* PHASE TYPE MODAL */}
      {showPhaseType && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[110] p-4 backdrop-blur-sm" onClick={() => setShowPhaseType(false)}>
          <div className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-black text-center mb-8 text-slate-900">Fases</h3>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">1° Fase</div>
            <div className="space-y-3">
              <button onClick={() => { setEditPhaseData({ ...editPhaseData, type: 'LIGA' }); setShowPhaseType(false); setShowEditPhase(true); }} className="w-full p-5 bg-slate-50 text-slate-800 rounded-[1.5rem] font-black hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100 text-left active:scale-95">Todos contra Todos</button>
              <button onClick={() => { setEditPhaseData({ ...editPhaseData, type: 'ELIMINATORIA' }); setShowPhaseType(false); setShowEditPhase(true); }} className="w-full p-5 bg-slate-50 text-slate-800 rounded-[1.5rem] font-black hover:bg-blue-50 hover:text-blue-600 transition-all border border-slate-100 text-left active:scale-95">Eliminatoria</button>
            </div>
            <button onClick={() => setShowPhaseType(false)} className="w-full mt-6 py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-slate-600 transition-all">Cancelar</button>
          </div>
        </div>
      )}

      {/* EDIT PHASE MODAL */}
      {showEditPhase && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-[110] p-4 backdrop-blur-sm" onClick={() => setShowEditPhase(false)}>
          <div className="bg-slate-200 rounded-[2.5rem] p-1 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-[#F3F0F7] rounded-[2.4rem] p-8">
              <h3 className="text-xl font-black text-center mb-6 text-slate-900">Editar fase</h3>
              <div className="space-y-5 mb-8">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Título</label>
                  <input type="text" value={editPhaseData.name} onChange={e => setEditPhaseData({...editPhaseData, name: e.target.value})} className="w-full py-2 bg-transparent font-bold text-slate-800 outline-none border-b border-slate-400 focus:border-blue-600 transition-colors" placeholder="Ej: FASE FINAL" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-slate-700">Clasificación</span>
                  <div className="w-6 h-6 border-2 border-slate-400 rounded bg-transparent flex items-center justify-center cursor-pointer" onClick={() => setEditPhaseData({...editPhaseData, isClassification: !editPhaseData.isClassification})}>
                    {editPhaseData.isClassification && <div className="w-3 h-3 bg-slate-800 rounded-sm"></div>}
                  </div>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-3"><span className="text-slate-500 text-lg">≡</span> <span className="text-sm font-bold text-slate-700">Seleccionar equipos</span></div>
                  <button onClick={() => setShowPhaseTeams(!showPhaseTeams)} className="text-blue-500 font-bold text-sm hover:text-blue-700">Editar</button>
                </div>
                {showPhaseTeams && (
                  <div className="bg-white rounded-xl p-3 border border-slate-200 max-h-40 overflow-y-auto">
                    {tournamentTeams.map(t => (
                      <div key={t.id} className="flex items-center gap-2 mb-2">
                        <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-blue-600" />
                        <span className="text-sm font-bold text-slate-700">{t.team.name}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-3"><span className="text-slate-500 text-lg">📄</span> <span className="text-sm font-bold text-slate-700">Continuar tabla</span></div>
                  <button onClick={() => setShowPhaseContinue(!showPhaseContinue)} className="text-blue-500 font-bold text-sm hover:text-blue-700">Editar</button>
                </div>
                {showPhaseContinue && (
                  <div className="bg-white rounded-xl p-2 border border-slate-200">
                    <select 
                      className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none"
                      value={editPhaseData.continueFromId || ''}
                      onChange={e => setEditPhaseData({...editPhaseData, continueFromId: e.target.value === '' ? null : e.target.value})}
                    >
                      <option value="">Ninguno</option>
                      {phases.map(p => (
                        <option key={p.id || p.name} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex gap-4 px-4">
                <button onClick={() => setShowEditPhase(false)} className="flex-1 py-3 text-red-500 font-black text-sm transition-all hover:bg-red-50 rounded-xl">Quitar</button>
                <button onClick={handleSavePhase} className="flex-1 py-3 text-blue-500 font-black text-sm transition-all hover:bg-blue-50 rounded-xl">Guardar</button>
              </div>
            </div>
          </div>
        </div>
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
      <KnockoutWizard
        tournamentId={tournamentId}
        phaseName={selectedPhase}
        matches={matches}
        tournamentTeams={tournamentTeams}
        onClose={() => setShowPlayoffDraw(false)}
        onSuccess={() => { setShowPlayoffDraw(false); fetchData(); }}
      />
    )}
    </>
  )
}

function KnockoutWizard({ tournamentId, phaseName, matches, tournamentTeams, onClose, onSuccess }: any) {
  const [step, setStep] = useState(1)
  const [matchType, setMatchType] = useState<'ida' | 'idayvuelta'>('ida')
  const [selectionMode, setSelectionMode] = useState<'clasificacion' | 'aleatorio'>('clasificacion')
  const [generationMode, setGenerationMode] = useState<'seleccion' | 'vacios'>('seleccion')
  const [teamCount, setTeamCount] = useState<number | 'indefinido'>(8)
  const [selectedTeams, setSelectedTeams] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Calculate General Classification from ALL matches EXCEPT current phase
  const getGeneralStandings = () => {
    const stats: Record<string, any> = {}
    tournamentTeams.forEach((tt: any) => {
      stats[tt.team.id] = { id: tt.team.id, name: tt.team.name, points: 0, gf: 0, ga: 0, played: 0, won: 0, drawn: 0, lost: 0 }
    })
    matches.filter((m: any) => m.phaseName !== phaseName && (m.status === 'FINALIZADO' || m.status === 'COMPLETED')).forEach((m: any) => {
      if (!m.homeTeam || !m.awayTeam) return
      const h = stats[m.homeTeam.id]; const a = stats[m.awayTeam.id]
      if (!h || !a) return
      h.played++; a.played++; h.gf += (m.homeScore || 0); h.ga += (m.awayScore || 0); a.gf += (m.awayScore || 0); a.ga += (m.homeScore || 0)
      if (m.homeScore > m.awayScore) { h.points += 3; h.won++; a.lost++ }
      else if (m.homeScore < m.awayScore) { a.points += 3; a.won++; h.lost++ }
      else { h.points++; a.points++; h.drawn++; a.drawn++ }
    })
    return Object.values(stats).sort((a: any, b: any) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf)
  }

  const standings = getGeneralStandings()

  const handleNextStep = () => {
    if (step === 4) {
      // Initialize selected teams based on count and mode
      if (generationMode === 'seleccion') {
        const count = teamCount === 'indefinido' ? standings.length : teamCount
        const initial = standings.map((t, i) => ({ ...t, checked: i < Number(count) }))
        setSelectedTeams(initial)
      }
    }
    setStep(step + 1)
  }

  const moveTeam = (index: number, direction: 'up' | 'down') => {
    const newTeams = [...selectedTeams]
    const target = direction === 'up' ? index - 1 : index + 1
    if (target < 0 || target >= newTeams.length) return
    [newTeams[index], newTeams[target]] = [newTeams[target], newTeams[index]]
    setSelectedTeams(newTeams)
  }

  const handleComplete = async () => {
    setLoading(true)
    const token = localStorage.getItem('token')
    const finalTeams = selectedTeams.filter(t => t.checked)
    
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches?action=generateKnockoutTree`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          teamIds: finalTeams.map(t => t.id), 
          phaseName, 
          matchType,
          selectionMode,
          generationMode
        }),
      })
      if (res.ok) {
        onSuccess()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al generar')
      }
    } catch (e) {
      alert('Error de conexión')
    }
    setLoading(false)
  }

  const WizardModal = ({ title, children, showBack = true }: any) => (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[300] p-4" onClick={onClose}>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in fade-in duration-200" onClick={e => e.stopPropagation()}>
        <div className="bg-[#0F172A] p-6 flex items-center justify-between">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-all text-xl">✕</button>
        </div>
        <div className="p-8">
          {children}
          <div className="mt-8 flex gap-3">
            {showBack && (
              <button onClick={() => setStep(step - 1)} className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all">Atrás</button>
            )}
            {step < 5 && (
              <button onClick={handleNextStep} className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100">Siguiente</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  if (step === 1) return (
    <WizardModal title="Eliminatoria" showBack={false}>
      <div className="space-y-4">
        <button onClick={() => setMatchType('ida')} className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${matchType === 'ida' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
          <div className="text-left">
            <div className="font-black text-slate-800">SÓLO IDA</div>
            <div className="text-xs text-slate-500">Un único partido por cruce</div>
          </div>
          {matchType === 'ida' && <span className="text-blue-500 text-xl">✓</span>}
        </button>
        <button onClick={() => setMatchType('idayvuelta')} className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${matchType === 'idayvuelta' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
          <div className="text-left">
            <div className="font-black text-slate-800">IDA Y VUELTA</div>
            <div className="text-xs text-slate-500">Dos partidos por cruce</div>
          </div>
          {matchType === 'idayvuelta' && <span className="text-blue-500 text-xl">✓</span>}
        </button>
      </div>
    </WizardModal>
  )

  if (step === 2) return (
    <WizardModal title="Equipos">
      <div className="space-y-4">
        <button onClick={() => setSelectionMode('clasificacion')} className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${selectionMode === 'clasificacion' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
          <div className="text-left">
            <div className="font-black text-slate-800 uppercase">Clasificación General</div>
            <div className="text-xs text-slate-500">Basado en resultados de fases previas</div>
          </div>
          {selectionMode === 'clasificacion' && <span className="text-blue-500 text-xl">✓</span>}
        </button>
        <button onClick={() => setSelectionMode('aleatorio')} className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${selectionMode === 'aleatorio' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
          <div className="text-left">
            <div className="font-black text-slate-800 uppercase">Aleatoriamente</div>
            <div className="text-xs text-slate-500">Sorteo al azar de los equipos</div>
          </div>
          {selectionMode === 'aleatorio' && <span className="text-blue-500 text-xl">✓</span>}
        </button>
      </div>
    </WizardModal>
  )

  if (step === 3) return (
    <WizardModal title="Equipos">
      <div className="space-y-4">
        <button onClick={() => setGenerationMode('seleccion')} className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${generationMode === 'seleccion' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
          <div className="text-left">
            <div className="font-black text-slate-800 uppercase">Seleccionar Equipos</div>
            <div className="text-xs text-slate-500">Elegir qué equipos clasifican</div>
          </div>
          {generationMode === 'seleccion' && <span className="text-blue-500 text-xl">✓</span>}
        </button>
        <button onClick={() => setGenerationMode('vacios')} className={`w-full p-6 rounded-3xl border-2 transition-all flex items-center justify-between ${generationMode === 'vacios' ? 'border-blue-500 bg-blue-50' : 'border-slate-100 hover:border-slate-200'}`}>
          <div className="text-left">
            <div className="font-black text-slate-800 uppercase">Generar partidos sin equipos</div>
            <div className="text-xs text-slate-500">Crea los cruces vacíos para llenar luego</div>
          </div>
          {generationMode === 'vacios' && <span className="text-blue-500 text-xl">✓</span>}
        </button>
      </div>
    </WizardModal>
  )

  if (step === 4) return (
    <WizardModal title="Equipos">
      <div className="grid grid-cols-2 gap-3">
        {[4, 8, 16, 32, 64, 128].map(n => (
          <button key={n} onClick={() => setTeamCount(n)} className={`p-4 rounded-2xl border-2 font-black transition-all ${teamCount === n ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-600'}`}>
            {n} EQUIPOS
          </button>
        ))}
        <button onClick={() => setTeamCount('indefinido')} className={`p-4 rounded-2xl border-2 font-black transition-all col-span-2 ${teamCount === 'indefinido' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-100 text-slate-600'}`}>
          INDEFINIDO
        </button>
      </div>
    </WizardModal>
  )

  if (step === 5) {
    const checkedCount = selectedTeams.filter(t => t.checked).length
    return (
      <WizardModal title="Seleccionar Equipos">
        <div className="max-h-[40vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
          {selectedTeams.map((t, i) => (
            <div key={t.id} className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-2xl p-3 group">
              <input 
                type="checkbox" 
                checked={t.checked} 
                onChange={() => {
                  const nt = [...selectedTeams]
                  nt[i].checked = !nt[i].checked
                  setSelectedTeams(nt)
                }}
                className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="font-black text-slate-400 text-xs w-4">{i + 1}</span>
              <span className="font-bold text-slate-800 text-sm flex-1 truncate">{t.name}</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => moveTeam(i, 'up')} className="p-1 hover:bg-white rounded shadow-sm text-slate-400 hover:text-blue-600">↑</button>
                <button onClick={() => moveTeam(i, 'down')} className="p-1 hover:bg-white rounded shadow-sm text-slate-400 hover:text-blue-600">↓</button>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-col items-center gap-4">
          <div className={`font-black text-sm uppercase tracking-widest ${checkedCount === teamCount ? 'text-green-500' : 'text-orange-500'}`}>
            Equipos {checkedCount}/{teamCount === 'indefinido' ? selectedTeams.length : teamCount}
          </div>
          <button 
            onClick={handleComplete}
            disabled={loading || (teamCount !== 'indefinido' && checkedCount !== teamCount)}
            className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl disabled:opacity-50"
          >
            {loading ? 'Procesando...' : 'Completar (Guardar)'}
          </button>
        </div>
      </WizardModal>
    )
  }

  return null
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

  const [homePenalties, setHomePenalties] = useState<number | ''>('')
  const [awayPenalties, setAwayPenalties] = useState<number | ''>('')
  const [useAdvantage, setUseAdvantage] = useState<boolean>(true)
  const [advancingTeamId, setAdvancingTeamId] = useState<string>('')

  useEffect(() => { fetchMatch() }, [matchId])
  useEffect(() => { if (match) onUpdate({ homeScore: hG.length, awayScore: aG.length, status: st }) }, [hG.length, aG.length, st])

  // Calculate advancing team
  useEffect(() => {
    if (!match || !match.homeTeam || !match.awayTeam) return
    if (!['Cuartos de final', 'Cuartos', 'Semifinal', 'Final'].includes(match.roundName)) return

    const hS = hG.length; const aS = aG.length;
    if (hS > aS) setAdvancingTeamId(match.homeTeam.id)
    else if (aS > hS) setAdvancingTeamId(match.awayTeam.id)
    else { // Tie
      if (['Cuartos de final', 'Cuartos'].includes(match.roundName)) {
         if (useAdvantage && match.advantageTeamId) {
            setAdvancingTeamId(match.advantageTeamId)
         } else {
            const hP = Number(homePenalties); const aP = Number(awayPenalties);
            if (hP > aP) setAdvancingTeamId(match.homeTeam.id)
            else if (aP > hP) setAdvancingTeamId(match.awayTeam.id)
            else setAdvancingTeamId('')
         }
      } else {
         const hP = Number(homePenalties); const aP = Number(awayPenalties);
         if (hP > aP) setAdvancingTeamId(match.homeTeam.id)
         else if (aP > hP) setAdvancingTeamId(match.awayTeam.id)
         else setAdvancingTeamId('')
      }
    }
  }, [hG.length, aG.length, homePenalties, awayPenalties, useAdvantage, match])

  const fetchMatch = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/matches/${matchId}`, { headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error('No se pudo cargar el partido')
      const data = await res.json()
      
      setMatch(data); 
      setSt(data.status || 'NO_REALIZADO')
      setHomePenalties(data.homePenaltyScore ?? '')
      setAwayPenalties(data.awayPenaltyScore ?? '')
      
      const parse = (tId: string, type: any) => (data.events || [])
        .filter((e: any) => e.teamId === tId && (Array.isArray(type) ? type.includes(e.type) : e.type === type))
        .map((e: any) => ({ 
          ...e, 
          minutes: e.minute || 0, 
          timeType: e.timeType || '1°', 
          detail: e.detail || '', 
          x: e.detail && e.type === 'LINEUP' ? JSON.parse(e.detail).x : 0, 
          y: e.detail && e.type === 'LINEUP' ? JSON.parse(e.detail).y : 0 
        }))

      let hM = [], aM = []
      if (data.homeTeam?.id) {
        const hr = await fetch(`/api/teams/${data.homeTeam.id}/members`, { headers: { Authorization: `Bearer ${token}` } })
        if (hr.ok) hM = await hr.json()
      }
      if (data.awayTeam?.id) {
        const ar = await fetch(`/api/teams/${data.awayTeam.id}/members`, { headers: { Authorization: `Bearer ${token}` } })
        if (ar.ok) aM = await ar.json()
      }

      setHG(parse(data.homeTeam?.id, 'GOAL')); 
      setHC(parse(data.homeTeam?.id, ['YELLOW_CARD', 'RED_CARD', 'DOUBLE_YELLOW_CARD'])); 
      setHF(parse(data.homeTeam?.id, 'FOUL')); 
      setHS(parse(data.homeTeam?.id, 'SUBSTITUTION')); 
      setHO(parse(data.homeTeam?.id, 'OWN_GOAL')); 
      setHK(parse(data.homeTeam?.id, 'GOALKEEPER')); 
      setHHi(parse(data.homeTeam?.id, 'HIGHLIGHT')); 
      setHL(parse(data.homeTeam?.id, 'LINEUP'))

      setAG(parse(data.awayTeam?.id, 'GOAL')); 
      setAC(parse(data.awayTeam?.id, ['YELLOW_CARD', 'RED_CARD', 'DOUBLE_YELLOW_CARD'])); 
      setAF(parse(data.awayTeam?.id, 'FOUL')); 
      setAS(parse(data.awayTeam?.id, 'SUBSTITUTION')); 
      setAO(parse(data.awayTeam?.id, 'OWN_GOAL')); 
      setAK(parse(data.awayTeam?.id, 'GOALKEEPER')); 
      setAHi(parse(data.awayTeam?.id, 'HIGHLIGHT')); 
      setAL(parse(data.awayTeam?.id, 'LINEUP'))

      setMatch((p: any) => ({ 
        ...p, 
        homeTeam: p.homeTeam ? { ...p.homeTeam, players: hM } : null, 
        awayTeam: p.awayTeam ? { ...p.awayTeam, players: aM } : null 
      }))
    } catch (err: any) {
      alert(err.message)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('token')
      const serialize = (evs: any[], tId: string | undefined) => {
        if (!tId) return []
        return evs.map(e => {
          const m = parseInt(e.minutes as any);
          return {
            teamId: tId, 
            playerId: e.playerId || null, 
            assistId: e.assistId || null,
            type: e.type, 
            minute: isNaN(m) ? null : m, 
            second: 0,
            timeType: e.timeType || '1°', 
            detail: e.type === 'LINEUP' ? JSON.stringify({ x: e.x, y: e.y }) : (e.detail || '')
          }
        })
      }
      
      const all = [
        ...serialize(hG, match.homeTeam?.id), ...serialize(aG, match.awayTeam?.id),
        ...serialize(hC, match.homeTeam?.id), ...serialize(aC, match.awayTeam?.id),
        ...serialize(hF, match.homeTeam?.id), ...serialize(aF, match.awayTeam?.id),
        ...serialize(hS, match.homeTeam?.id), ...serialize(aS, match.awayTeam?.id),
        ...serialize(hO, match.homeTeam?.id), ...serialize(aO, match.awayTeam?.id),
        ...serialize(hK, match.homeTeam?.id), ...serialize(aK, match.awayTeam?.id),
        ...serialize(hHi, match.homeTeam?.id), ...serialize(aHi, match.awayTeam?.id),
        ...serialize(hL, match.homeTeam?.id), ...serialize(aL, match.awayTeam?.id),
      ].filter(e => e.type)

      const isNR = st === 'NO_REALIZADO'
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          status: st, 
          homeScore: isNR ? null : (hG.length + aO.length), 
          awayScore: isNR ? null : (aG.length + hO.length), 
          homePenaltyScore: homePenalties === '' ? null : Number(homePenalties),
          awayPenaltyScore: awayPenalties === '' ? null : Number(awayPenalties),
          advancingTeamId: advancingTeamId || null,
          events: all 
        })
      })
      if (!res.ok) throw new Error('Error al guardar los cambios')
      onClose()
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return null

  return (
    <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[85vh] flex flex-col shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden animate-in zoom-in-95 duration-500">
      {/* Slim Header */}
      <div className="bg-slate-900 px-8 py-5 text-white flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black tracking-tight">{match.homeTeam.name} <span className="text-blue-400 mx-2">{hG.length + aO.length} : {aG.length + hO.length}</span> {match.awayTeam.name}</h2>
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

      {/* DESEMPATE / PASE DE RONDA */}
      {match && ['Cuartos de final', 'Cuartos', 'Semifinal', 'Final'].includes(match.roundName) && (
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Definición</h3>
          </div>
          <div className="flex flex-wrap gap-8 items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            {['Cuartos de final', 'Cuartos'].includes(match.roundName) && (
              <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl">
                <input type="checkbox" id="advCheck" checked={useAdvantage} onChange={e => setUseAdvantage(e.target.checked)} className="w-5 h-5 rounded accent-blue-600 cursor-pointer" />
                <label htmlFor="advCheck" className="text-xs font-black text-blue-900 cursor-pointer uppercase tracking-wider">Aplicar Ventaja Deportiva</label>
              </div>
            )}
            
            {(!['Cuartos de final', 'Cuartos'].includes(match.roundName) || !useAdvantage) && (
              <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Penales:</span>
                <div className="flex items-center gap-2">
                  <input type="number" placeholder="0" value={homePenalties} onChange={e => setHomePenalties(e.target.value ? Number(e.target.value) : '')} className="w-14 bg-white text-center rounded-lg border border-slate-200 text-sm font-black py-1" />
                  <span className="text-slate-400 font-bold">-</span>
                  <input type="number" placeholder="0" value={awayPenalties} onChange={e => setAwayPenalties(e.target.value ? Number(e.target.value) : '')} className="w-14 bg-white text-center rounded-lg border border-slate-200 text-sm font-black py-1" />
                </div>
              </div>
            )}

            <div className="flex-1 flex items-center justify-end gap-3 min-w-[250px]">
               <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Avanza:</span>
               <select value={advancingTeamId} onChange={e => setAdvancingTeamId(e.target.value)} className="bg-slate-900 text-white font-black text-xs px-4 py-3 rounded-xl outline-none shadow-md flex-1">
                 <option value="">- SELECCIONAR GANADOR -</option>
                 <option value={match.homeTeam.id}>{match.homeTeam.name} {match.advantageTeamId === match.homeTeam.id && '(V)'}</option>
                 <option value={match.awayTeam.id}>{match.awayTeam.name} {match.advantageTeamId === match.awayTeam.id && '(V)'}</option>
               </select>
            </div>
          </div>
        </div>
      )}

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
          {tab === 'goles' && <RowFormSection title="⚽ Goles anotados" evs={goals} setEvs={setGoals} players={team.players || []} color={color} assist={true} type="GOAL" pLabel="Goleador" aLabel="Asistente" isGoalType={true} />}
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

function RowFormSection({ title, evs, setEvs, players, color, assist, aLabel = 'Asistente', pLabel = 'Jugador', isType, opts, detail, type, isGoalType }: any) {
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
                {isGoalType && (
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => up(e.id, 'detail', 'JUGADA')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${e.detail !== 'PENAL' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}>Jugada</button>
                    <button onClick={() => up(e.id, 'detail', 'PENAL')} className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${e.detail === 'PENAL' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'}`}>Penal</button>
                  </div>
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
    scorers: {} as Record<string, { name: string; team: string; goals: number; penalties: number }>,
    yellowCards: {} as Record<string, { name: string; team: string; count: number }>,
    redCards: {} as Record<string, { name: string; team: string; count: number }>,
  }

  matches.forEach(m => {
    const hS = m.homeScore
    const aS = m.awayScore
    if (hS !== null) stats.goals += hS
    if (aS !== null) stats.goals += aS
    
    m.events?.forEach((e: any) => {
      const pName = e.player?.name;
      const tName = e.team?.name || ''
      if (e.type === 'GOAL' || e.type === 'OWN_GOAL') {
        const isPenal = e.detail === 'PENAL'
        const displayName = pName ? (e.type === 'OWN_GOAL' ? `${pName} (A.G.)` : pName) : (e.type === 'OWN_GOAL' ? 'Autogol' : 'Desconocido')
        const key = e.type === 'OWN_GOAL' ? `AG_${pName || 'anon'}_${e.id}` : (pName || 'Desconocido')
        
        if (!stats.scorers[key]) (stats.scorers as any)[key] = { name: displayName, team: tName, goals: 0, penalties: 0 }
        stats.scorers[key].goals++
        if (isPenal) stats.scorers[key].penalties++
      } else if (e.type === 'YELLOW_CARD') {
        if (!stats.yellowCards[pName]) stats.yellowCards[pName] = { name: pName, team: tName, count: 0 }
        stats.yellowCards[pName].count++
      } else if (e.type === 'RED_CARD' || e.type === 'DOUBLE_YELLOW_CARD') {
        if (!stats.redCards[pName]) stats.redCards[pName] = { name: pName, team: tName, count: 0 }
        stats.redCards[pName].count++
      }
    })
  })

  const topScorers = Object.values(stats.scorers).sort((a, b) => b.goals - a.goals).slice(0, 10)
  const topYellows = Object.values(stats.yellowCards).sort((a, b) => b.count - a.count).slice(0, 5)
  const topReds = Object.values(stats.redCards).sort((a, b) => b.count - a.count).slice(0, 5)

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
          <div className="bg-slate-900 text-white p-3 text-center text-[10px] font-black uppercase tracking-widest">Goleadores</div>
          <div className="divide-y divide-slate-50">
            {topScorers.length === 0 ? <div className="p-4 text-center text-[10px] text-slate-300 font-black italic">Sin datos</div> : topScorers.map((s, i) => (
              <div key={i} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px]">👤</div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-700 uppercase">{s.name} {s.penalties > 0 ? `(${s.penalties} P)` : ''}</span>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{s.team}</span>
                  </div>
                </div>
                <span className="text-sm font-black text-slate-900">{s.goals}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-6">
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

        <section>
          <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
            <div className="bg-slate-900 text-white p-3 text-center text-[10px] font-black uppercase tracking-widest text-red-500">Tarjeta Roja</div>
            <div className="divide-y divide-slate-50">
              {topReds.length === 0 ? <div className="p-4 text-center text-[10px] text-slate-300 font-black italic">Sin datos</div> : topReds.map(s => (
                <div key={s.name} className="p-3 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-[10px]">👤</div>
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
    </div>
  )
}