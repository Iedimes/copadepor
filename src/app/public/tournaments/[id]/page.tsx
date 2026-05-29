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

type MenuType = 'inicio' | 'clasificacion' | 'estadisticas'

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
  const [messages, setMessages] = useState<any[]>([])
  
  const [activeMenu, setActiveMenu] = useState<MenuType>('inicio')
  const [selectedPhase, setSelectedPhase] = useState('1° Fase')
  const [selectedRound, setSelectedRound] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null)
  const [teamRoster, setTeamRoster] = useState<any | null>(null)
  const [loadingRoster, setLoadingRoster] = useState(false)

  const firstPhaseName = phases.length > 0 ? phases[0].name : '1° Fase'
  const sportType = activeCategory?.sportType || tournament?.sportType || ''
  const isBasketball = sportType === 'BALONCESTO' || sportType === 'BASQUET'

  // Fetch initial tournament data, categories and messages
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
          setCategories(await catRes.json())
        }

        // Fetch messages/announcements
        const msgRes = await fetch(`/api/tournaments/${tournamentId}/messages`)
        if (msgRes.ok) {
          setMessages(await msgRes.json())
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
          setMatches(await mRes.json())
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
    const phaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase)
    const phaseRoundsWithOrder = Array.from(new Set(phaseMatches.map((x: any) => String(x.roundName)))).map(r => {
      const firstMatch = phaseMatches.find((x: any) => String(x.roundName) === r)
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
        setTeamRoster(await res.json())
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoadingRoster(false)
    }
  }

  // Standings Ties & Points calculations
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
      const hS = m.homeScore; const aS = m.awayScore;
      const st = m.status; const isWO = m.notes === 'W.O';
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

  // Real-time statistical rankings
  const getTeamRankings = () => {
    const stats: Record<string, any> = {}
    tournamentTeams.forEach(tt => { 
      stats[tt.team.id] = { id: tt.team.id, name: tt.team.name, gf: 0, ga: 0, red: 0, yellow: 0, totalCards: 0 } 
    })

    matches.forEach(m => {
      const hS = m.homeScore; const aS = m.awayScore;
      if (hS !== null && aS !== null && m.status !== 'NO_REALIZADO') {
        const h = stats[m.homeTeam?.id || '']; const a = stats[m.awayTeam?.id || '']
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
          
          const pointsValue = isBasketball ? (parseInt(e.detail) || 2) : 1
          
          if (!scorers[key]) scorers[key] = { name: displayName, team: tName, goals: 0, penalties: 0 }
          scorers[key].goals += pointsValue
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

  const handlePhaseChange = (val: string) => {
    if (val === 'estadisticas') {
      setActiveMenu('estadisticas')
    } else {
      setActiveMenu('clasificacion')
      setSelectedPhase(val)
      setSelectedRound('')
    }
  }

  const getSportIcon = (s: string) => {
    if (s.includes('FUT')) return '⚽'
    if (s.includes('BASKET') || s.includes('BALONCESTO')) return '🏀'
    if (s.includes('VOLEY')) return '🏐'
    if (s.includes('TENIS')) return '🎾'
    return '🏆'
  }

  const sportIcon = getSportIcon(sportType)
  const activePhase = phases.find(p => p.name === selectedPhase)
  const standings = getStandings()
  const phaseMatches = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase)
  const phaseRoundsWithOrder = Array.from(new Set(phaseMatches.map((x: any) => String(x.roundName)))).map(r => {
    const firstMatch = phaseMatches.find((x: any) => String(x.roundName) === r)
    return { name: r, order: firstMatch?.roundOrder || 0 }
  }).sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order
    if (!isNaN(Number(a.name)) && !isNaN(Number(b.name))) return Number(a.name) - Number(b.name)
    return a.name.localeCompare(b.name)
  })
  const currentPhaseRounds = phaseRoundsWithOrder.map(r => r.name)
  const activeRoundMatches = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && String(m.roundName) === selectedRound)



  if (loading && !tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-4 border-blue-600/10"></div>
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
        </div>
        <p className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Cargando Vista Pública...</p>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4 text-center p-8">
        <span className="text-5xl">⚠️</span>
        <h1 className="text-xl font-black text-slate-800 mt-2">Torneo no encontrado</h1>
        <p className="text-slate-400 text-sm">El enlace provisto es inválido o el torneo ha sido removido.</p>
        <Link href="/" className="mt-4 bg-[#0A1128] hover:bg-blue-600 text-white px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all">Ir a Inicio</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex relative overflow-hidden font-sans antialiased text-slate-800">
      {/* SIDEBAR NAVIGATION */}
      <div className="w-64 bg-[#0A1128] text-slate-400 flex flex-col h-full z-10 border-r border-white/5 flex-shrink-0">
        <div className="p-8">
          <div 
            onClick={() => {
              if (tournament?.format === 'categorias') {
                setActiveCategory(null)
                setActiveMenu('inicio')
              }
            }}
            className={`flex items-center gap-3 mb-12 ${tournament?.format === 'categorias' ? 'cursor-pointer hover:opacity-80 transition-all' : ''}`}
          >
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-blue-500/20">🏆</div>
            <h1 className="text-xl font-black text-white tracking-tighter uppercase truncate">{tournament?.name}</h1>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => {
                if (tournament?.format === 'categorias') {
                  setActiveCategory(null)
                }
                setActiveMenu('inicio')
              }} 
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${activeMenu === 'inicio' ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
            >
              <span className="text-lg">🏠</span> Inicio
            </button>

            {(!tournament || tournament.format !== 'categorias' || activeCategory !== null) && (
              <>
                <button 
                  onClick={() => {
                    setActiveMenu('clasificacion')
                    if (phases.length > 0 && !phases.some(p => p.name === selectedPhase)) {
                      setSelectedPhase(phases[0].name)
                    }
                  }} 
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${(activeMenu === 'clasificacion' || activeMenu === 'estadisticas') ? 'bg-white/10 text-white shadow-sm' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                >
                  <span className="text-lg">📊</span> Clasificación
                </button>
              </>
            )}
          </nav>
        </div>

        {/* BOTTOM spectating badge */}
        <div className="mt-auto p-6 border-t border-white/5">
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300 text-xs">👀</div>
            <div className="flex flex-col min-w-0">
              <span className="text-[10px] font-black text-white uppercase tracking-widest">Espectador</span>
              <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mt-0.5 animate-pulse">● Vista Pública</span>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <div className="flex-1 p-8 overflow-y-auto flex flex-col h-full">
        {/* VIEW 1: CATEGORY PORTAL (If Categories tournament and no category is active) */}
        {tournament?.format === 'categorias' && !activeCategory ? (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
            {/* Banner Header */}
            <div className="relative h-64 rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl">
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-40" 
                style={{ backgroundImage: `url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600')` }}
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 p-8 flex flex-col md:flex-row md:items-end justify-between w-full">
                <div>
                  <h1 className="text-4xl font-black text-white mb-2">{tournament.name}</h1>
                  <p className="text-slate-300 font-medium flex items-center gap-2 italic">Organizado por <span className="text-blue-400 not-italic">{tournament?.organizer?.name}</span></p>
                </div>
                <div className="mt-4 md:mt-0 flex gap-3">
                  <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg">
                    🟢 Acceso Público
                  </span>
                </div>
              </div>
            </div>

            {/* Category portal list */}
            <div>
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Categorías Disponibles</div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map(cat => {
                  const catIcon = getSportIcon(cat.sportType || tournament.sportType)
                  return (
                    <div 
                      key={cat.id} 
                      onClick={() => setActiveCategory(cat)}
                      className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-200/50 p-8 hover:shadow-2xl hover:border-slate-300 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer relative overflow-hidden group flex flex-col gap-4"
                    >
                      <div className="absolute top-0 right-0 p-6 text-6xl opacity-[0.03] group-hover:opacity-[0.08] group-hover:scale-110 transition-all duration-500 font-black">{catIcon}</div>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl border border-blue-100 shadow-sm">{catIcon}</div>
                        <div>
                          <h3 className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{cat.name}</h3>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{cat.sportType.replace('_', ' ')}</span>
                        </div>
                      </div>
                      <p className="text-slate-400 text-xs font-semibold italic mt-2">
                        {cat.description || `Fixture y posiciones para ${cat.name}`}
                      </p>
                      <div className="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        <span>📊 Tabla y Fixture</span>
                        <span className="text-blue-500 group-hover:translate-x-1.5 transition-transform">Ingresar ➔</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* VIEW 2: ACTIVE CATEGORY PANEL */
          <div className="flex-1 flex flex-col h-full w-full">
            {/* V2.1: INICIO (Category Home & Messages/Announcements) */}
            {activeMenu === 'inicio' ? (
              <div className="max-w-3xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-10 relative overflow-hidden border border-slate-200/60">
                  <div className="absolute top-0 right-0 p-8 opacity-5 text-8xl font-black">{sportIcon}</div>
                  
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h1 className="text-4xl font-black text-slate-900 mb-2">{tournament.name}</h1>
                      {activeCategory && (
                        <p className="text-lg font-black text-blue-600 mt-1 uppercase tracking-wider flex items-center gap-2">🏷️ Categoría: {activeCategory.name}</p>
                      )}
                    </div>
                    {tournament?.format === 'categorias' && (
                      <button 
                        onClick={() => setActiveCategory(null)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm"
                      >
                        🗂️ Ver todas
                      </button>
                    )}
                  </div>

                  <p className="text-slate-400 font-bold mb-8 flex items-center gap-2 italic">Organizado por <span className="text-blue-600 not-italic">{tournament?.organizer?.name}</span></p>
                  
                  {/* MESSAGE BOARD / TIMELINE ANNOUNCEMENTS */}
                  <div className="border-t border-slate-100 pt-10">
                    <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                      <span>📢</span> Tablón de Anuncios
                    </h2>
                    
                    <div className="space-y-6">
                      {messages.length === 0 && (
                        <div className="text-center py-12 text-slate-300 font-black uppercase text-xs tracking-widest italic border border-dashed rounded-[2rem] p-6 bg-slate-50/50 border-slate-200">
                          Aún no se han publicado anuncios oficiales para este torneo.
                        </div>
                      )}
                      
                      {messages.map(m => (
                        <div key={m.id} className="p-6 bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-center mb-3">
                            <span className="font-black text-sm text-slate-800">👤 {m.sender.name}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{new Date(m.createdAt).toLocaleString()}</span>
                          </div>
                          <p className="text-slate-600 text-sm leading-relaxed">{m.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* V2.2: CLASIFICACION / FIXTURE & ESTADISTICAS VIEW (Replica of Admin!) */
              <div className="flex flex-col h-full max-w-[1600px] mx-auto w-full">
                {/* Title area */}
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h1 className="text-3xl font-black text-[#0A1128] tracking-tight">{tournament?.name}</h1>
                    {activeCategory && (
                      <p className="text-lg font-black text-blue-600 mt-1 uppercase tracking-wider flex items-center gap-2 animate-in fade-in duration-300">🏷️ Categoría: {activeCategory.name}</p>
                    )}
                  </div>
                  {tournament?.format === 'categorias' && (
                    <button 
                      onClick={() => setActiveCategory(null)}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-sm"
                    >
                      🗂️ Ver todas
                    </button>
                  )}
                </div>

                {/* Core Area: Fixture/Bracket & Standings Table Side-by-Side (Stacked on Mobile) */}
                <div className="flex flex-col xl:flex-row gap-8 w-full h-full">
                  {/* Left Column / Main Card: Matches Fixture / Bracket / Rankings */}
                  <div className="flex-1 max-w-[1000px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 border border-slate-200/60 overflow-y-auto relative min-h-[400px]">
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
                      </div>

                      {/* AREA 1: STATISTICS / GENERAL RANKINGS */}
                      {activeMenu === 'estadisticas' ? (
                        <div className="space-y-10 animate-in fade-in duration-500">
                          {/* Scorers & Disciplined List */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Scorers */}
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                              <div className="bg-blue-600 p-4 text-center">
                                <h3 className="text-white font-black uppercase tracking-widest text-sm">⚽ Tabla de Goleadores</h3>
                              </div>
                              <div className="p-4">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                      <th className="p-3 text-center w-12">#</th>
                                      <th className="p-3 text-left">Jugador</th>
                                      <th className="p-3 text-left">Club</th>
                                      <th className="p-3 text-center w-16">{isBasketball ? 'PTS' : 'GOLES'}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50 font-medium">
                                    {getTopScorers().length === 0 ? (
                                      <tr><td colSpan={4} className="p-12 text-center text-slate-350 font-bold italic text-xs uppercase tracking-widest">Sin registros</td></tr>
                                    ) : getTopScorers().map((p: any, i: number) => (
                                      <tr key={i} className="hover:bg-slate-50 transition-all">
                                        <td className="p-3 text-center font-black text-slate-400">{i+1}</td>
                                        <td className="p-3 font-black text-slate-800">{p.name}</td>
                                        <td className="p-3 text-slate-500">{p.team}</td>
                                        <td className="p-3 text-center font-black text-blue-600 text-sm bg-blue-500/5">{p.goals}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Discipline */}
                            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                              <div className="bg-red-500 p-4 text-center">
                                <h3 className="text-white font-black uppercase tracking-widest text-sm">🟨 Tabla de Sanciones</h3>
                              </div>
                              <div className="p-4">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                      <th className="p-3 text-center w-12">#</th>
                                      <th className="p-3 text-left">Jugador</th>
                                      <th className="p-3 text-left">Club</th>
                                      <th className="p-3 text-center w-12">🟨</th>
                                      <th className="p-3 text-center w-12">🟥</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-50 font-medium">
                                    {getTopDisciplined().length === 0 ? (
                                      <tr><td colSpan={5} className="p-12 text-center text-slate-350 font-bold italic text-xs uppercase tracking-widest">Sin amonestaciones</td></tr>
                                    ) : getTopDisciplined().map((p: any, i: number) => (
                                      <tr key={i} className="hover:bg-slate-50 transition-all">
                                        <td className="p-3 text-center font-black text-slate-400">{i+1}</td>
                                        <td className="p-3 font-black text-slate-800">{p.name}</td>
                                        <td className="p-3 text-slate-500">{p.team}</td>
                                        <td className="p-3 text-center font-black text-yellow-500 text-sm">{p.yellow}</td>
                                        <td className="p-3 text-center font-black text-red-500 text-sm">{p.red}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* 4 Ranking Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <RankingCard title="Mejor ataque" label={isBasketball ? "Anotaciones" : "Goles"} data={getTeamRankings().bestAttack} field="gf" />
                            <RankingCard title="Mejor defensa" label={isBasketball ? "Anotaciones" : "Goles"} data={getTeamRankings().bestDefense} field="ga" />
                            <RankingCard title="Tarjeta roja" label="Ctd" data={getTeamRankings().redCards} field="red" />
                            <RankingCard title="Todas las tarjetas" label="Ctd" data={getTeamRankings().totalCards} field="totalCards" />
                          </div>
                        </div>
                      ) : (
                        /* AREA 2: FIXTURE ROUND-ROBIN OR BRACKET */
                        <div className="space-y-6">
                          {(() => {
                            const isEliminatoria = activePhase?.type === 'ELIMINATORIA' || selectedPhase.toLowerCase().includes('final') || selectedPhase.toLowerCase().includes('eliminatoria')
                            
                            if (isEliminatoria) {
                              const quarts = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase().includes('cuarto'))
                              const semis = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase().includes('semi'))
                              const finals = matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase && m.roundName.toLowerCase() === 'final')

                              const renderBracketCard = (m: Match) => {
                                const isCompleted = m.status === 'FINALIZADO'
                                return (
                                  <div
                                    key={m.id}
                                    onClick={() => setSelectedMatch(m)}
                                    className="bg-slate-50 border border-slate-200/60 p-4 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer flex flex-col gap-2.5"
                                  >
                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                      <span>{m.roundName} {m.groupName}</span>
                                      <span className={isCompleted ? 'text-emerald-500' : 'text-blue-500 animate-pulse'}>
                                        {isCompleted ? 'Finalizado' : 'Programado'}
                                      </span>
                                    </div>
                                    
                                    <div className="space-y-1.5 font-bold">
                                      <div className="flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                          {m.homeTeam?.logo ? (
                                            <img src={m.homeTeam.logo} className="w-5 h-5 rounded-md object-cover bg-slate-200 border" />
                                          ) : (
                                            <div className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-slate-500 text-[10px]">🛡️</div>
                                          )}
                                          <span className={`truncate ${m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore ? 'text-slate-900 font-black' : 'text-slate-400'}`}>
                                            {m.homeTeam?.name || m.homePlaceholder || 'Ganador'}
                                          </span>
                                        </div>
                                        <span className="font-black text-slate-900 w-6 text-center">{m.homeScore !== null ? m.homeScore : '-'}</span>
                                      </div>

                                      <div className="flex items-center justify-between gap-3 text-xs">
                                        <div className="flex items-center gap-2 min-w-0">
                                          {m.awayTeam?.logo ? (
                                            <img src={m.awayTeam.logo} className="w-5 h-5 rounded-md object-cover bg-slate-200 border" />
                                          ) : (
                                            <div className="w-5 h-5 rounded-md bg-slate-200 flex items-center justify-center text-slate-500 text-[10px]">🛡️</div>
                                          )}
                                          <span className={`truncate ${m.homeScore !== null && m.awayScore !== null && m.awayScore > m.homeScore ? 'text-slate-900 font-black' : 'text-slate-400'}`}>
                                            {m.awayTeam?.name || m.awayPlaceholder || 'Ganador'}
                                          </span>
                                        </div>
                                        <span className="font-black text-slate-900 w-6 text-center">{m.awayScore !== null ? m.awayScore : '-'}</span>
                                      </div>
                                    </div>
                                  </div>
                                )
                              }

                              return (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-4">
                                  {quarts.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center border-b pb-2">Cuartos de Final</h3>
                                      {quarts.map(m => renderBracketCard(m))}
                                    </div>
                                  )}
                                  {semis.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center border-b pb-2">Semifinales</h3>
                                      {semis.map(m => renderBracketCard(m))}
                                    </div>
                                  )}
                                  {finals.length > 0 && (
                                    <div className="flex flex-col gap-4">
                                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest text-center border-b pb-2">Final</h3>
                                      {finals.map(m => renderBracketCard(m))}
                                    </div>
                                  )}
                                </div>
                              )
                            } else {
                              /* Standard Round Robin Fixture list with round slider */
                              return (
                                <div className="space-y-6">
                                  {currentPhaseRounds.length > 0 && (
                                    <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 border-b pb-4">
                                      {currentPhaseRounds.map((round) => (
                                        <button
                                          key={round}
                                          onClick={() => setSelectedRound(round)}
                                          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 ${
                                            selectedRound === round
                                              ? 'bg-[#0A1128] text-white shadow-md'
                                              : 'bg-slate-100 hover:bg-slate-200 text-slate-400 border border-slate-250/20'
                                          }`}
                                        >
                                          Fecha {round}
                                        </button>
                                      ))}
                                    </div>
                                  )}

                                  {activeRoundMatches.length === 0 ? (
                                    <div className="text-center py-16 text-slate-400 italic font-bold">
                                      No hay partidos agendados en esta fecha.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                                      {activeRoundMatches.map((m) => {
                                        const isBye = m.notes === 'FECHA_LIBRE'
                                        const isCompleted = m.status === 'FINALIZADO'
                                        
                                        if (isBye) {
                                          const playingTeam = m.homeTeam || m.awayTeam
                                          return (
                                            <div
                                              key={m.id}
                                              onClick={() => { if (playingTeam) handleViewTeamRoster(playingTeam) }}
                                              className="bg-emerald-50 border border-emerald-200/60 p-5 rounded-[2rem] flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
                                            >
                                              <div className="flex items-center gap-3">
                                                {playingTeam?.logo ? (
                                                  <img src={playingTeam.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover bg-white border" />
                                                ) : (
                                                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">🛡️</div>
                                                )}
                                                <div>
                                                  <h3 className="font-black text-sm text-slate-800 group-hover:text-emerald-600 transition-colors">{playingTeam?.name || 'Equipo'}</h3>
                                                  <div className="flex items-center gap-1.5 mt-1">
                                                    <span className="bg-emerald-200/30 text-emerald-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">Fecha Libre</span>
                                                    <span className="text-slate-400 text-[9px] font-bold">🌴 Descansa esta ronda</span>
                                                  </div>
                                                </div>
                                              </div>
                                              <span className="text-2xl filter saturate-75 select-none animate-bounce duration-1000 mr-2">🌴</span>
                                            </div>
                                          )
                                        }

                                        return (
                                          <div
                                            key={m.id}
                                            onClick={() => setSelectedMatch(m)}
                                            className="bg-white border border-slate-200/60 p-5 rounded-[2rem] shadow-sm hover:shadow-md hover:border-slate-350 transition-all duration-300 active:scale-[0.99] cursor-pointer flex flex-col gap-3 relative group"
                                          >
                                            <div className="flex items-center justify-between text-[9px] font-black tracking-widest text-slate-400 uppercase">
                                              <div className="flex items-center gap-1">
                                                {m.groupName && <span className="bg-slate-100 px-2 py-0.5 rounded-lg text-slate-500 border border-slate-200">{m.groupName}</span>}
                                                <span>{m.location || 'Campo deportivo'}</span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[9px] font-black border uppercase ${
                                                  isCompleted ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-blue-50 text-blue-500 border-blue-100 animate-pulse'
                                                }`}>
                                                  {isCompleted ? 'Finalizado' : 'Programado'}
                                                </span>
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between gap-3 py-1 font-bold">
                                              {/* Home */}
                                              <div className="flex-1 flex items-center gap-2.5 min-w-0">
                                                {m.homeTeam?.logo ? (
                                                  <img src={m.homeTeam.logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover bg-slate-100 border shadow-sm" />
                                                ) : (
                                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">🛡️</div>
                                                )}
                                                <span className="text-slate-800 text-xs truncate">{m.homeTeam?.name || m.homePlaceholder || 'Equipo 1'}</span>
                                              </div>

                                              {/* Score */}
                                              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 rounded-xl border border-slate-200/50 font-black text-sm shadow-inner shrink-0">
                                                <span className={`w-6 text-center ${m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore ? 'text-blue-600' : 'text-slate-500'}`}>
                                                  {m.homeScore !== null ? m.homeScore : '-'}
                                                </span>
                                                <span className="text-slate-300 font-medium text-xs">:</span>
                                                <span className={`w-6 text-center ${m.homeScore !== null && m.awayScore !== null && m.awayScore > m.homeScore ? 'text-blue-600' : 'text-slate-500'}`}>
                                                  {m.awayScore !== null ? m.awayScore : '-'}
                                                </span>
                                              </div>

                                              {/* Away */}
                                              <div className="flex-1 flex items-center justify-end gap-2.5 min-w-0 text-right">
                                                <span className="text-slate-800 text-xs truncate">{m.awayTeam?.name || m.awayPlaceholder || 'Equipo 2'}</span>
                                                {m.awayTeam?.logo ? (
                                                  <img src={m.awayTeam.logo} alt="Logo" className="w-8 h-8 rounded-lg object-cover bg-slate-100 border shadow-sm" />
                                                ) : (
                                                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 text-xs">🛡️</div>
                                                )}
                                              </div>
                                            </div>

                                            <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold border-t border-slate-50 pt-3 mt-1">
                                              <span>📅 {new Date(m.matchDate).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                                              {m.notes && <span className="italic text-slate-500">{m.notes}</span>}
                                            </div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  )}
                                </div>
                              )
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Standings / Posiciones Table (Only displayed if not estadisticas view) */}
                  {activeMenu !== 'estadisticas' && (
                    <div className="w-full xl:w-[450px] bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 p-8 border border-slate-200/60 overflow-y-auto flex-shrink-0 animate-in fade-in duration-500">
                      <div className="flex justify-between items-center mb-8 pb-3 border-b">
                        <h2 className="text-base font-black text-slate-850 uppercase tracking-widest">📊 Tabla Posiciones</h2>
                      </div>
                      
                      {Object.keys(standings).length === 0 ? (
                        <div className="text-center py-12 text-slate-400 font-medium italic text-xs">
                          Tabla no disponible aún.
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {(() => {
                            const renderSideTable = (list: any[], groupName?: string) => (
                              <div key={groupName || 'all'} className="space-y-4">
                                {groupName && (
                                  <h3 className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">GRUPO {groupName}</h3>
                                )}
                                <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm bg-white">
                                  <table className="w-full text-xs text-left border-collapse">
                                    <thead>
                                      <tr className="bg-slate-900 text-white text-[9px] font-black uppercase tracking-wider">
                                        <th className="p-3 text-center w-10">Pos</th>
                                        <th className="p-3 pl-1">Equipo</th>
                                        <th className="p-3 text-center w-10">PTS</th>
                                        <th className="p-3 text-center w-8">PJ</th>
                                        <th className="p-3 text-center w-8">DG</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 font-medium">
                                      {list.map((row: any, idx: number) => (
                                        <tr 
                                          key={row.id} 
                                          onClick={() => handleViewTeamRoster(row)}
                                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                                        >
                                          <td className="p-3 text-center">
                                            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full font-black text-[10px] ${
                                              idx === 0 ? 'bg-blue-600/10 text-blue-500' :
                                              idx === 1 ? 'bg-slate-100 text-slate-500' :
                                              'text-slate-400'
                                            }`}>{idx + 1}</span>
                                          </td>
                                          <td className="p-3 pl-1">
                                            <div className="flex items-center gap-2">
                                              {row.logo ? (
                                                <img src={row.logo} className="w-6 h-6 rounded-lg object-cover bg-slate-100 border shadow-sm" />
                                              ) : (
                                                <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-[10px]">🛡️</div>
                                              )}
                                              <span className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{row.name}</span>
                                            </div>
                                          </td>
                                          <td className="p-3 text-center font-black text-blue-600 text-xs bg-blue-50/15">{row.points}</td>
                                          <td className="p-3 text-center text-slate-400 text-[11px]">{row.played}</td>
                                          <td className={`p-3 text-center font-black text-[11px] ${row.diff > 0 ? 'text-emerald-500' : row.diff < 0 ? 'text-red-400' : 'text-slate-400'}`}>
                                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )

                            const isGrouped = !Array.isArray(standings)
                            if (isGrouped) {
                              return Object.keys(standings).sort().map(gName => (
                                renderSideTable(standings[gName], gName)
                              ))
                            } else {
                              return renderSideTable(standings as any[])
                            }
                          })()}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* M1: MATCH DETAILS MODAL (READ-ONLY) */}
      {selectedMatch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in" onClick={() => setSelectedMatch(null)}>
          <div className="bg-white border max-w-lg w-full rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="font-black text-xs uppercase tracking-widest text-[#0A1128]">Detalle de Partido</h2>
              <button onClick={() => setSelectedMatch(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all font-black">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Score banner */}
              <div className="flex items-center justify-between gap-4 bg-slate-950 p-6 rounded-[2rem] border shadow-inner">
                {/* Home */}
                <div className="flex-1 flex flex-col items-center text-center gap-2 min-w-0">
                  {selectedMatch.homeTeam?.logo ? (
                    <img src={selectedMatch.homeTeam.logo} className="w-12 h-12 rounded-xl object-cover bg-slate-800 border shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-lg shadow-md">🛡️</div>
                  )}
                  <span className="font-black text-xs text-white truncate w-full">{selectedMatch.homeTeam?.name || selectedMatch.homePlaceholder}</span>
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
                    <img src={selectedMatch.awayTeam.logo} className="w-12 h-12 rounded-xl object-cover bg-slate-800 border shadow-md" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-lg shadow-md">🛡️</div>
                  )}
                  <span className="font-black text-xs text-white truncate w-full">{selectedMatch.awayTeam?.name || selectedMatch.awayPlaceholder}</span>
                </div>
              </div>

              {/* TIMELINE EVENTS */}
              <div className="space-y-4">
                <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center gap-1.5">
                  <span>⏱️</span> Sucesos del Partido
                </h3>
                
                {(!selectedMatch.events || selectedMatch.events.length === 0) ? (
                  <div className="text-center py-8 text-slate-400 italic text-xs">
                    Sin goles ni amonestaciones registradas.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {selectedMatch.events.map((e: any) => {
                      const icon = e.type === 'GOAL' ? '⚽' : e.type === 'YELLOW_CARD' ? '🟨' : e.type === 'RED_CARD' ? '🟥' : '📋'
                      const isHomeEvent = e.teamId === selectedMatch.homeTeam?.id
                      
                      return (
                        <div key={e.id} className={`flex items-center gap-3 text-xs ${isHomeEvent ? 'flex-row' : 'flex-row-reverse'}`}>
                          <span className="text-slate-400 font-bold w-12 text-center bg-slate-50 px-2 py-0.5 rounded-lg border">
                            {e.minute ? `${e.minute}'` : 'S/T'}
                          </span>
                          <div className={`flex items-center gap-2 bg-slate-50/50 px-3.5 py-2 rounded-xl border flex-1 max-w-[80%] ${isHomeEvent ? 'justify-start' : 'justify-end'}`}>
                            <span className="text-base leading-none">{icon}</span>
                            <span className="font-black text-slate-800">{e.player?.name || 'Jugador'}</span>
                            {e.assist?.name && <span className="text-[10px] text-slate-450 font-medium">(Asist. {e.assist.name})</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Additional Details info card */}
              <div className="bg-slate-50 p-4 rounded-2xl border space-y-2 text-xs text-slate-500">
                <div className="flex justify-between"><span className="font-bold text-slate-400">Fecha y Hora:</span> <span>{new Date(selectedMatch.matchDate).toLocaleString('es-ES')}</span></div>
                {selectedMatch.referee && <div className="flex justify-between"><span className="font-bold text-slate-400">Árbitro:</span> <span>{selectedMatch.referee}</span></div>}
                {selectedMatch.location && <div className="flex justify-between"><span className="font-bold text-slate-400">Cancha:</span> <span>{selectedMatch.location}</span></div>}
                {selectedMatch.notes && <div className="flex justify-between"><span className="font-bold text-slate-400">Notas:</span> <span className="italic text-blue-500 font-black">{selectedMatch.notes}</span></div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* M2: TEAM ROSTER MODAL (READ-ONLY) */}
      {selectedTeam && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-in fade-in" onClick={() => setSelectedTeam(null)}>
          <div className="bg-white border max-w-lg w-full rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                {selectedTeam.logo ? (
                  <img src={selectedTeam.logo} className="w-8 h-8 rounded-lg object-cover bg-white border" />
                ) : (
                  <span className="text-xl">🛡️</span>
                )}
                <h2 className="font-black text-xs uppercase tracking-widest text-[#0A1128]">Plantel Oficial: {selectedTeam.name}</h2>
              </div>
              <button onClick={() => setSelectedTeam(null)} className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-all font-black">✕</button>
            </div>
            
            <div className="p-6 space-y-6">
              {loadingRoster ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3">
                  <div className="relative w-8 h-8">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-600/10"></div>
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin"></div>
                  </div>
                  <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest animate-pulse">Cargando Jugadores...</span>
                </div>
              ) : !teamRoster ? (
                <div className="text-center py-8 text-slate-400 italic text-xs">Error al cargar plantel.</div>
              ) : (
                <div className="space-y-6">
                  {/* Coach / DT details */}
                  {teamRoster.coach && (
                    <div className="bg-slate-50 p-4 rounded-2xl border flex items-center justify-between text-xs">
                      <span className="font-black text-slate-400 uppercase tracking-widest">Director Técnico / DT:</span>
                      <span className="font-black text-blue-600 text-sm">👤 {teamRoster.coach}</span>
                    </div>
                  )}

                  {/* Player list */}
                  <div className="space-y-3">
                    <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest border-b pb-2">Jugadores Registrados</h3>
                    
                    {(!teamRoster.teamMembers || teamRoster.teamMembers.length === 0) && (!teamRoster.players || teamRoster.players.length === 0) ? (
                      <div className="text-center py-8 text-slate-400 italic text-xs">No hay jugadores inscriptos en este equipo aún.</div>
                    ) : (
                      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                        {/* 1. Official Players (teamPlayers profile) */}
                        {teamRoster.players?.map((tp: any) => (
                          <div key={tp.id} className="flex items-center justify-between bg-slate-50/50 px-4 py-3 rounded-2xl border hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center font-black text-xs">
                                {tp.number !== null && tp.number !== undefined ? tp.number : '#'}
                              </span>
                              <span className="font-black text-slate-800 text-xs truncate">{tp.player?.user?.name || 'Jugador Oficial'}</span>
                            </div>
                            <span className="bg-blue-50 text-blue-500 border border-blue-100 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider scale-95 shrink-0">Oficial</span>
                          </div>
                        ))}

                        {/* 2. Local Players (teamMembers) */}
                        {teamRoster.teamMembers?.filter((m: any) => m.role === 'PLAYER').map((m: any) => (
                          <div key={m.id} className="flex items-center justify-between bg-slate-50/50 px-4 py-3 rounded-2xl border hover:border-slate-300 transition-colors">
                            <div className="flex items-center gap-3 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-slate-100 border text-slate-500 flex items-center justify-center font-black text-xs">
                                {m.number !== null && m.number !== undefined ? m.number : '#'}
                              </span>
                              <span className="font-black text-slate-800 text-xs truncate">{m.name}</span>
                            </div>
                            <span className="bg-slate-100 text-slate-400 border px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider scale-95 shrink-0">Local</span>
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
