"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Match {
  id: string
  homeTeam: { id: string; name: string; logo: string | null; color: string | null } | null
  awayTeam: { id: string; name: string; logo: string | null; color: string | null } | null
  homeScore: number | null
  awayScore: number | null
  status: string
  matchDate: string
  roundName: string
  roundOrder: number
  phaseName: string | null
  phaseId: string | null
  groupName: string | null
  advantageTeamId: string | null
  homePlaceholder: string | null
  awayPlaceholder: string | null
  location: string | null
  referee: string | null
  notes: string | null
  events?: any[]
}

export default function PublicTournamentPage() {
  const params = useParams()
  const router = useRouter()
  const tournamentId = params.id as string

  const [tournament, setTournament] = useState<any>(null)
  const [categories, setCategories] = useState<any[]>([])
  const [activeCategory, setActiveCategory] = useState<any | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [tournamentTeams, setTournamentTeams] = useState<any[]>([])
  const [phases, setPhases] = useState<any[]>([])
  
  const [selectedPhase, setSelectedPhase] = useState('1° Fase')
  const [selectedRound, setSelectedRound] = useState('')
  const [activeTab, setActiveTab] = useState<'fixture' | 'standings' | 'teams' | 'bracket'>('fixture')
  
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null)
  const [teamRoster, setTeamRoster] = useState<any | null>(null)
  const [loadingRoster, setLoadingRoster] = useState(false)

  const firstPhaseName = phases.length > 0 ? phases[0].name : '1° Fase'

  // Fetch initial tournament data and categories
  useEffect(() => {
    async function loadTournament() {
      try {
        const tRes = await fetch(`/api/tournaments/${tournamentId}`)
        if (!tRes.ok) throw new Error('Torneo no encontrado')
        const tData = await tRes.json()
        setTournament(tData)

        // Fetch categories
        const catRes = await fetch(`/api/categories?tournamentId=${tournamentId}`)
        if (catRes.ok) {
          const catData = await catRes.json()
          setCategories(catData)
          if (catData.length > 0) {
            // Auto-select first category in category format
            setActiveCategory(catData[0])
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (!tournament) setLoading(false)
      }
    }
    loadTournament()
  }, [tournamentId])

  // Fetch details when active category changes
  useEffect(() => {
    if (!tournament) return
    if (tournament.format === 'categorias' && !activeCategory) return

    async function loadCategoryData() {
      setLoading(true)
      const categoryQuery = activeCategory ? `&categoryId=${activeCategory.id}` : ''
      
      try {
        const [mRes, tRes, pRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}/matches?t=${Date.now()}${categoryQuery}`),
          fetch(`/api/tournaments/${tournamentId}/teams?t=${Date.now()}${categoryQuery}`),
          fetch(`/api/tournaments/${tournamentId}/phases?t=${Date.now()}${categoryQuery}`),
        ])

        if (pRes.ok) {
          const pData = await pRes.json()
          setPhases(pData)
          if (pData.length > 0 && !pData.some((p: any) => p.name === selectedPhase)) {
            setSelectedPhase(pData[0].name)
          }
        } else {
          setPhases([])
        }

        if (mRes.ok) {
          const mData = await mRes.json()
          setMatches(mData)
        } else {
          setMatches([])
        }

        if (tRes.ok) {
          setTournamentTeams(await tRes.json())
        } else {
          setTournamentTeams([])
        }
      } catch (err) {
        console.error('Error loading tournament details:', err)
      } finally {
        setLoading(false)
      }
    }

    loadCategoryData()
  }, [tournament, activeCategory])

  // Select first round of selected phase automatically
  useEffect(() => {
    const phaseRoundsWithOrder = Array.from(
      new Set(
        matches
          .filter((x: any) => (x.phaseName || firstPhaseName) === selectedPhase)
          .map((x: any) => String(x.roundName))
      )
    ).map(r => {
      const firstMatch = matches.find(
        (x: any) => (x.phaseName || firstPhaseName) === selectedPhase && String(x.roundName) === r
      )
      return { name: r, order: firstMatch?.roundOrder || 0 }
    }).sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order
      if (!isNaN(Number(a.name)) && !isNaN(Number(b.name))) return Number(a.name) - Number(b.name)
      return a.name.localeCompare(b.name)
    })

    const phaseRounds = phaseRoundsWithOrder.map(r => r.name)
    if (phaseRounds.length > 0 && (!selectedRound || !phaseRounds.includes(selectedRound))) {
      setSelectedRound(phaseRounds[0])
    }
  }, [matches, selectedPhase, selectedRound, firstPhaseName])

  // Load team roster details
  const handleViewTeamRoster = async (team: any) => {
    setSelectedTeam(team)
    setTeamRoster(null)
    setLoadingRoster(true)
    try {
      const res = await fetch(`/api/teams/${team.id}`)
      if (res.ok) {
        const data = await res.json()
        setTeamRoster(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRoster(false)
    }
  }

  // Real-time Standings calculations
  const getStandings = (forceFlat: boolean = false, targetPhaseName?: string) => {
    const activePhaseName = targetPhaseName || selectedPhase
    const stats: Record<string, any> = {}
    
    // Find current phase object to get its specific teams
    const currentPhaseObj = phases.find(p => p.name === activePhaseName)
    let phaseTeamIds: string[] | null = null
    if (currentPhaseObj?.teams) {
      try {
        const teamsParsed = typeof currentPhaseObj.teams === 'string' ? JSON.parse(currentPhaseObj.teams) : currentPhaseObj.teams
        if (Array.isArray(teamsParsed) && teamsParsed.length > 0) {
          phaseTeamIds = teamsParsed
        }
      } catch (e) { }
    }

    tournamentTeams.forEach(tt => { 
      if (!phaseTeamIds || phaseTeamIds.includes(tt.team.id)) {
        stats[tt.team.id] = { id: tt.team.id, name: tt.team.name, logo: tt.team.logo || null, color: tt.team.color || null, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0, red: 0, yellow: 0 } 
      }
    })
    
    // Gather all phases to include
    const phaseNamesToInclude = [activePhaseName]
    let currentIterPhase = currentPhaseObj
    while (currentIterPhase && currentIterPhase.continueFromId) {
      const parentPhase = phases.find((p: any) => p.id === currentIterPhase!.continueFromId)
      if (parentPhase && !phaseNamesToInclude.includes(parentPhase.name)) {
        phaseNamesToInclude.push(parentPhase.name)
        currentIterPhase = parentPhase
      } else {
        break
      }
    }
    
    const phaseMatches = matches.filter((m: any) => phaseNamesToInclude.includes(m.phaseName || firstPhaseName))
    
    phaseMatches.forEach(m => {
      const hS = m.homeScore
      const aS = m.awayScore
      const st = m.status
      const isWO = m.notes === 'W.O'
      const advTeam = m.advantageTeamId
      if (hS !== null && aS !== null && st !== 'NO_REALIZADO') {
        const h = stats[m.homeTeam?.id || '']; 
        const a = stats[m.awayTeam?.id || ''];
        if (h) {
          h.played++;
          h.gf += hS;
          h.ga += aS;
          if (isWO && advTeam) {
            if (advTeam === m.homeTeam?.id) { h.won++; h.points += 3 }
            else if (advTeam === m.awayTeam?.id) { h.lost++ }
            else { h.drawn++; h.points++ }
          } else {
            if (hS > aS) { h.won++; h.points += 3 }
            else if (hS < aS) { h.lost++ }
            else { h.drawn++; h.points++ }
          }
        }
        if (a) {
          a.played++;
          a.gf += aS;
          a.ga += hS;
          if (isWO && advTeam) {
            if (advTeam === m.awayTeam?.id) { a.won++; a.points += 3 }
            else if (advTeam === m.homeTeam?.id) { a.lost++ }
            else { a.drawn++; a.points++ }
          } else {
            if (aS > hS) { a.won++; a.points += 3 }
            else if (aS < hS) { a.lost++ }
            else { a.drawn++; a.points++ }
          }
        }
      }
      
      // Count cards
      (m.events || []).forEach((e: any) => {
        const teamStats = stats[e.teamId]
        if (!teamStats) return
        if (e.type === 'RED_CARD' || e.type === 'DOUBLE_YELLOW_CARD') teamStats.red++
        else if (e.type === 'YELLOW_CARD') teamStats.yellow++
      })
    })

    const criteria = (activeCategory?.classificationCriteria || tournament?.classificationCriteria || 'PUNTOS,GOLES,GOLES_A_FAVOR,RESULTADOS_ENTRE_SI,TARJETAS_AMARILLAS,TARJETAS_ROJAS,W_O').split(',')

    const sortedStandings = Object.values(stats).map(s => {
      const tt = tournamentTeams.find(t => t.team.id === s.id)
      return {
        ...s,
        groupName: tt?.groupName || null,
        order: tt?.order || 0,
        diff: s.gf - s.ga,
        perc: s.played > 0 ? Math.round((s.points / (s.played * 3)) * 100) : 0
      }
    }).sort((a: any, b: any) => {
      if (a.order !== b.order) return a.order - b.order
      for (const criterion of criteria) {
        if (criterion === 'PUNTOS' && b.points !== a.points) return b.points - a.points
        if (criterion === 'GOLES' && b.diff !== a.diff) return b.diff - a.diff
        if (criterion === 'GOLES_A_FAVOR' && b.gf !== a.gf) return b.gf - a.gf
        if (criterion === 'TARJETAS_AMARILLAS' && a.yellow !== b.yellow) return a.yellow - b.yellow
        if (criterion === 'TARJETAS_ROJAS' && a.red !== b.red) return a.red - b.red
      }
      return a.name.localeCompare(b.name)
    })

    // If forceFlat is true, return flat standings. Otherwise, if grouped format, group them.
    const hasGroups = tournamentTeams.some(t => t.groupName !== null && t.groupName !== undefined && t.groupName.trim() !== '')
    if (hasGroups && !forceFlat) {
      const groups: Record<string, any[]> = {}
      sortedStandings.forEach(s => {
        const gName = s.groupName || 'Sin Grupo'
        if (!groups[gName]) groups[gName] = []
        groups[gName].push(s)
      })
      return groups
    }

    return sortedStandings
  }

  if (loading && !tournament) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
        </div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest animate-pulse">Cargando Torneo...</p>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
        <span className="text-6xl">⚠️</span>
        <h1 className="text-2xl font-black">Torneo no encontrado</h1>
        <p className="text-slate-400 text-sm">El enlace provisto es inválido o el torneo ha sido removido.</p>
        <Link href="/" className="mt-4 bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-2xl font-black text-sm uppercase tracking-wider transition-all active:scale-95 shadow-lg">Ir a Inicio</Link>
      </div>
    )
  }

  const currentPhaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase)
  const currentPhaseRounds = Array.from(new Set(currentPhaseMatches.map(m => String(m.roundName)))).map(r => {
    const firstMatch = currentPhaseMatches.find(x => String(x.roundName) === r)
    return { name: r, order: firstMatch?.roundOrder || 0 }
  }).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    if (!isNaN(Number(a.name)) && !isNaN(Number(b.name))) return Number(a.name) - Number(b.name)
    return a.name.localeCompare(b.name)
  }).map(r => r.name)

  const activeRoundMatches = currentPhaseMatches.filter(m => String(m.roundName) === selectedRound)
  const activePhase = phases.find(p => p.name === selectedPhase)
  const standings = getStandings()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* HEADER BANNER */}
      <div className="relative h-64 bg-slate-900 border-b border-slate-800 overflow-hidden shadow-2xl flex flex-col justify-end">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30" 
          style={{ backgroundImage: `url('${tournament.banner || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600'}')` }}
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent"></div>
        
        <div className="max-w-7xl mx-auto w-full px-6 pb-6 relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex items-center gap-5">
            {tournament.logo ? (
              <img src={tournament.logo} alt="Logo" className="w-20 h-20 rounded-2xl object-cover bg-slate-800 border-2 border-slate-700 shadow-xl" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-3xl text-white shadow-xl border border-blue-500/30">🏆</div>
            )}
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-1.5">{tournament.name}</h1>
              <p className="text-slate-400 text-xs font-semibold flex items-center gap-2 italic">
                Organizado por <span className="text-blue-400 not-italic font-bold">{tournament.organizer?.name}</span>
                {tournament.description && (
                  <>
                    <span className="text-slate-600 font-normal">|</span>
                    <span className="text-slate-400 font-normal normal-case not-italic">{tournament.description}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
              🟢 Público
            </span>
            <span className="bg-slate-800 text-slate-300 border border-slate-700 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
              {tournament.sportType.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8 flex flex-col gap-8">
        {/* CATEGORY SELECTOR */}
        {tournament.format === 'categorias' && categories.length > 0 && (
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-3 rounded-3xl flex flex-wrap gap-2 shadow-xl">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat)
                  setSelectedRound('')
                }}
                className={`px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
                  activeCategory?.id === cat.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 scale-105'
                    : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                📁 {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* MAIN NAVIGATION TABS */}
        <div className="flex border-b border-slate-800/80 overflow-x-auto scrollbar-none gap-2">
          {[
            { id: 'fixture', name: '📅 Fixture / Partidos' },
            { id: 'standings', name: '📊 Clasificación' },
            { id: 'teams', name: '🛡️ Equipos' },
            { id: 'bracket', name: '🏆 Eliminatorias' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-6 py-4 font-black text-sm uppercase tracking-wider border-b-2 transition-all shrink-0 ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500 bg-blue-500/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* MAIN CONTENT AREA */}
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-4">
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
              <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 min-h-[400px]">
            {/* TABS CONTAINER */}
            
            {/* T1: FIXTURE / MATCHES */}
            {activeTab === 'fixture' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {phases.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                    <span className="text-4xl">🗓️</span>
                    <p className="mt-2 text-slate-400 text-sm font-bold">Aún no se han programado partidos para este torneo.</p>
                  </div>
                ) : (
                  <>
                    {/* PHASE & ROUND CONTROLS */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-slate-900/40 p-4 rounded-[2rem] border border-slate-800/80 backdrop-blur-xl">
                      {/* Phase Dropdown */}
                      <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-2xl border border-slate-800">
                        <span className="text-slate-500 text-xs font-bold uppercase">Fase:</span>
                        <select
                          value={selectedPhase}
                          onChange={(e) => {
                            setSelectedPhase(e.target.value)
                            setSelectedRound('')
                          }}
                          className="bg-transparent text-sm font-black text-slate-200 focus:outline-none cursor-pointer"
                        >
                          {phases.map(p => (
                            <option key={p.id} value={p.name} className="bg-slate-950 text-slate-200">{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Rounds list slider */}
                      {currentPhaseRounds.length > 0 && (
                        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
                          {currentPhaseRounds.map((round) => (
                            <button
                              key={round}
                              onClick={() => setSelectedRound(round)}
                              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                                selectedRound === round
                                  ? 'bg-blue-600 text-white shadow-md'
                                  : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-800'
                              }`}
                            >
                              Fecha {round}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* MATCHES LIST */}
                    {activeRoundMatches.length === 0 ? (
                      <div className="text-center py-16 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                        <span className="text-4xl">🌴</span>
                        <p className="mt-2 text-slate-400 text-sm font-bold">No hay partidos cargados para esta fecha.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {activeRoundMatches.map((m) => {
                          const isBye = m.notes === 'FECHA_LIBRE'
                          const isCompleted = m.status === 'FINALIZADO'
                          
                          if (isBye) {
                            const playingTeam = m.homeTeam || m.awayTeam
                            return (
                              <div
                                key={m.id}
                                className="bg-gradient-to-br from-emerald-950/20 to-slate-900/60 border border-emerald-500/20 p-6 rounded-[2rem] shadow-xl flex items-center justify-between relative overflow-hidden group"
                              >
                                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
                                <div className="flex items-center gap-4">
                                  {playingTeam?.logo ? (
                                    <img src={playingTeam.logo} alt="Logo" className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700" />
                                  ) : (
                                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-lg text-slate-400">🛡️</div>
                                  )}
                                  <div>
                                    <h3 className="font-black text-base text-slate-200 group-hover:text-emerald-400 transition-colors">{playingTeam?.name || 'Equipo'}</h3>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                      <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/15">Fecha Libre</span>
                                      <span className="text-slate-500 text-[10px] font-bold">🌴 Descansa esta ronda</span>
                                    </div>
                                  </div>
                                </div>
                                <span className="text-3xl filter saturate-75 select-none animate-bounce duration-1000">🌴</span>
                              </div>
                            )
                          }

                          return (
                            <div
                              key={m.id}
                              onClick={() => setSelectedMatch(m)}
                              className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 rounded-[2rem] shadow-xl hover:border-slate-700/80 hover:shadow-2xl transition-all duration-300 active:scale-[0.99] cursor-pointer flex flex-col gap-4 relative group"
                            >
                              {/* Header details */}
                              <div className="flex items-center justify-between text-[10px] font-black tracking-widest text-slate-500 uppercase">
                                <div className="flex items-center gap-1.5">
                                  {m.groupName && <span className="bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800/50 text-slate-400">{m.groupName}</span>}
                                  <span>{m.location || 'Cancha general'}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {isCompleted ? (
                                    <span className="bg-slate-850 text-slate-400 px-2.5 py-0.5 rounded-lg border border-slate-800 font-bold uppercase tracking-wider">Finalizado</span>
                                  ) : (
                                    <span className="bg-blue-500/10 text-blue-400 px-2.5 py-0.5 rounded-lg border border-blue-500/10 font-bold uppercase tracking-wider animate-pulse">Programado</span>
                                  )}
                                </div>
                              </div>

                              {/* Core teams and scores area */}
                              <div className="flex items-center justify-between gap-4 py-2">
                                {/* Home Team */}
                                <div className="flex-1 flex items-center gap-3 min-w-0">
                                  {m.homeTeam?.logo ? (
                                    <img src={m.homeTeam.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-slate-700 shadow-md" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-500 shadow-md">🛡️</div>
                                  )}
                                  <span className="font-black text-sm text-slate-200 truncate">{m.homeTeam?.name || m.homePlaceholder || 'Equipo 1'}</span>
                                </div>

                                {/* Score row */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800/60 font-black text-base shadow-inner">
                                  <span className={`w-8 text-center ${m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore ? 'text-blue-400' : 'text-slate-400'}`}>
                                    {m.homeScore !== null ? m.homeScore : '-'}
                                  </span>
                                  <span className="text-slate-600 font-medium text-xs">:</span>
                                  <span className={`w-8 text-center ${m.homeScore !== null && m.awayScore !== null && m.awayScore > m.homeScore ? 'text-blue-400' : 'text-slate-400'}`}>
                                    {m.awayScore !== null ? m.awayScore : '-'}
                                  </span>
                                </div>

                                {/* Away Team */}
                                <div className="flex-1 flex items-center justify-end gap-3 min-w-0 text-right">
                                  <span className="font-black text-sm text-slate-200 truncate">{m.awayTeam?.name || m.awayPlaceholder || 'Equipo 2'}</span>
                                  {m.awayTeam?.logo ? (
                                    <img src={m.awayTeam.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-slate-700 shadow-md" />
                                  ) : (
                                    <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-500 shadow-md">🛡️</div>
                                  )}
                                </div>
                              </div>

                              {/* Footer details */}
                              <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold border-t border-slate-800/40 pt-3">
                                <span>📅 {new Date(m.matchDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                {m.notes && <span className="italic text-slate-400">{m.notes}</span>}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* T2: STANDINGS */}
            {activeTab === 'standings' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {Object.keys(standings).length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                    <span className="text-4xl">📊</span>
                    <p className="mt-2 text-slate-400 text-sm font-bold">No hay equipos inscriptos para calcular posiciones.</p>
                  </div>
                ) : (
                  <>
                    {/* Render helper function to paint single flat table */}
                    {(() => {
                      const renderTable = (list: any[], title?: string) => (
                        <div className="bg-slate-900/40 border border-slate-800/80 rounded-[2.5rem] overflow-hidden shadow-2xl backdrop-blur-xl">
                          {title && (
                            <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-4">
                              <h3 className="font-black text-sm uppercase tracking-widest text-blue-400">Grupo {title}</h3>
                            </div>
                          )}
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-slate-800 text-[10px] text-slate-400 font-black uppercase tracking-widest bg-slate-950/20">
                                  <th className="py-4 px-6 text-center w-12">#</th>
                                  <th className="py-4 px-2 min-w-[200px]">Equipo</th>
                                  <th className="py-4 px-3 text-center w-14">PTS</th>
                                  <th className="py-4 px-3 text-center w-12">PJ</th>
                                  <th className="py-4 px-3 text-center w-12">PG</th>
                                  <th className="py-4 px-3 text-center w-12">PE</th>
                                  <th className="py-4 px-3 text-center w-12">PP</th>
                                  <th className="py-4 px-3 text-center w-14">GF</th>
                                  <th className="py-4 px-3 text-center w-14">GC</th>
                                  <th className="py-4 px-3 text-center w-14">DG</th>
                                  <th className="py-4 px-4 text-center w-16">% Rend</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-800/50 font-medium">
                                {list.map((row: any, idx: number) => (
                                  <tr key={row.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="py-3.5 px-6 text-center">
                                      <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-black text-xs ${
                                        idx === 0 ? 'bg-blue-600/20 text-blue-400' :
                                        idx === 1 ? 'bg-slate-800 text-slate-300' :
                                        'text-slate-500'
                                      }`}>{idx + 1}</span>
                                    </td>
                                    <td className="py-3.5 px-2">
                                      <div className="flex items-center gap-3">
                                        {row.logo ? (
                                          <img src={row.logo} className="w-7 h-7 rounded-lg object-cover bg-slate-800" />
                                        ) : (
                                          <div className="w-7 h-7 rounded-lg bg-slate-850 flex items-center justify-center text-slate-500 font-bold">🛡️</div>
                                        )}
                                        <span className="font-black text-slate-200 text-sm">{row.name}</span>
                                      </div>
                                    </td>
                                    <td className="py-3.5 px-3 text-center font-black text-blue-400 text-sm bg-blue-500/5">{row.points}</td>
                                    <td className="py-3.5 px-3 text-center text-slate-300">{row.played}</td>
                                    <td className="py-3.5 px-3 text-center text-emerald-400">{row.won}</td>
                                    <td className="py-3.5 px-3 text-center text-slate-400">{row.drawn}</td>
                                    <td className="py-3.5 px-3 text-center text-red-400">{row.lost}</td>
                                    <td className="py-3.5 px-3 text-center text-slate-400">{row.gf}</td>
                                    <td className="py-3.5 px-3 text-center text-slate-400">{row.ga}</td>
                                    <td className={`py-3.5 px-3 text-center font-bold ${row.diff > 0 ? 'text-emerald-400' : row.diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                      {row.diff > 0 ? `+${row.diff}` : row.diff}
                                    </td>
                                    <td className="py-3.5 px-4 text-center text-slate-400">{row.perc}%</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )

                      const isGrouped = !Array.isArray(standings)
                      if (isGrouped) {
                        return (
                          <div className="space-y-8">
                            {Object.keys(standings).sort().map(groupLetter => (
                              renderTable(standings[groupLetter], groupLetter)
                            ))}
                          </div>
                        )
                      } else {
                        return renderTable(standings as any[])
                      }
                    })()}
                  </>
                )}
              </div>
            )}

            {/* T3: TEAMS LIST */}
            {activeTab === 'teams' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {tournamentTeams.length === 0 ? (
                  <div className="text-center py-16 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                    <span className="text-4xl">🛡️</span>
                    <p className="mt-2 text-slate-400 text-sm font-bold">No hay equipos registrados en el torneo aún.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
                    {tournamentTeams.map((tt) => (
                      <div
                        key={tt.id}
                        onClick={() => handleViewTeamRoster(tt.team)}
                        className="bg-slate-900/50 backdrop-blur-xl border border-slate-800/80 p-6 rounded-[2.5rem] shadow-lg text-center hover:border-slate-700 hover:shadow-2xl transition-all duration-300 active:scale-[0.98] cursor-pointer group relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        <div className="w-16 h-16 rounded-[1.25rem] bg-slate-800 border-2 border-slate-700/60 mx-auto flex items-center justify-center overflow-hidden mb-4 shadow-md group-hover:scale-105 transition-transform duration-300">
                          {tt.team.logo ? (
                            <img src={tt.team.logo} alt="Logo" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-2xl">🛡️</span>
                          )}
                        </div>
                        <h3 className="font-black text-sm text-slate-200 truncate group-hover:text-blue-400 transition-colors mb-1">{tt.team.name}</h3>
                        
                        <div className="flex items-center justify-center gap-1.5 mt-2">
                          <span className="bg-slate-950 px-2.5 py-0.5 rounded-lg border border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            🛡️ Ficha Rápida
                          </span>
                          {tt.groupName && (
                            <span className="bg-blue-600/15 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-lg text-[10px] font-black">
                              Grupo {tt.groupName}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* T4: BRACKET VIEW */}
            {activeTab === 'bracket' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {(() => {
                  const isKnockout = activePhase?.type === 'ELIMINATORIA'
                  if (!isKnockout) {
                    return (
                      <div className="text-center py-16 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                        <span className="text-4xl">🏆</span>
                        <p className="mt-2 text-slate-400 text-sm font-bold">Esta fase actual es de tipo Liga. Cambia a una fase Eliminatoria arriba para ver los cruces directos.</p>
                      </div>
                    )
                  }

                  const quarts = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase().includes('cuarto'))
                  const semis = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase().includes('semi'))
                  const finals = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase() === 'final')

                  if (quarts.length === 0 && semis.length === 0 && finals.length === 0) {
                    return (
                      <div className="text-center py-16 bg-slate-900/40 rounded-[2rem] border border-slate-800">
                        <span className="text-4xl">🏆</span>
                        <p className="mt-2 text-slate-400 text-sm font-bold">Aún no se han generado los cruces de llaves eliminatorias en esta fase.</p>
                      </div>
                    )
                  }

                  const renderMatchCard = (m: Match) => {
                    const isCompleted = m.status === 'FINALIZADO'
                    return (
                      <div
                        key={m.id}
                        onClick={() => setSelectedMatch(m)}
                        className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg hover:border-slate-700 transition-all cursor-pointer flex flex-col gap-2.5"
                      >
                        <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center justify-between">
                          <span>{m.roundName} {m.groupName}</span>
                          {isCompleted ? (
                            <span className="text-emerald-400">Finalizado</span>
                          ) : (
                            <span className="text-blue-400">Programado</span>
                          )}
                        </div>
                        
                        <div className="space-y-1.5">
                          {/* Home Row */}
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              {m.homeTeam?.logo ? (
                                <img src={m.homeTeam.logo} className="w-5 h-5 rounded-md object-cover bg-slate-800" />
                              ) : (
                                <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-slate-500 font-bold">🛡️</div>
                              )}
                              <span className={`font-black truncate ${m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore ? 'text-white' : 'text-slate-400'}`}>
                                {m.homeTeam?.name || m.homePlaceholder || 'Ganador'}
                              </span>
                            </div>
                            <span className="font-black text-slate-200 w-6 text-center">{m.homeScore !== null ? m.homeScore : '-'}</span>
                          </div>

                          {/* Away Row */}
                          <div className="flex items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2 min-w-0">
                              {m.awayTeam?.logo ? (
                                <img src={m.awayTeam.logo} className="w-5 h-5 rounded-md object-cover bg-slate-800" />
                              ) : (
                                <div className="w-5 h-5 rounded-md bg-slate-800 flex items-center justify-center text-slate-500 font-bold">🛡️</div>
                              )}
                              <span className={`font-black truncate ${m.homeScore !== null && m.awayScore !== null && m.awayScore > m.homeScore ? 'text-white' : 'text-slate-400'}`}>
                                {m.awayTeam?.name || m.awayPlaceholder || 'Ganador'}
                              </span>
                            </div>
                            <span className="font-black text-slate-200 w-6 text-center">{m.awayScore !== null ? m.awayScore : '-'}</span>
                          </div>
                        </div>
                      </div>
                    )
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                      {/* Cuartos */}
                      {quarts.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-800 pb-2">Cuartos de Final</h3>
                          {quarts.map(m => renderMatchCard(m))}
                        </div>
                      )}

                      {/* Semis */}
                      {semis.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-800 pb-2">Semifinales</h3>
                          {semis.map(m => renderMatchCard(m))}
                        </div>
                      )}

                      {/* Final */}
                      {finals.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-800 pb-2">Final</h3>
                          {finals.map(m => renderMatchCard(m))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p className="font-bold uppercase tracking-wider mb-2">CopaDepor</p>
        <p>Todos los derechos reservados. Impulsado por WAMP & Next.js.</p>
      </footer>

      {/* M1: MATCH DETAILS MODAL (READ-ONLY) */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-in fade-in" onClick={() => setSelectedMatch(null)}>
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-850 flex items-center justify-between bg-slate-950/40">
              <h2 className="font-black text-sm uppercase tracking-widest text-blue-400">Detalles del Partido</h2>
              <button onClick={() => setSelectedMatch(null)} className="w-8 h-8 rounded-full bg-slate-850 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Score banner */}
              <div className="flex items-center justify-between gap-4 bg-slate-950 p-6 rounded-[2rem] border border-slate-850/80 shadow-inner">
                {/* Home */}
                <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
                  {selectedMatch.homeTeam?.logo ? (
                    <img src={selectedMatch.homeTeam.logo} className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700 shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-lg shadow-md">🛡️</div>
                  )}
                  <span className="font-black text-xs text-slate-200 truncate w-full">{selectedMatch.homeTeam?.name || selectedMatch.homePlaceholder}</span>
                </div>

                {/* Score numbers */}
                <div className="flex items-center gap-3 font-black text-3xl text-slate-100">
                  <span>{selectedMatch.homeScore !== null ? selectedMatch.homeScore : '-'}</span>
                  <span className="text-slate-600 text-xl">:</span>
                  <span>{selectedMatch.awayScore !== null ? selectedMatch.awayScore : '-'}</span>
                </div>

                {/* Away */}
                <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
                  {selectedMatch.awayTeam?.logo ? (
                    <img src={selectedMatch.awayTeam.logo} className="w-12 h-12 rounded-xl object-cover bg-slate-800 border border-slate-700 shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-lg shadow-md">🛡️</div>
                  )}
                  <span className="font-black text-xs text-slate-200 truncate w-full">{selectedMatch.awayTeam?.name || selectedMatch.awayPlaceholder}</span>
                </div>
              </div>

              {/* TIMELINE OF EVENTS */}
              <div className="space-y-4">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-2 flex items-center gap-1.5">
                  <span>⏱️</span> Línea de Tiempo
                </h3>
                
                {(!selectedMatch.events || selectedMatch.events.length === 0) ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    No se han registrado goles ni tarjetas en este partido aún.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedMatch.events.map((e: any) => {
                      const icon = e.type === 'GOAL' ? '⚽' : e.type === 'YELLOW_CARD' ? '🟨' : e.type === 'RED_CARD' ? '🟥' : '📋'
                      const isHomeEvent = e.teamId === selectedMatch.homeTeam?.id
                      
                      return (
                        <div key={e.id} className={`flex items-center gap-3 text-xs ${isHomeEvent ? 'flex-row' : 'flex-row-reverse'}`}>
                          <span className="text-slate-400 font-bold w-12 text-center bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-850">
                            {e.minute ? `${e.minute}'` : 'S/T'}
                          </span>
                          <div className={`flex items-center gap-2 bg-slate-850/50 px-3.5 py-2 rounded-xl border border-slate-800 flex-1 max-w-[80%] ${isHomeEvent ? 'justify-start' : 'justify-end'}`}>
                            <span className="text-base leading-none">{icon}</span>
                            <span className="font-black text-slate-200">{e.player?.name || 'Jugador'}</span>
                            {e.assist?.name && <span className="text-[10px] text-slate-400">(Asist. {e.assist.name})</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Additional Meta details */}
              <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 space-y-2 text-xs text-slate-400">
                <div className="flex justify-between"><span className="font-bold text-slate-500">Fecha y Hora:</span> <span>{new Date(selectedMatch.matchDate).toLocaleString('es-ES')}</span></div>
                {selectedMatch.referee && <div className="flex justify-between"><span className="font-bold text-slate-500">Árbitro:</span> <span>{selectedMatch.referee}</span></div>}
                {selectedMatch.location && <div className="flex justify-between"><span className="font-bold text-slate-500">Lugar:</span> <span>{selectedMatch.location}</span></div>}
                {selectedMatch.notes && <div className="flex justify-between"><span className="font-bold text-slate-500">Notas:</span> <span className="italic text-blue-400">{selectedMatch.notes}</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* M2: TEAM ROSTER MODAL (READ-ONLY) */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[9999] backdrop-blur-md animate-in fade-in" onClick={() => setSelectedTeam(null)}>
          <div className="bg-slate-900 border border-slate-800 max-w-lg w-full rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-850 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                {selectedTeam.logo ? (
                  <img src={selectedTeam.logo} className="w-8 h-8 rounded-lg object-cover bg-slate-800" />
                ) : (
                  <span className="text-xl">🛡️</span>
                )}
                <h2 className="font-black text-sm uppercase tracking-widest text-slate-200">Plantel: {selectedTeam.name}</h2>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="w-8 h-8 rounded-full bg-slate-850 border border-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {loadingRoster ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/20"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-500 animate-spin"></div>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Cargando Roster...</span>
                </div>
              ) : !teamRoster ? (
                <div className="text-center py-8 text-slate-500 text-xs">Error al cargar el plantel.</div>
              ) : (
                <div className="space-y-6">
                  {/* Coach / DT details */}
                  {teamRoster.coach && (
                    <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-850 flex items-center justify-between text-xs">
                      <span className="font-black text-slate-400 uppercase tracking-widest">Entrenador / DT:</span>
                      <span className="font-black text-blue-400 text-sm">👤 {teamRoster.coach}</span>
                    </div>
                  )}

                  {/* Player list */}
                  <div className="space-y-3">
                    <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest border-b border-slate-850 pb-2">Jugadores Registrados</h3>
                    
                    {(!teamRoster.teamMembers || teamRoster.teamMembers.length === 0) && (!teamRoster.players || teamRoster.players.length === 0) ? (
                      <div className="text-center py-8 text-slate-500 text-xs">No hay jugadores registrados en este equipo aún.</div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {/* 1. Official Players (teamPlayers profile) */}
                        {teamRoster.players?.map((tp: any) => (
                          <div key={tp.id} className="flex items-center justify-between bg-slate-950/30 px-4 py-3 rounded-2xl border border-slate-850 hover:border-slate-800 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-black text-xs">
                                {tp.number !== null && tp.number !== undefined ? tp.number : '#'}
                              </span>
                              <span className="font-black text-slate-200 text-xs truncate">{tp.player?.user?.name || 'Jugador Oficial'}</span>
                            </div>
                            <span className="bg-blue-600/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">Oficial</span>
                          </div>
                        ))}

                        {/* 2. Local Players (teamMembers) */}
                        {teamRoster.teamMembers?.filter((m: any) => m.role === 'PLAYER').map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between bg-slate-950/30 px-4 py-3 rounded-2xl border border-slate-850 hover:border-slate-800 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 flex items-center justify-center font-black text-xs">
                                {m.number !== null && m.number !== undefined ? m.number : '#'}
                              </span>
                              <span className="font-black text-slate-200 text-xs truncate">{m.name}</span>
                            </div>
                            <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">Local</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
