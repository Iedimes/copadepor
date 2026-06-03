"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Match {
  id: string
  createdAt: string
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

const formatMatchDate = (dateStr: string) => {
  try {
    const d = new Date(dateStr)
    const weekdays = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb']
    const weekday = weekdays[d.getDay()]
    const day = d.getDate()
    const month = d.getMonth() + 1
    const year = d.getFullYear()
    const hours = String(d.getHours()).padStart(2, '0')
    const minutes = String(d.getMinutes()).padStart(2, '0')
    return `${weekday}, ${day}/${month}/${year} ${hours}:${minutes}`
  } catch (e) {
    return dateStr
  }
}

const formatDate = (dateStr: any) => {
  if (!dateStr) return null
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
  } catch {
    return null
  }
}

const getDisplayNotes = (notesStr: string | null) => {
  if (!notesStr || notesStr === 'FECHA_LIBRE') return ''
  if (notesStr.startsWith('{')) {
    try {
      const parsed = JSON.parse(notesStr)
      return parsed.customNotes || ''
    } catch (e) {
      return ''
    }
  }
  return notesStr
}

const parseNotesJson = (notes: string | null) => {
  if (!notes) return null
  const trimmed = notes.trim()
  if (!trimmed.startsWith('{')) return null
  try {
    return JSON.parse(trimmed)
  } catch {
    return null
  }
}

const LiveMatchTimer = ({ notes }: { notes: string | null }) => {
  const [str, setStr] = useState('')
  useEffect(() => {
    let interval: NodeJS.Timeout
    const update = () => {
      const parsed = parseNotesJson(notes)
      if (parsed?.timer) {
        let m = parsed.timer.m
        let s = parsed.timer.s
        if (parsed.timer.run) {
          const diff = Math.floor((Date.now() - parsed.timer.ts) / 1000)
          const t = m * 60 + s + diff
          m = Math.floor(t / 60)
          s = t % 60
        }
        setStr(`${parsed.timer.p}° ${m}:${s.toString().padStart(2, '0')}`)
      } else {
        setStr('')
      }
    }
    update()
    const parsed = parseNotesJson(notes)
    if (parsed?.timer?.run) {
      interval = setInterval(update, 1000)
    }
    return () => { if (interval) clearInterval(interval) }
  }, [notes])

  if (!str) return null
  return <span className="text-[10px] font-black text-slate-700 font-mono tracking-widest">{str}</span>
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
  const [messages, setMessages] = useState<any[]>([])
  
  const [activeMenu, setActiveMenu] = useState<MenuType>('inicio')
  const [selectedPhase, setSelectedPhase] = useState('1° Fase')
  const [selectedRound, setSelectedRound] = useState('')
  
  const [loading, setLoading] = useState(true)
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<any | null>(null)
  const [teamRoster, setTeamRoster] = useState<any | null>(null)
  const [loadingRoster, setLoadingRoster] = useState(false)

  // Message sending state
  const [newMessage, setNewMessage] = useState('')
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)
  const [loggedUser, setLoggedUser] = useState<any>(null)
  const [sendingMessage, setSendingMessage] = useState(false)

  const themeColor = tournament?.themeColor || '#FF6B00'

  // Check if user is already logged in
  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try { setLoggedUser(JSON.parse(userStr)) } catch {}
    }
  }, [])

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
          const m = await mRes.json()
          const sorted = m.sort((a: any, b: any) => {
            if (a.createdAt && b.createdAt) {
              const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
              if (diff !== 0) return diff
            }
            return String(a.id).localeCompare(String(b.id))
          })
          setMatches(sorted)
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

  const getColLabel = (colId: string, isBasketball: boolean) => {
    if (isBasketball) {
      if (colId === 'gf') return 'Anotaciones Favor'
      if (colId === 'ga') return 'Anotaciones Contra'
      if (colId === 'diff') return 'Diferencia Anotaciones'
      if (colId === 'avg') return 'Promedio Anotaciones'
    }
    if (colId === 'gf') return 'Goles a Favor'
    if (colId === 'ga') return 'Goles Contra'
    if (colId === 'diff') return 'Diferencia de Goles'
    if (colId === 'avg') return 'Promedio de goles'

    const defaults: Record<string, string> = {
      points: 'Puntos', played: 'Juegos', won: 'Ganados', drawn: 'Empates', lost: 'Perdido',
      perc: 'Aprovechamiento', pe: 'Puntos Extras', red: 'Tarjeta roja', yellow: 'Tarjeta amarilla',
      blue: 'Tarjeta azul', allCards: 'Todas las tarjetas', fairPlay: 'Juego Limpio', technique: 'Index technique'
    }
    return defaults[colId] || colId
  }

  const tableColumns = [
    { id: 'points', label: 'Puntos', visible: true },
    { id: 'played', label: 'Juegos', visible: true },
    { id: 'won', label: 'Ganados', visible: true },
    { id: 'drawn', label: 'Empates', visible: true },
    { id: 'lost', label: 'Perdido', visible: true },
    { id: 'gf', label: 'Goles a Favor', visible: true },
    { id: 'ga', label: 'Goles Contra', visible: true },
    { id: 'diff', label: 'Diferencia de Goles', visible: true },
    { id: 'avg', label: 'Promedio de goles', visible: false },
    { id: 'perc', label: 'Aprovechamiento', visible: true },
    { id: 'pe', label: 'Puntos Extras', visible: false },
    { id: 'red', label: 'Tarjeta roja', visible: false },
    { id: 'yellow', label: 'Tarjeta amarilla', visible: false },
    { id: 'blue', label: 'Tarjeta azul', visible: false },
    { id: 'allCards', label: 'Todas las tarjetas', visible: false },
    { id: 'fairPlay', label: 'Juego Limpio', visible: false },
    { id: 'technique', label: 'Index technique', visible: false },
  ]

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

  const getSportBanner = (s: string, ignoreTournamentBanner?: boolean) => {
    const tourBanner = tournament?.banner && tournament.banner !== 'null' && tournament.banner !== 'undefined' ? tournament.banner : null
    if (tourBanner && !ignoreTournamentBanner) return tourBanner
    const key = ((s || '') + ' ' + (activeCategory?.name || '') + ' ' + (tournament?.name || '')).toUpperCase()
    if (key.includes('FUT') || key.includes('FÚT')) {
      return 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1600' // fútbol
    }
    if (key.includes('BASKET') || key.includes('BALONCESTO') || key.includes('BASQ') || key.includes('BÁSQ')) {
      return 'https://images.unsplash.com/photo-1546519638-68e109498ffc?q=80&w=1600' // basquet
    }
    if (key.includes('VOLEY') || key.includes('VOLLEY') || key.includes('VÓL') || key.includes('VOL') || key.includes('VÓL')) {
      return 'https://images.unsplash.com/photo-1592656094267-764a45068526?q=80&w=1600' // voley
    }
    if (key.includes('BALONMANO') || key.includes('HAND') || key.includes('HÁND')) {
      return 'https://images.unsplash.com/photo-1552667466-07770ae110d0?q=80&w=1600' // balonmano
    }
    if (key.includes('TENIS') || key.includes('TENNIS')) {
      return 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1600' // tenis
    }
    if (key.includes('AJEDREZ') || key.includes('CHESS')) {
      return 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?q=80&w=1600' // ajedrez
    }
    if (key.includes('ATLETISMO')) {
      return 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?q=80&w=1600' // atletismo
    }
    if (key.includes('DISPAROS') || key.includes('ROYALE') || key.includes('MOBA') || key.includes('LOL') || key.includes('DOTA')) {
      return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1600' // esports
    }
    return 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1600' // genérico
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
    <div className="min-h-screen h-screen bg-[#F8FAFC] flex relative overflow-hidden font-sans antialiased text-slate-800">
      {/* SIDEBAR NAVIGATION */}
      <div 
        className="w-64 min-h-screen text-white/90 flex flex-col z-10 border-r border-black/5 flex-shrink-0"
        style={{ backgroundColor: themeColor }}
      >
        <div className="p-8">
          <div 
            onClick={() => {
              if (tournament?.format === 'categorias') {
                setActiveCategory(null)
                setActiveMenu('inicio')
              }
            }}
            className={`flex items-center gap-3 mb-12 ${tournament?.format === 'categorias' ? 'cursor-pointer hover:opacity-90 transition-all' : ''}`}
          >
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shadow-md shrink-0 overflow-hidden">
              {tournament?.logo ? (
                <img src={tournament.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl">{sportIcon}</span>
              )}
            </div>
            <h1 className="text-xs font-black text-white tracking-tight uppercase leading-snug break-words max-w-[130px]">{tournament?.name}</h1>
          </div>

          <nav className="space-y-2">
            <button 
              onClick={() => {
                if (tournament?.format === 'categorias') {
                  setActiveCategory(null)
                }
                setActiveMenu('inicio')
              }} 
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${activeMenu === 'inicio' ? 'bg-black/15 text-white shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
            >
              <span className="text-base">🏠</span> Inicio
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${activeMenu === 'clasificacion' ? 'bg-black/15 text-white shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="text-base">🏆</span> Clasificación
                </button>

                <button 
                  onClick={() => {
                    setActiveMenu('estadisticas')
                  }} 
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${activeMenu === 'estadisticas' ? 'bg-black/15 text-white shadow-sm' : 'text-white/80 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="text-base">📊</span> Rankings y encuestas
                </button>

                <button 
                  onClick={() => {
                    alert('Sección de fotos, videos y noticias en desarrollo. ¡Próximamente disponible!')
                  }} 
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all text-white/80 hover:bg-white/10 hover:text-white"
                >
                  <span className="text-base">📸</span> Fotos, videos y noticias
                </button>
              </>
            )}
          </nav>
        </div>

        {/* BOTTOM user badge */}
        <div className="mt-auto p-6 border-t border-white/10">
          <div className="flex items-center justify-between text-white text-xs font-bold px-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center font-black shrink-0">👤</span>
              <span className="truncate max-w-[80px] text-xs font-black">{loggedUser ? loggedUser.name : 'Invitado'}</span>
            </div>
            {loggedUser ? (
              <button 
                onClick={() => {
                  localStorage.removeItem('token')
                  localStorage.removeItem('user')
                  setLoggedUser(null)
                }}
                className="text-white/70 hover:text-white transition-colors text-[9px] uppercase font-black tracking-wider bg-black/10 px-2 py-1 rounded shrink-0"
              >Cerrar Sesión</button>
            ) : (
              <button 
                onClick={() => setShowLoginModal(true)}
                className="text-white/70 hover:text-white transition-colors text-[9px] uppercase font-black tracking-wider bg-black/10 px-2 py-1 rounded shrink-0"
              >Iniciar Sesión</button>
            )}
          </div>
        </div>
      </div>


      {/* MAIN CONTAINER */}
      <div className="flex-1 p-8 overflow-y-auto flex flex-col h-full">
        {/* VIEW 1: CATEGORY PORTAL (If Categories tournament and no category is active) */}
        {tournament?.format === 'categorias' && !activeCategory ? (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 w-full">
            {/* Banner Portada con Logo Oficial */}
            <div className="relative h-72 rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl">
              <div 
                className="absolute inset-0 bg-cover bg-center" 
                style={
                  (tournament?.banner && tournament.banner !== 'null' && tournament.banner !== 'undefined' && tournament.banner !== '[object Object]')
                    ? { backgroundImage: `url('${tournament.banner}')`, opacity: 0.5 }
                    : { backgroundImage: `url('${getSportBanner(tournament?.sportType || '', true)}')`, opacity: 0.5 }
                }
              ></div>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-900/20"></div>
              
              {/* Organizador Badge */}
              <div className="absolute top-5 left-6 z-10 bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/5 shadow-xl">
                <span className="text-[9px] font-black text-white/90 uppercase tracking-widest block mb-0.5">Organizador</span>
                <span className="text-[11px] font-black text-blue-400">{tournament?.organizer?.name}</span>
              </div>

              <div className="absolute bottom-0 left-0 p-8 flex flex-col md:flex-row md:items-end justify-between w-full">
                <div className="min-w-0">
                  <h1 className="text-4xl font-black text-white mb-2">{tournament.name}</h1>
                  <p className="text-slate-300 font-medium flex items-center gap-2 italic">{tournament.description || `Organizado por ${tournament?.organizer?.name}`}</p>
                  {(() => {
                    const start = formatDate(tournament?.startDate)
                    const end = formatDate(tournament?.endDate)
                    if (!start && !end) return null
                    return (
                      <div className="flex items-center gap-2 mt-3 text-[11px] font-black uppercase tracking-wider text-slate-200 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-2xl w-fit border border-white/5 shadow-md">
                        <span>📅</span>
                        <span>
                          {start === end ? start : `${start ? `Inicio: ${start}` : ''}${start && end ? '  |  ' : ''}${end ? `Fin: ${end}` : ''}`}
                        </span>
                      </div>
                    )
                  })()}
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
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl border border-blue-100 shadow-sm">
                          {cat.logo ? (
                            <img src={cat.logo} alt="Logo" className="w-full h-full object-contain p-1" />
                          ) : (
                            catIcon
                          )}
                        </div>
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

            {/* Mensajes */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                <span>💬</span> Mensajes
              </h2>

              {/* Message Input */}
              <div className="flex gap-3 mb-8">
                <input 
                  type="text" 
                  value={newMessage} 
                  onChange={e => setNewMessage(e.target.value)} 
                  placeholder="Escribe un mensaje..." 
                  className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl outline-none transition-all focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 border border-slate-100" 
                />
                <button 
                  onClick={async () => {
                    if (!newMessage.trim()) return
                    const token = localStorage.getItem('token')
                    if (!token) {
                      setShowLoginModal(true)
                      return
                    }
                    setSendingMessage(true)
                    try {
                      const res = await fetch(`/api/tournaments/${tournamentId}/messages`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ content: newMessage }),
                      })
                      if (res.ok) {
                        setNewMessage('')
                        const msgRes = await fetch(`/api/tournaments/${tournamentId}/messages`)
                        if (msgRes.ok) setMessages(await msgRes.json())
                      } else if (res.status === 401) {
                        localStorage.removeItem('token')
                        localStorage.removeItem('user')
                        setLoggedUser(null)
                        setShowLoginModal(true)
                      } else {
                        alert('Error al enviar mensaje')
                      }
                    } catch {
                      alert('Error de conexión')
                    }
                    setSendingMessage(false)
                  }}
                  disabled={sendingMessage}
                  className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                >
                  {sendingMessage ? '...' : 'Enviar'}
                </button>
              </div>
              
              <div className="space-y-6">
                {messages.length === 0 && (
                  <div className="text-center py-12 text-slate-300 font-black uppercase text-xs tracking-widest italic border border-dashed rounded-[2rem] p-6 bg-slate-50/50 border-slate-200">
                    Aún no se han publicado mensajes para este torneo.
                  </div>
                )}
                
                {messages.map((m: any) => (
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
        ) : (
          /* VIEW 2: ACTIVE CATEGORY PANEL */
          <div className="flex-1 flex flex-col h-full w-full">
            {/* V2.1: INICIO (Category Home & Messages/Announcements) */}
            {activeMenu === 'inicio' ? (
              <div className="max-w-5xl mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700 space-y-8">
                {/* Banner de Categoría con Portada */}
                <div className="relative h-72 rounded-[2.5rem] overflow-hidden bg-slate-900 shadow-2xl">
                  <div 
                    className="absolute inset-0 bg-cover bg-center" 
                    style={
                      (activeCategory?.banner && activeCategory.banner !== 'null' && activeCategory.banner !== 'undefined' && activeCategory.banner !== '[object Object]')
                        ? { backgroundImage: `url('${activeCategory.banner}')`, opacity: 0.5 }
                        : { backgroundImage: `url('${getSportBanner(sportType, activeCategory ? true : false)}')`, opacity: 0.5 }
                    }
                  ></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-slate-900/20"></div>
                  
                  {/* Organizador Badge */}
                  <div className="absolute top-5 left-6 z-10 bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-3 border border-white/5 shadow-xl">
                    <span className="text-[9px] font-black text-white/90 uppercase tracking-widest block mb-0.5">Organizador</span>
                    <span className="text-[11px] font-black text-blue-400">{tournament?.organizer?.name}</span>
                  </div>

                  <div className="absolute bottom-0 left-0 p-8 flex flex-col md:flex-row md:items-end justify-between w-full">
                    <div className="min-w-0">
                      <h1 className="text-4xl font-black text-white mb-1">{tournament.name}</h1>
                      {tournament.description && (
                        <p className="text-slate-300 text-sm font-medium mb-2 italic">{tournament.description}</p>
                      )}
                      {activeCategory && (
                        <p className="text-lg font-black text-blue-400 uppercase tracking-wider">{activeCategory.name}</p>
                      )}
                      {(() => {
                        const start = formatDate(tournament?.startDate)
                        const end = formatDate(tournament?.endDate)
                        if (!start && !end) return null
                        return (
                          <div className="flex items-center gap-2 mt-3 text-[11px] font-black uppercase tracking-wider text-slate-200 bg-black/30 backdrop-blur-sm px-4 py-2 rounded-2xl w-fit border border-white/5 shadow-md">
                            <span>📅</span>
                            <span>
                              {start === end ? start : `${start ? `Inicio: ${start}` : ''}${start && end ? '  |  ' : ''}${end ? `Fin: ${end}` : ''}`}
                            </span>
                          </div>
                        )
                      })()}
                    </div>
                    <div className="mt-4 md:mt-0 flex gap-3">
                    </div>
                  </div>
                </div>

                {/* Equipos */}
                {tournamentTeams.length > 0 && (
                  <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100 animate-in fade-in duration-500">
                    <h2 className="text-2xl font-black text-slate-900 mb-6">Equipos</h2>
                    <div className="flex flex-wrap gap-6">
                      {tournamentTeams.map((tt: any) => (
                        <div key={tt.id} className="flex flex-col items-center gap-2 group">
                          <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-sm transition-all" style={!tt.team.logo ? { backgroundColor: tt.team.color || '#1e293b' } : undefined}>
                            {tt.team.logo ? (
                              <img src={tt.team.logo} alt={tt.team.name} className="w-full h-full object-contain p-1" />
                            ) : (
                              <span className="text-white font-black text-2xl">{tt.team.name.charAt(0)}</span>
                            )}
                          </div>
                          <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider text-center max-w-[80px] truncate">{tt.team.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mensajes */}
                <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 p-8 border border-slate-100">
                  <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
                    <span>💬</span> Mensajes
                  </h2>

                  {/* Message Input */}
                  <div className="flex gap-3 mb-8">
                    <input 
                      type="text" 
                      value={newMessage} 
                      onChange={e => setNewMessage(e.target.value)} 
                      placeholder="Escribe un mensaje..." 
                      className="flex-1 px-6 py-4 bg-slate-50 rounded-2xl outline-none transition-all focus:ring-2 focus:ring-blue-500 font-medium text-slate-700 border border-slate-100" 
                    />
                    <button 
                      onClick={async () => {
                        if (!newMessage.trim()) return
                        const token = localStorage.getItem('token')
                        if (!token) {
                          setShowLoginModal(true)
                          return
                        }
                        setSendingMessage(true)
                        try {
                          const res = await fetch(`/api/tournaments/${tournamentId}/messages`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: newMessage }),
                          })
                          if (res.ok) {
                            setNewMessage('')
                            const msgRes = await fetch(`/api/tournaments/${tournamentId}/messages`)
                            if (msgRes.ok) setMessages(await msgRes.json())
                          } else if (res.status === 401) {
                            localStorage.removeItem('token')
                            localStorage.removeItem('user')
                            setLoggedUser(null)
                            setShowLoginModal(true)
                          } else {
                            alert('Error al enviar mensaje')
                          }
                        } catch {
                          alert('Error de conexión')
                        }
                        setSendingMessage(false)
                      }}
                      disabled={sendingMessage}
                      className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 disabled:opacity-50"
                    >
                      {sendingMessage ? '...' : 'Enviar'}
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    {messages.length === 0 && (
                      <div className="text-center py-12 text-slate-300 font-black uppercase text-xs tracking-widest italic border border-dashed rounded-[2rem] p-6 bg-slate-50/50 border-slate-200">
                        Aún no se han publicado mensajes para este torneo.
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
            ) : (

              /* V2.2: CLASIFICACION / FIXTURE & ESTADISTICAS VIEW (Replica of Sajonia layout!) */
              <div className="flex flex-col h-full max-w-[1600px] mx-auto w-full">
                {/* Title area */}
                <div className="mb-8">
                  <h1 className="text-3xl font-black text-[#0A1128] tracking-tight">{tournament?.name}</h1>
                  {activeCategory && (
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest mt-1">{activeCategory.name}</p>
                  )}
                </div>

                {/* Core Area: Two Columns (Left: Standings Table, Right: Juegos & Stats stacked) */}
                <div className="flex flex-col xl:flex-row gap-8 w-full h-full items-start">
                  
                  {/* LEFT COLUMN: Wide Standings Table (CLASIFICACIÓN) */}
                  <div className="flex-1 w-full bg-white rounded-[2rem] border border-slate-200/60 p-8 shadow-sm overflow-y-auto relative min-h-[400px]">
                    <div className="animate-in fade-in duration-500">
                      
                      {/* Phase Dropdown aligned left inside the card */}
                      <div className="flex justify-between items-center mb-6 relative">
                        <div className="relative">
                          <select 
                            value={activeMenu === 'estadisticas' ? 'estadisticas' : selectedPhase}
                            onChange={(e) => handlePhaseChange(e.target.value)}
                            className="bg-transparent border border-slate-350 rounded-full pl-4 pr-8 py-1.5 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer shadow-xs"
                          >
                            {phases.map(p => <option key={p.id || p.name} value={p.name}>{p.name}</option>)}
                            {!phases.some(p => p.name === selectedPhase) && <option value={selectedPhase}>{selectedPhase}</option>}
                            <option value="estadisticas" style={{ color: themeColor }} className="font-black">📊 Estadísticas Generales</option>
                          </select>
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">▼</span>
                        </div>
                      </div>

                      {activeMenu === 'estadisticas' ? (
                        /* STATISTICS VIEW */
                        <div className="space-y-10 animate-in fade-in duration-500 pt-2">
                          <h2 className="text-center text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-8">ESTADÍSTICAS GENERALES</h2>

                          {/* Scorers & Sanciones List */}
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Scorers */}
                            <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-xs">
                              <div style={{ backgroundColor: themeColor }} className="p-4 text-center">
                                <h3 className="text-white font-black uppercase tracking-widest text-xs">⚽ Tabla de Goleadores</h3>
                              </div>
                              <div className="p-4">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                      <th className="p-3 text-center w-12">#</th>
                                      <th className="p-3 text-left">Jugador</th>
                                      <th className="p-3 text-left">Club</th>
                                      <th className="p-3 text-center w-16">{isBasketball ? 'PTS' : 'GOLES'}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {getTopScorers().length === 0 ? (
                                      <tr><td colSpan={4} className="p-12 text-center text-slate-450 font-bold italic text-xs uppercase tracking-widest">Sin registros</td></tr>
                                    ) : getTopScorers().map((p: any, i: number) => (
                                      <tr key={i} className="hover:bg-slate-50 transition-all">
                                        <td className="p-3 text-center font-black text-slate-400">{i+1}</td>
                                        <td className="p-3 font-black text-slate-800">{p.name}</td>
                                        <td className="p-3 text-slate-500">{p.team}</td>
                                        <td style={{ color: themeColor, backgroundColor: `${themeColor}0d` }} className="p-3 text-center font-black text-xs">{p.goals}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* Discipline */}
                            <div className="bg-white rounded-[1.5rem] border border-slate-200 overflow-hidden shadow-xs">
                              <div style={{ backgroundColor: themeColor }} className="p-4 text-center">
                                <h3 className="text-white font-black uppercase tracking-widest text-xs">🟨 Tabla de Sanciones</h3>
                              </div>
                              <div className="p-4">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-200 text-[9px] text-slate-400 font-black uppercase tracking-widest">
                                      <th className="p-3 text-center w-12">#</th>
                                      <th className="p-3 text-left">Jugador</th>
                                      <th className="p-3 text-left">Club</th>
                                      <th className="p-3 text-center w-12">🟨</th>
                                      <th className="p-3 text-center w-12">🟥</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {getTopDisciplined().length === 0 ? (
                                      <tr><td colSpan={5} className="p-12 text-center text-slate-450 font-bold italic text-xs uppercase tracking-widest">Sin amonestaciones</td></tr>
                                    ) : getTopDisciplined().map((p: any, i: number) => (
                                      <tr key={i} className="hover:bg-slate-50 transition-all">
                                        <td className="p-3 text-center font-black text-slate-400">{i+1}</td>
                                        <td className="p-3 font-black text-slate-800">{p.name}</td>
                                        <td className="p-3 text-slate-500">{p.team}</td>
                                        <td className="p-3 text-center font-black text-amber-500 text-xs">{p.yellow}</td>
                                        <td className="p-3 text-center font-black text-red-500 text-xs">{p.red}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </div>

                          {/* 4 Ranking Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <RankingCard title="Mejor ataque" label={isBasketball ? "Anotaciones" : "Goles"} data={getTeamRankings().bestAttack} field="gf" themeColor={themeColor} />
                            <RankingCard title="Mejor defensa" label={isBasketball ? "Anotaciones" : "Goles"} data={getTeamRankings().bestDefense} field="ga" themeColor={themeColor} />
                            <RankingCard title="Tarjeta roja" label="Ctd" data={getTeamRankings().redCards} field="red" themeColor={themeColor} />
                            <RankingCard title="Todas las tarjetas" label="Ctd" data={getTeamRankings().totalCards} field="totalCards" themeColor={themeColor} />
                          </div>
                        </div>
                      ) : (
                        /* CLASIFICACIÓN VIEW */
                        <>
                          <h2 className="text-center text-xs font-black text-slate-400 uppercase tracking-[0.25em] mb-8">CLASIFICACIÓN</h2>

                          {Object.keys(standings).length === 0 ? (
                            <div className="text-center py-16 text-slate-400 font-bold italic text-xs uppercase tracking-wider">
                              Tabla de posiciones no disponible aún.
                            </div>
                          ) : (
                            <div className="space-y-8">
                              {(() => {
                                const renderSideTable = (list: any[], groupName?: string) => (
                                  <div key={groupName || 'all'} className="space-y-4">
                                    {groupName && (
                                      <h3 style={{ color: themeColor }} className="text-center text-[10px] font-black uppercase tracking-[0.3em] mb-4">GRUPO {groupName}</h3>
                                    )}
                                    <div className="overflow-hidden rounded-3xl border border-slate-100 shadow-sm bg-white">
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr
                                            style={{ backgroundColor: themeColor }}
                                            className="text-white text-[10px] font-black uppercase tracking-wider"
                                          >
                                            <th className="p-4 text-center w-16">Pos</th>
                                            <th className="p-4 text-left min-w-[150px]">EQUIPOS</th>
                                            {tableColumns.filter(c => c.visible).map(col => (
                                              <th key={col.id} className="p-4 text-center">
                                                {col.id === 'perc' ? '%' : getColLabel(col.id, isBasketball).split(' ').map(w => w[0]).join('').toUpperCase()}
                                              </th>
                                            ))}
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {list.map((row: any, idx: number) => (
                                            <tr
                                              key={row.id}
                                              onClick={() => handleViewTeamRoster(row)}
                                              className="border-b border-slate-50 hover:bg-slate-50/50 transition-all cursor-pointer"
                                            >
                                              <td className="p-4 text-center">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto font-black text-xs ${idx < 4 ? 'text-white shadow-lg' : 'bg-slate-100 text-slate-400'}`}
                                                  style={idx < 4 ? { backgroundColor: themeColor } : undefined}
                                                >
                                                  {idx + 1}
                                                </div>
                                              </td>
                                              <td className="p-4">
                                                <span className="font-black text-slate-800 tracking-tight">{row.name}</span>
                                              </td>
                                              {tableColumns.filter(c => c.visible).map(col => {
                                                let val = row[col.id] || 0
                                                if (col.id === 'avg') val = (row.gf / (row.played || 1)).toFixed(2)
                                                return (
                                                  <td key={col.id} className={`p-4 text-center font-bold ${col.id === 'points' ? 'text-blue-600 bg-blue-50/30' : 'text-slate-400'}`}>
                                                    {val}
                                                  </td>
                                                )
                                              })}
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
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
                        </>
                      )}

                    </div>
                  </div>

                  {/* RIGHT COLUMN: Stacked Juegos & Estadísticas de la fecha */}
                  <div className="w-full xl:w-[480px] flex-shrink-0 space-y-8 flex flex-col">
                    
                    {/* CARD 1: JUEGOS (Fixture) */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div style={{ backgroundColor: themeColor }} className="px-6 py-4 flex items-center justify-between shadow-xs">
                        <span className="text-white font-black text-sm uppercase tracking-wider">Juegos</span>
                        <div className="flex items-center gap-2">
                          {/* Inline selectors inside orange header */}
                          <div className="relative">
                            <select 
                              value={selectedPhase}
                              onChange={(e) => {
                                setSelectedPhase(e.target.value)
                                setSelectedRound('')
                              }}
                              className="bg-white/20 border border-white/20 rounded-full text-white text-[10px] font-black pl-3 pr-6 py-0.5 outline-none cursor-pointer appearance-none hover:bg-white/35 transition-all"
                            >
                              {phases.map(p => <option key={p.id || p.name} value={p.name} className="text-slate-800">{p.name}</option>)}
                            </select>
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white text-[8px]">▼</span>
                          </div>

                          {!activePhase || activePhase.type !== 'ELIMINATORIA' ? (
                            <div className="relative">
                              <select 
                                value={selectedRound}
                                onChange={(e) => setSelectedRound(e.target.value)}
                                className="bg-white/20 border border-white/20 rounded-full text-white text-[10px] font-black pl-3 pr-6 py-0.5 outline-none cursor-pointer appearance-none hover:bg-white/35 transition-all"
                              >
                                {currentPhaseRounds.map(round => (
                                  <option key={round} value={round} className="text-slate-800">Fecha {round}</option>
                                ))}
                              </select>
                              <span className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-white text-[8px]">▼</span>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className="p-6 space-y-4">
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
                                  className="bg-slate-50 border border-slate-200/60 p-4 rounded-[1.5rem] shadow-sm hover:shadow-md hover:border-slate-350 transition-all cursor-pointer flex flex-col gap-2.5"
                                >
                                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-between">
                                    <span>{m.roundName} {m.groupName}</span>
                                    <span 
                                      style={!isCompleted ? { color: themeColor } : undefined} 
                                      className={isCompleted ? 'text-emerald-500' : 'animate-pulse'}
                                    >
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

                                  {/* Date, Venue, Notes, Referee for brackets */}
                                  <div className="border-t border-slate-200/20 pt-2.5 mt-0.5 w-full flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-[10px] font-black text-slate-800 tracking-tight">{m.location ? m.location.split(' @ ')[0] : 'Por definir'}</span>
                                    <span className="text-[9px] font-bold text-slate-500 lowercase first-letter:uppercase">
                                      {formatMatchDate(m.matchDate)}
                                    </span>
                                    {m.location && m.location.includes(' @ ') && m.location.split(' @ ')[1] && (
                                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider mt-0.5">📍 {m.location.split(' @ ')[1]}</span>
                                    )}
                                    {m.referee && (
                                      <span className="text-[8px] text-[#00C853] font-black uppercase tracking-wider mt-0.5">👤 Árbitro: {m.referee}</span>
                                    )}
                                    {getDisplayNotes(m.notes) && (
                                      <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider mt-0.5">📝 {getDisplayNotes(m.notes)}</span>
                                    )}
                                  </div>

                                </div>
                              )
                            }

                            return (
                              <div className="flex flex-col gap-6 pt-2">
                                {quarts.length > 0 && (
                                  <div className="flex flex-col gap-3">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5">Cuartos de Final</h3>
                                    {quarts.map(m => renderBracketCard(m))}
                                  </div>
                                )}
                                {semis.length > 0 && (
                                  <div className="flex flex-col gap-3">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5">Semifinales</h3>
                                    {semis.map(m => renderBracketCard(m))}
                                  </div>
                                )}
                                {finals.length > 0 && (
                                  <div className="flex flex-col gap-3">
                                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-1.5">Final</h3>
                                    {finals.map(m => renderBracketCard(m))}
                                  </div>
                                )}
                              </div>
                            )
                          } else {
                            /* Standard Round Robin Fixture list styled in vertical match cards */
                            if (activeRoundMatches.length === 0) {
                              return (
                                <div className="text-center py-12 text-slate-400 italic font-bold text-xs uppercase tracking-wider">
                                  No hay partidos agendados en esta fecha.
                                </div>
                              )
                            }

                            return (
                              <div className="space-y-5 pt-1">
                                {activeRoundMatches.map((m) => {
                                  const isBye = m.notes === 'FECHA_LIBRE'
                                  const isCompleted = m.status === 'FINALIZADO'
                                  
                                  if (isBye) {
                                    const playingTeam = m.homeTeam || m.awayTeam
                                    return (
                                      <div
                                        key={m.id}
                                        onClick={() => { if (playingTeam) handleViewTeamRoster(playingTeam) }}
                                        className="bg-emerald-50/50 border border-emerald-200/50 p-5 rounded-[1.5rem] flex items-center justify-between relative overflow-hidden group cursor-pointer hover:shadow-xs transition-all text-center"
                                      >
                                        <div className="flex items-center gap-3">
                                          {playingTeam?.logo ? (
                                            <img src={playingTeam.logo} alt="Logo" className="w-10 h-10 rounded-xl object-cover bg-white border shadow-xs" />
                                          ) : (
                                            <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-500 text-xs">🛡️</div>
                                          )}
                                          <div className="text-left">
                                            <h3 className="font-black text-xs text-slate-800 group-hover:text-emerald-600 transition-colors">{playingTeam?.name || 'Equipo'}</h3>
                                            <div className="flex items-center gap-1.5 mt-0.5">
                                              <span className="bg-emerald-200/30 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">Fecha Libre</span>
                                              <span className="text-slate-400 text-[8px] font-bold">🌴 Descansa esta ronda</span>
                                            </div>
                                          </div>
                                        </div>
                                        <span className="text-xl filter saturate-75 select-none mr-2">🌴</span>
                                      </div>
                                    )
                                  }

                                  return (
                                    <div
                                      key={m.id}
                                      onClick={() => setSelectedMatch(m)}
                                      className="bg-slate-50/40 hover:bg-slate-50 border border-slate-200/50 p-5 rounded-[1.5rem] shadow-xs cursor-pointer transition-all duration-300 flex flex-col gap-4 text-center items-center relative group"
                                    >
                                      {/* Vertical styled match layout matching screenshot */}
                                      <div className="flex items-center justify-between w-full gap-4 relative">
                                        
                                        {/* Home Team Column */}
                                        <div className="flex-1 flex flex-col items-center min-w-0">
                                          {m.homeTeam?.logo ? (
                                            <img src={m.homeTeam.logo} alt="Logo" className="w-12 h-12 rounded-2xl object-cover bg-white border shadow-xs shrink-0" />
                                          ) : (
                                            <div className="w-12 h-12 rounded-2xl bg-white border flex items-center justify-center text-slate-400 text-sm shrink-0">🛡️</div>
                                          )}
                                          <span className="font-black text-slate-800 text-[11px] mt-2 truncate w-full text-center block leading-tight">{m.homeTeam?.name || m.homePlaceholder || 'Equipo 1'}</span>
                                        </div>

                                        {/* Score Column */}
                                        <div className="flex flex-col items-center shrink-0">
                                          <div className="flex items-center gap-3 px-4 py-1.5 bg-white border border-slate-200 rounded-xl font-black text-lg text-slate-900 shadow-xs min-w-[80px] justify-center">
                                            <span 
                                              style={m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore ? { color: themeColor } : undefined} 
                                              className={m.homeScore !== null && m.awayScore !== null && m.homeScore > m.awayScore ? 'font-bold' : 'text-slate-700'}
                                            >
                                              {m.homeScore !== null ? m.homeScore : '-'}
                                            </span>
                                            <span className="text-slate-300 font-medium text-sm">:</span>
                                            <span 
                                              style={m.homeScore !== null && m.awayScore !== null && m.awayScore > m.homeScore ? { color: themeColor } : undefined} 
                                              className={m.homeScore !== null && m.awayScore !== null && m.awayScore > m.homeScore ? 'font-bold' : 'text-slate-700'}
                                            >
                                              {m.awayScore !== null ? m.awayScore : '-'}
                                            </span>
                                          </div>
                                          {m.status === 'EN_VIVO' ? (
                                            <div className="flex items-center gap-2 mt-2">
                                              <span className="bg-yellow-400 text-slate-900 px-2.5 py-0.5 rounded-full text-[8px] font-black uppercase animate-pulse">En Vivo</span>
                                              {parseNotesJson(m.notes) && <LiveMatchTimer notes={m.notes} />}
                                            </div>
                                          ) : (
                                            <span className={`mt-2 px-2.5 py-0.5 rounded text-[8px] font-black border uppercase tracking-wider ${
                                              isCompleted ? 'bg-blue-50 text-blue-500 border-blue-100' : 'bg-amber-50 text-amber-500 border-amber-100 animate-pulse'
                                            }`}>
                                              {isCompleted ? 'Finalizado' : 'Programado'}
                                            </span>
                                          )}
                                        </div>

                                        {/* Away Team Column */}
                                        <div className="flex-1 flex flex-col items-center min-w-0">
                                          {m.awayTeam?.logo ? (
                                            <img src={m.awayTeam.logo} alt="Logo" className="w-12 h-12 rounded-2xl object-cover bg-white border shadow-xs shrink-0" />
                                          ) : (
                                            <div className="w-12 h-12 rounded-2xl bg-white border flex items-center justify-center text-slate-400 text-sm shrink-0">🛡️</div>
                                          )}
                                          <span className="font-black text-slate-800 text-[11px] mt-2 truncate w-full text-center block leading-tight">{m.awayTeam?.name || m.awayPlaceholder || 'Equipo 2'}</span>
                                        </div>

                                      </div>

                                      {/* Match Date, Field, notes */}
                                      <div className="border-t border-slate-200/40 pt-3 w-full flex flex-col items-center justify-center gap-0.5">
                                        <span className="text-[10px] font-black text-slate-800 tracking-tight">{m.location ? m.location.split(' @ ')[0] : 'Por definir'}</span>
                                        <span className="text-[9px] font-bold text-slate-500 lowercase first-letter:uppercase">
                                          {formatMatchDate(m.matchDate)}
                                        </span>
                                        {m.location && m.location.includes(' @ ') && m.location.split(' @ ')[1] && (
                                          <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider mt-0.5">📍 {m.location.split(' @ ')[1]}</span>
                                        )}
                                        {m.referee && (
                                          <span className="text-[8px] text-[#00C853] font-black uppercase tracking-wider mt-0.5">👤 Árbitro: {m.referee}</span>
                                        )}
                                        {getDisplayNotes(m.notes) && (
                                          <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider mt-0.5">📝 {getDisplayNotes(m.notes)}</span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )
                          }
                        })()}
                      </div>
                    </div>

                    {/* CARD 2: ESTADÍSTICAS DE LA FECHA */}
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                      <div style={{ backgroundColor: themeColor }} className="px-6 py-4 shadow-xs">
                        <span className="text-white font-black text-sm uppercase tracking-wider">Estadísticas de la fecha</span>
                      </div>

                      <div className="p-6">
                        {/* Two circles side-by-side: Juegos and Goles */}
                        <div className="flex items-center justify-around border-b border-slate-100 pb-5 mb-5">
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center font-black text-[#FF6B00] text-sm bg-slate-50 shadow-xs">
                              {activePhase?.type === 'ELIMINATORIA' 
                                ? matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase).length
                                : activeRoundMatches.filter(m => m.notes !== 'FECHA_LIBRE').length
                              }
                            </div>
                            <span className="mt-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Juegos</span>
                          </div>

                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center font-black text-[#FF6B00] text-sm bg-slate-50 shadow-xs">
                              {activePhase?.type === 'ELIMINATORIA'
                                ? matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase).reduce((acc, m) => acc + (m.homeScore || 0) + (m.awayScore || 0), 0)
                                : activeRoundMatches.reduce((acc, m) => acc + (m.homeScore || 0) + (m.awayScore || 0), 0)
                              }
                            </div>
                            <span className="mt-1.5 text-[8px] font-black text-slate-400 uppercase tracking-widest text-center">Goles</span>
                          </div>
                        </div>

                        {/* Subheader bar GOLES */}
                        <div className="bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-widest text-center py-1.5 rounded-lg mb-4">
                          GOLES
                        </div>

                        {/* Round Scorers list */}
                        {(() => {
                          const getRoundScorers = () => {
                            const scorers: Record<string, { name: string; team: string; goals: number }> = {}
                            const currentList = activePhase?.type === 'ELIMINATORIA'
                              ? matches.filter(m => (m.phaseName || firstPhaseName) === selectedPhase)
                              : activeRoundMatches

                            currentList.forEach(m => {
                              (m.events || []).forEach((e: any) => {
                                if (e.type === 'GOAL' || e.type === 'OWN_GOAL') {
                                  const pName = e.player?.name || 'Desconocido'
                                  const tName = e.team?.name || ''
                                  const key = pName
                                  if (!scorers[key]) scorers[key] = { name: pName, team: tName, goals: 0 }
                                  scorers[key].goals++
                                }
                              })
                            })
                            return Object.values(scorers).sort((a, b) => b.goals - a.goals).slice(0, 5)
                          }

                          const rScorers = getRoundScorers()
                          if (rScorers.length === 0) {
                            return (
                              <div className="text-center py-6 text-slate-350 italic font-bold text-xs uppercase tracking-wider">
                                No hay goles registrados en esta fecha
                              </div>
                            )
                          }

                          return (
                            <div className="space-y-3.5">
                              {rScorers.map((s, idx) => (
                                <div key={idx} className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-slate-150 border border-slate-200/50 flex items-center justify-center font-black text-slate-400 shrink-0 text-[10px] bg-slate-50 shadow-xs">
                                    👤
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-black text-xs text-slate-800 truncate max-w-[180px]">{s.name}</div>
                                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[180px] mt-0.5">{s.team}</div>
                                  </div>
                                  <div style={{ color: themeColor, backgroundColor: `${themeColor}0d`, borderColor: `${themeColor}1a` }} className="font-black text-xs ml-auto shrink-0 w-8 h-8 rounded-full flex items-center justify-center border shadow-xs">
                                    {s.goals}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )
                        })()}
                      </div>
                    </div>

                  </div>

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

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4" onClick={() => setShowLoginModal(false)}>
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-center">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Iniciar Sesión</h2>
              <p className="text-blue-200 text-xs mt-1">Ingresa para enviar tu mensaje</p>
            </div>
            <div className="p-8">
              {loginError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold mb-4">{loginError}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email</label>
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={e => setLoginEmail(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-100 focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                    placeholder="tu@email.com"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Contraseña</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    className="w-full px-5 py-4 bg-slate-50 rounded-2xl outline-none border border-slate-100 focus:ring-2 focus:ring-blue-500 font-medium text-slate-700"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <div className="mt-8 flex gap-3">
                <button 
                  onClick={() => { setShowLoginModal(false); setLoginError(''); }}
                  className="flex-1 py-4 bg-slate-100 text-slate-600 font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-slate-200 transition-all"
                >Cancelar</button>
                <button
                  onClick={async () => {
                    if (!loginEmail || !loginPassword) { setLoginError('Completa todos los campos'); return }
                    setLoginLoading(true)
                    setLoginError('')
                    try {
                      const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
                      })
                      const data = await res.json()
                      if (!res.ok) {
                        setLoginError(data.error || 'Credenciales incorrectas')
                        setLoginLoading(false)
                        return
                      }
                      localStorage.setItem('token', data.token)
                      localStorage.setItem('user', JSON.stringify(data.user))
                      setLoggedUser(data.user)
                      setShowLoginModal(false)
                      setLoginEmail('')
                      setLoginPassword('')
                      setLoginError('')

                      // Auto-send pending message after login
                      if (newMessage.trim()) {
                        setSendingMessage(true)
                        try {
                          const msgRes = await fetch(`/api/tournaments/${tournamentId}/messages`, {
                            method: 'POST',
                            headers: { Authorization: `Bearer ${data.token}`, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ content: newMessage }),
                          })
                          if (msgRes.ok) {
                            setNewMessage('')
                            const refreshRes = await fetch(`/api/tournaments/${tournamentId}/messages`)
                            if (refreshRes.ok) setMessages(await refreshRes.json())
                          }
                        } catch {}
                        setSendingMessage(false)
                      }
                    } catch {
                      setLoginError('Error de conexión')
                    }
                    setLoginLoading(false)
                  }}
                  disabled={loginLoading}
                  className="flex-[2] py-4 bg-blue-600 text-white font-black rounded-2xl text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 disabled:opacity-50"
                >{loginLoading ? 'Ingresando...' : 'Iniciar Sesión'}</button>
              </div>
              <p className="text-center mt-6 text-slate-400 text-xs">
                ¿No tienes cuenta?{' '}
                <Link href="/register" className="text-blue-600 hover:underline font-bold">Regístrate</Link>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RankingCard({ title, label, data, field, themeColor }: any) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
      <div style={{ backgroundColor: themeColor }} className="p-4 text-center">
        <h3 className="text-white font-black uppercase tracking-widest text-sm">{title}</h3>
      </div>
      <div className="p-0">
        <table className="w-full">
          <thead style={{ backgroundColor: `${themeColor}1a`, color: themeColor }} className="text-[10px] font-black uppercase tracking-widest">
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
