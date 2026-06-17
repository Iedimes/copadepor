import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
export const dynamic = 'force-dynamic'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const matchSchema = z.object({
  homeTeamId: z.string().optional(),
  awayTeamId: z.string().optional(),
  matchDate: z.string().transform(s => new Date(s)),
  roundName: z.string().optional(),
  phaseName: z.string().optional(),
  advantageTeamId: z.string().nullable().optional(),
})

const generateMatchesSchema = z.object({
  roundName: z.string().default('1ª Fecha'),
  roundDate: z.string().transform(s => new Date(s)),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

async function cascadeResetMatches(matchIds: string[], tournamentId: string) {
  if (matchIds.length === 0) return

  // 1. Fetch matches to know their roundNames and groupNames so we can compute their placeholders
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: { id: true, roundName: true, groupName: true, phaseName: true }
  })

  // 2. Perform deep cleaning for these matches
  await prisma.matchEvent.deleteMany({ where: { matchId: { in: matchIds } } })
  await prisma.goal.deleteMany({ where: { matchId: { in: matchIds } } })
  await prisma.matchReport.deleteMany({ where: { matchId: { in: matchIds } } })

  // 3. Reset status and scores for these matches
  await prisma.match.updateMany({
    where: { id: { in: matchIds } },
    data: {
      homeScore: null,
      awayScore: null,
      homePenaltyScore: null,
      awayPenaltyScore: null,
      status: 'SCHEDULED',
      notes: null
    }
  })

  // 4. Find all dependent matches in the same phase and tournament
  const dependentMatchIdsToReset: string[] = []

  for (const m of matches) {
    if (!m.roundName || !m.groupName) continue
    const matchLabel = `Ganador ${m.roundName} ${m.groupName}`

    // Find if any match has this label as homePlaceholder
    const nextHomeMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        phaseName: m.phaseName,
        homePlaceholder: matchLabel
      },
      select: { id: true }
    })

    if (nextHomeMatches.length > 0) {
      const ids = nextHomeMatches.map(nm => nm.id)
      await prisma.match.updateMany({
        where: { id: { in: ids } },
        data: { homeTeamId: null }
      })
      dependentMatchIdsToReset.push(...ids)
    }

    // Find if any match has this label as awayPlaceholder
    const nextAwayMatches = await prisma.match.findMany({
      where: {
        tournamentId,
        phaseName: m.phaseName,
        awayPlaceholder: matchLabel
      },
      select: { id: true }
    })

    if (nextAwayMatches.length > 0) {
      const ids = nextAwayMatches.map(nm => nm.id)
      await prisma.match.updateMany({
        where: { id: { in: ids } },
        data: { awayTeamId: null }
      })
      dependentMatchIdsToReset.push(...ids)
    }
  }

  // 5. Recursively reset any dependent matches that we cleared
  if (dependentMatchIdsToReset.length > 0) {
    const uniqueIds = Array.from(new Set(dependentMatchIdsToReset))
    await cascadeResetMatches(uniqueIds, tournamentId)
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { searchParams } = new URL(request.url)
    const categoryId = searchParams.get('categoryId')

    const where: any = { tournamentId: params.id }
    if (categoryId && categoryId !== 'null' && categoryId !== 'undefined' && categoryId.trim() !== '') {
      where.categoryId = categoryId
    }

    const matches = await prisma.match.findMany({
      where,
      include: {
        homeTeam: { 
          select: { 
            id: true, 
            name: true,
            logo: true,
            color: true,
            _count: { select: { teamMembers: true } }
          } 
        },
        awayTeam: { 
          select: { 
            id: true, 
            name: true,
            logo: true,
            color: true,
            _count: { select: { teamMembers: true } }
          } 
        },
        events: {
          include: {
            player: { select: { id: true, name: true } },
            assist: { select: { id: true, name: true } },
            team: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { matchDate: 'asc' },
    })

    // Map database status to frontend strings
    const statusMap: Record<string, string> = {
      'SCHEDULED': 'NO_REALIZADO',
      'IN_PROGRESS': 'EN_VIVO',
      'COMPLETED': 'FINALIZADO'
    }
    const mappedMatches = await Promise.all(matches.map(async (m) => {
      // Resolve player names for events where player relation is null (global players via TeamPlayer)
      const resolvedEvents = await Promise.all(m.events.map(async (e) => {
        if (!(e as any).player && e.playerId) {
          try {
            const tp = await prisma.teamPlayer.findUnique({
              where: { id: e.playerId },
              include: { player: { include: { user: { select: { name: true } } } } }
            })
            if (tp) {
              (e as any).player = { id: tp.id, name: tp.player.user.name }
            }
            // Also try assist
            if (!(e as any).assist && e.assistId) {
              const tpAssist = await prisma.teamPlayer.findUnique({
                where: { id: e.assistId },
                include: { player: { include: { user: { select: { name: true } } } } }
              })
              if (tpAssist) {
                (e as any).assist = { id: tpAssist.id, name: tpAssist.player.user.name }
              }
            }
          } catch { /* ignore */ }
        }
        return e
      }))
      return {
        ...m,
        events: resolvedEvents,
        status: statusMap[m.status] || m.status
      }
    }))

    return NextResponse.json(mappedMatches)
  } catch (error) {
    console.error('Get matches error:', error)
    return NextResponse.json({ error: 'Error al obtener partidos' }, { status: 500 })
  }
}
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || (tournament.organizerId !== payload.userId && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado: No eres el organizador de este torneo' }, { status: 403 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const categoryId = url.searchParams.get('categoryId')

    if (action === 'deleteAll') {
      await prisma.match.deleteMany({
        where: { 
          tournamentId: params.id,
          ...(categoryId && { categoryId })
        },
      })
      return NextResponse.json({ message: 'Todos los partidos eliminados' })
    }

    if (action === 'deleteStage') {
      const stageName = url.searchParams.get('stageName')
      const phaseName = url.searchParams.get('phaseName')
      if (!stageName) return NextResponse.json({ error: 'stageName requerido' }, { status: 400 })
      await prisma.match.deleteMany({
        where: {
          tournamentId: params.id,
          roundName: stageName,
          ...(phaseName ? { phaseName } : {}),
          ...(categoryId && { categoryId })
        },
      })
      return NextResponse.json({ message: `Partidos de ${stageName} eliminados` })
    }

    if (action === 'deletePhase') {
      const phaseName = url.searchParams.get('phaseName')
      if (!phaseName) return NextResponse.json({ error: 'phaseName requerido' }, { status: 400 })
      await prisma.match.deleteMany({
        where: {
          tournamentId: params.id,
          phaseName: phaseName,
          ...(categoryId && { categoryId })
        },
      })
      return NextResponse.json({ message: `Partidos de la fase ${phaseName} eliminados` })
    }

    if (action === 'resetPhaseResults' || action === 'resetMatch') {
      const phaseName = url.searchParams.get('phaseName')
      const matchId = url.searchParams.get('matchId')
      
      let matchIds: string[] = []
      
      if (action === 'resetMatch' && matchId) {
        matchIds = [matchId]
      } else if (action === 'resetPhaseResults' && phaseName) {
        const phaseMatches = await prisma.match.findMany({
          where: { 
            tournamentId: params.id, 
            phaseName,
            ...(categoryId && { categoryId })
          },
          select: { id: true }
        })
        matchIds = phaseMatches.map(m => m.id)
      } else {
        return NextResponse.json({ error: 'Faltan parámetros (matchId o phaseName)' }, { status: 400 })
      }

      if (matchIds.length === 0) {
        return NextResponse.json({ message: 'No se encontraron partidos' })
      }

      // Ejecutar la limpieza y reset en cascada recursiva
      await cascadeResetMatches(matchIds, params.id)

      return NextResponse.json({ 
        message: action === 'resetMatch' ? 'Partido restaurado' : 'Fase restaurada', 
        count: matchIds.length 
      })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (error) {
    console.error('Delete matches error:', error)
    return NextResponse.json({ error: 'Error al eliminar partidos' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || (tournament.organizerId !== payload.userId && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado: No eres el organizador de este torneo' }, { status: 403 })
    }

    const body = await request.json()
    const url = new URL(request.url)
    const action = url.searchParams.get('action')
    const categoryId = url.searchParams.get('categoryId') || body.categoryId || null

    if (action === 'generate') {
      const roundDateStr = body.roundDate || new Date().toISOString()
      const roundDate = new Date(roundDateStr)
      const phaseName = body.phaseName || '1° Fase'
      const genFormat = body.genFormat || 'STANDARD'
      const matchType = body.matchType || 'ida'

      if (isNaN(roundDate.getTime())) {
        return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
      }

      // 1. Get Phase to know which teams are participating
      const phase = await prisma.phase.findFirst({
        where: { 
          tournamentId: params.id, 
          name: phaseName,
          ...(categoryId && { categoryId })
        }
      })

      let participatingTeamIds: string[] = []
      if (phase?.teams) {
        try {
          participatingTeamIds = JSON.parse(phase.teams)
        } catch (e) {
          console.error('Error parsing phase teams:', e)
        }
      }

      // 2. Fetch TournamentTeam details to get groupName
      const allTournamentTeams = await prisma.tournamentTeam.findMany({
        where: { 
          tournamentId: params.id,
          ...(participatingTeamIds.length > 0 ? { teamId: { in: participatingTeamIds } } : {}),
          ...(categoryId && { categoryId })
        },
      })

      if (allTournamentTeams.length < 2) {
        return NextResponse.json({ error: 'Se necesitan al menos 2 equipos' }, { status: 400 })
      }

      const teamIds = allTournamentTeams.map(t => t.teamId)
      const matches: { homeTeamId: string; awayTeamId: string; roundName: string; notes?: string | null }[] = []

      if (genFormat === 'INTERGROUP') {
        // Group x Group Logic
        const groups: Record<string, string[]> = {}
        allTournamentTeams.forEach(tt => {
          const gn = tt.groupName || 'SIN_GRUPO'
          if (!groups[gn]) groups[gn] = []
          groups[gn].push(tt.teamId)
        })

        const groupNames = Object.keys(groups)
        if (groupNames.length < 2) {
          return NextResponse.json({ error: 'Se necesitan al menos 2 grupos para este formato' }, { status: 400 })
        }

        // Generate matches between Group 1 and Group 2, etc.
        let roundIdx = 1
        for (let i = 0; i < groupNames.length; i++) {
          for (let j = i + 1; j < groupNames.length; j++) {
            const groupA = groups[groupNames[i]]
            const groupB = groups[groupNames[j]]
            
            for (const teamA of groupA) {
              for (const teamB of groupB) {
                matches.push({ homeTeamId: teamA, awayTeamId: teamB, roundName: String(roundIdx) })
                if (matchType === 'idayvuelta') {
                  matches.push({ homeTeamId: teamB, awayTeamId: teamA, roundName: String(roundIdx + 1) })
                }
              }
              roundIdx++
            }
          }
        }
      } else if (genFormat === 'SWISS') {
        // Basic Swiss Round 1: Random pairing
        const shuffled = [...teamIds].sort(() => Math.random() - 0.5)
        for (let i = 0; i < shuffled.length; i += 2) {
          if (shuffled[i] && shuffled[i+1]) {
            matches.push({ homeTeamId: shuffled[i], awayTeamId: shuffled[i+1], roundName: '1' })
          }
        }
      } else {
        // STANDARD Round Robin — group-aware: separate round-robin per group
        const generateRoundRobin = (teamList: string[], roundOffset: number) => {
          const shuffledIds = [...teamList].sort(() => Math.random() - 0.5)
          const isOdd = shuffledIds.length % 2 !== 0
          const tempTeams = isOdd ? [...shuffledIds, null] : [...shuffledIds]
          const n = tempTeams.length
          const numRounds = n - 1
          let rotatingTeams = [...tempTeams]
          const groupMatches: typeof matches = []
          
          for (let round = 1; round <= numRounds; round++) {
            const roundName = `${roundOffset + round}`
            for (let i = 0; i < n / 2; i++) {
              const home = rotatingTeams[i]
              const away = rotatingTeams[n - 1 - i]
              
              if (home === null || away === null) {
                const playingTeam = home === null ? away : home
                if (playingTeam) {
                  groupMatches.push({
                    homeTeamId: playingTeam,
                    awayTeamId: null as any,
                    roundName,
                    notes: 'FECHA_LIBRE'
                  })
                }
              } else {
                groupMatches.push({ homeTeamId: home, awayTeamId: away, roundName })
              }
            }
            rotatingTeams = [rotatingTeams[0], rotatingTeams[n - 1], ...rotatingTeams.slice(1, n - 1)]
          }
          
          if (matchType === 'idayvuelta') {
            const currentCount = groupMatches.length
            for (let i = 0; i < currentCount; i++) {
              const m = groupMatches[i]
              groupMatches.push({ 
                homeTeamId: m.awayTeamId, 
                awayTeamId: m.homeTeamId, 
                roundName: String(Number(m.roundName) + numRounds),
                notes: m.notes || null
              })
            }
          }
          
          return groupMatches
        }

        // Check if teams have groupNames
        const teamsByGroup: Record<string, string[]> = {}
        allTournamentTeams.forEach(tt => {
          const gn = tt.groupName || '__NO_GROUP__'
          if (!teamsByGroup[gn]) teamsByGroup[gn] = []
          teamsByGroup[gn].push(tt.teamId)
        })

        const groupNames = Object.keys(teamsByGroup)
        const hasGroups = groupNames.length > 1 || (groupNames.length === 1 && groupNames[0] !== '__NO_GROUP__')

        if (hasGroups) {
          let roundOffset = 0
          for (const gn of groupNames) {
            if (gn === '__NO_GROUP__') continue
            const gMatches = generateRoundRobin(teamsByGroup[gn], roundOffset)
            matches.push(...gMatches)
            const roundsUsed = gMatches.length > 0 ? Math.max(...gMatches.map(m => Number(m.roundName))) : 0
            roundOffset = roundsUsed
          }
        } else {
          const gMatches = generateRoundRobin(teamIds, 0)
          matches.push(...gMatches)
        }
      }
 
      try {
        const matchesData = matches.map(m => ({
          tournamentId: params.id,
          categoryId: categoryId || phase?.categoryId || null,
          homeTeamId: m.homeTeamId || null,
          awayTeamId: m.awayTeamId || null,
          matchDate: roundDate,
          roundName: String(m.roundName),
          roundOrder: isNaN(Number(m.roundName)) ? 0 : Number(m.roundName),
          phaseName,
          phaseId: phase?.id || null,
          status: 'SCHEDULED' as const,
          notes: m.notes || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))

        const result = await prisma.match.createMany({
          data: matchesData,
        })
 
        return NextResponse.json({ count: result.count }, { status: 201 })
      } catch (error) {
        console.error('Generate matches error:', error)
        return NextResponse.json({ error: 'Error al generar partidos: ' + (error as Error).message }, { status: 500 })
      }
    } else if (action === 'generatePlayoff') {
      const { stageName, numMatches, phaseName } = body
      if (!stageName || !numMatches) {
        return NextResponse.json({ error: 'Faltan parámetros (stageName, numMatches)' }, { status: 400 })
      }

      try {
        const roundDateStr = body.roundDate || new Date().toISOString()
        const roundDate = new Date(roundDateStr)
        
        const phase = await prisma.phase.findFirst({
          where: {
            tournamentId: params.id,
            name: phaseName || 'Fase Final',
            ...(categoryId && { categoryId })
          }
        })

        const playoffMatchesData = Array.from({ length: numMatches }).map(() => ({
          tournamentId: params.id,
          categoryId: categoryId || phase?.categoryId || null,
          homeTeamId: null, 
          awayTeamId: null, 
          matchDate: roundDate,
          roundName: stageName,
          phaseName: phaseName || 'Fase Final',
          phaseId: phase?.id || null,
          status: 'SCHEDULED' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        }))

        const result = await prisma.match.createMany({
          data: playoffMatchesData,
        })
        
        return NextResponse.json({ count: result.count }, { status: 201 })
      } catch (error) {
        console.error('Generate playoff error:', error)
        return NextResponse.json({ error: 'Error al generar eliminatoria' }, { status: 500 })
      }
    } else if (action === 'generateAdvantagePlayoff') {
      try {
        const phaseName = body.phaseName || 'Fase Final'
        const phase = await prisma.phase.findFirst({
          where: {
            tournamentId: params.id,
            name: phaseName,
            ...(categoryId && { categoryId })
          }
        })

        const matches = await prisma.match.findMany({
          where: { 
            tournamentId: params.id, 
            status: 'COMPLETED',
            ...(categoryId && { categoryId })
          },
        })

        const tournamentTeams = await prisma.tournamentTeam.findMany({
          where: { 
            tournamentId: params.id,
            ...(categoryId && { categoryId })
          },
          include: { team: true }
        })

        const stats: Record<string, any> = {}
        tournamentTeams.forEach(tt => {
          stats[tt.teamId] = { teamId: tt.teamId, name: tt.team.name, points: 0, gf: 0, ga: 0, played: 0 }
        })

        matches.forEach(m => {
          if (m.homeTeamId && m.awayTeamId && m.homeScore !== null && m.awayScore !== null) {
            stats[m.homeTeamId].played++
            stats[m.awayTeamId].played++
            stats[m.homeTeamId].gf += m.homeScore
            stats[m.homeTeamId].ga += m.awayScore
            stats[m.awayTeamId].gf += m.awayScore
            stats[m.awayTeamId].ga += m.homeScore

            if (m.homeScore > m.awayScore) stats[m.homeTeamId].points += 3
            else if (m.homeScore < m.awayScore) stats[m.awayTeamId].points += 3
            else {
              stats[m.homeTeamId].points += 1
              stats[m.awayTeamId].points += 1
            }
          }
        })

        const standings = Object.values(stats).sort((a: any, b: any) => 
          b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
        )

        if (standings.length < 8) {
          return NextResponse.json({ error: 'Se necesitan al menos 8 equipos con estadísticas' }, { status: 400 })
        }

        const top4 = standings.slice(0, 4)
        const next4 = standings.slice(4, 8)

        // Shuffle next4 for random draw
        const shuffledNext4 = [...next4].sort(() => Math.random() - 0.5)

        const roundDate = new Date()
        let createdCount = 0

        for (let i = 0; i < 4; i++) {
          await prisma.match.create({
            data: {
              tournamentId: params.id,
              categoryId: categoryId || phase?.categoryId || null,
              homeTeamId: top4[i].teamId,
              awayTeamId: shuffledNext4[i].teamId,
              matchDate: roundDate,
              roundName: 'Cuartos',
              phaseName: phaseName,
              phaseId: phase?.id || null,
              status: 'SCHEDULED',
              advantageTeamId: top4[i].teamId,
              notes: 'Ventaja deportiva para ' + top4[i].name
            },
          })
          createdCount++
        }

        return NextResponse.json({ count: createdCount, message: 'Sorteo de Cuartos realizado con éxito' }, { status: 201 })
      } catch (error) {
        console.error('Generate advantage playoff error:', error)
        return NextResponse.json({ error: 'Error al generar sorteo' }, { status: 500 })
      }
    } else if (action === 'generateSemifinals') {
      try {
        const phaseName = body.phaseName || 'Fase Final'
        const phase = await prisma.phase.findFirst({
          where: {
            tournamentId: params.id,
            name: phaseName,
            ...(categoryId && { categoryId })
          }
        })

        const cuartosMatches = await prisma.match.findMany({
          where: { 
            tournamentId: params.id, 
            roundName: 'Cuartos', 
            phaseName,
            ...(categoryId && { categoryId })
          },
          orderBy: { createdAt: 'asc' }
        })

        if (cuartosMatches.length !== 4) {
          return NextResponse.json({ error: `Se encontraron ${cuartosMatches.length} partidos de Cuartos. Se necesitan exactamente 4.` }, { status: 400 })
        }

        const winners: string[] = []
        for (const m of cuartosMatches) {
          if (m.status !== 'COMPLETED') {
            return NextResponse.json({ error: 'Todos los partidos de Cuartos deben estar finalizados' }, { status: 400 })
          }
          if (m.homeScore === null || m.awayScore === null || !m.homeTeamId || !m.awayTeamId) {
             return NextResponse.json({ error: 'Faltan resultados o equipos en los partidos de Cuartos' }, { status: 400 })
          }

          if (m.homeScore > m.awayScore) {
            winners.push(m.homeTeamId)
          } else if (m.awayScore > m.homeScore) {
            winners.push(m.awayTeamId)
          } else {
            if (m.advantageTeamId) {
              winners.push(m.advantageTeamId)
            } else {
              return NextResponse.json({ error: 'Hubo un empate sin ventaja deportiva asignada. Debe definir un ganador editando el resultado.' }, { status: 400 })
            }
          }
        }

        // Eliminar Semifinales existentes si las hubiera
        await prisma.match.deleteMany({
          where: { 
            tournamentId: params.id, 
            roundName: 'Semi Final', 
            phaseName,
            ...(categoryId && { categoryId })
          }
        })

        const roundDate = new Date()
        
        // Crear 2 partidos de semifinales
        await prisma.match.create({
          data: {
            tournamentId: params.id,
            categoryId: categoryId || phase?.categoryId || null,
            homeTeamId: winners[0],
            awayTeamId: winners[1],
            matchDate: roundDate,
            roundName: 'Semi Final',
            phaseName,
            phaseId: phase?.id || null,
            status: 'SCHEDULED'
          }
        })
        await prisma.match.create({
          data: {
            tournamentId: params.id,
            categoryId: categoryId || phase?.categoryId || null,
            homeTeamId: winners[2],
            awayTeamId: winners[3],
            matchDate: roundDate,
            roundName: 'Semi Final',
            phaseName,
            phaseId: phase?.id || null,
            status: 'SCHEDULED'
          }
        })

        return NextResponse.json({ message: 'Semifinales generadas con éxito' }, { status: 201 })
      } catch (error) {
        console.error('Generate semifinals error:', error)
        return NextResponse.json({ error: 'Error al generar semifinales' }, { status: 500 })
      }
    } else if (action === 'generateKnockoutTree') {
      try {
        const { teamIds, teamCount: rawTeamCount, phaseName, matchType, selectionMode, generationMode } = body
        const count = generationMode === 'vacios'
          ? Math.max(Number(rawTeamCount || 0), 2)
          : Math.max(teamIds ? teamIds.length : 0, 2)
        
        const phase = await prisma.phase.findFirst({
          where: {
            tournamentId: params.id,
            name: phaseName,
            ...(categoryId && { categoryId })
          }
        })

        // Determinar ronda inicial
        let startRound = ''
        let roundsToCreate: string[] = []
        if (count <= 2) { startRound = 'Final'; roundsToCreate = ['Final'] }
        else if (count <= 4) { startRound = 'Semifinal'; roundsToCreate = ['Semifinal', 'Final'] }
        else if (count <= 8) { startRound = 'Cuartos de final'; roundsToCreate = ['Cuartos de final', 'Semifinal', 'Final'] }
        else if (count <= 16) { startRound = 'Octavos de final'; roundsToCreate = ['Octavos de final', 'Cuartos de final', 'Semifinal', 'Final'] }
        else { startRound = 'Eliminatoria'; roundsToCreate = ['Eliminatoria', 'Octavos de final', 'Cuartos de final', 'Semifinal', 'Final'] }

        let finalTeamIds = teamIds ? [...teamIds] : []
        if (count === 4 && finalTeamIds.length === 4) {
          // Fetch groups info to perform the crossover
          const dbTeams = await prisma.tournamentTeam.findMany({
            where: {
              tournamentId: params.id,
              teamId: { in: finalTeamIds },
              ...(categoryId && { categoryId })
            }
          })

          const hasGroups = dbTeams.some(t => t.groupName !== null && t.groupName !== undefined)
          if (hasGroups) {
            // Calculate standings statistics in group phases for these 4 teams
            const groupMatches = await prisma.match.findMany({
              where: {
                tournamentId: params.id,
                phaseName: { startsWith: 'Grupo ' },
                status: 'COMPLETED',
                ...(categoryId && { categoryId })
              }
            })

            const teamPoints: Record<string, number> = {}
            const teamGoalDiff: Record<string, number> = {}
            const teamGoalsFor: Record<string, number> = {}
            
            finalTeamIds.forEach(id => {
              teamPoints[id] = 0
              teamGoalDiff[id] = 0
              teamGoalsFor[id] = 0
            })

            groupMatches.forEach(m => {
              if (m.homeScore === null || m.awayScore === null || !m.homeTeamId || !m.awayTeamId) return
              
              const hPoints = m.homeScore > m.awayScore ? 3 : m.homeScore < m.awayScore ? 0 : 1
              const aPoints = m.awayScore > m.homeScore ? 3 : m.awayScore < m.homeScore ? 0 : 1
              
              if (teamPoints[m.homeTeamId] !== undefined) {
                teamPoints[m.homeTeamId] += hPoints
                teamGoalDiff[m.homeTeamId] += (m.homeScore - m.awayScore)
                teamGoalsFor[m.homeTeamId] += m.homeScore
              }
              if (teamPoints[m.awayTeamId] !== undefined) {
                teamPoints[m.awayTeamId] += aPoints
                teamGoalDiff[m.awayTeamId] += (m.awayScore - m.homeScore)
                teamGoalsFor[m.awayTeamId] += m.awayScore
              }
            })

            const groupATeams = dbTeams
              .filter(t => t.groupName === 'A')
              .map(t => t.teamId)
              .sort((a, b) => {
                const pDiff = (teamPoints[b] || 0) - (teamPoints[a] || 0)
                if (pDiff !== 0) return pDiff
                const gdDiff = (teamGoalDiff[b] || 0) - (teamGoalDiff[a] || 0)
                if (gdDiff !== 0) return gdDiff
                return (teamGoalsFor[b] || 0) - (teamGoalsFor[a] || 0)
              })

            const groupBTeams = dbTeams
              .filter(t => t.groupName === 'B')
              .map(t => t.teamId)
              .sort((a, b) => {
                const pDiff = (teamPoints[b] || 0) - (teamPoints[a] || 0)
                if (pDiff !== 0) return pDiff
                const gdDiff = (teamGoalDiff[b] || 0) - (teamGoalDiff[a] || 0)
                if (gdDiff !== 0) return gdDiff
                return (teamGoalsFor[b] || 0) - (teamGoalsFor[a] || 0)
              })

            if (groupATeams.length === 2 && groupBTeams.length === 2) {
              // Crossover pairings
              finalTeamIds[0] = groupATeams[0]
              finalTeamIds[1] = groupBTeams[1]
              finalTeamIds[2] = groupBTeams[0]
              finalTeamIds[3] = groupATeams[1]
            }
          }
        }

        // Limpiar partidos existentes en esta fase
        await prisma.match.deleteMany({
          where: { 
            tournamentId: params.id, 
            phaseName,
            ...(categoryId && { categoryId })
          }
        })

        const roundDate = new Date()
        const isIdaVuelta = matchType === 'idayvuelta'

        const treeMatchesData: any[] = []

        // 1. Generar Primera Ronda (con equipos o vacía)
        const numMatches = Math.floor(count / 2)
        for (let i = 0; i < numMatches; i++) {
          const homeId = finalTeamIds ? finalTeamIds[i * 2] : null
          const awayId = finalTeamIds ? finalTeamIds[i * 2 + 1] : null
          
          const isNullTeam = !homeId && !awayId
          const matchData = {
            tournamentId: params.id,
            categoryId: categoryId || phase?.categoryId || null,
            homeTeamId: homeId || null,
            awayTeamId: awayId || null,
            homePlaceholder: isNullTeam ? `Pendiente #${i * 2 + 1}` : null,
            awayPlaceholder: isNullTeam ? `Pendiente #${i * 2 + 2}` : null,
            matchDate: roundDate,
            roundName: startRound,
            groupName: `#${i + 1}`,
            phaseName,
            phaseId: phase?.id || null,
            status: 'SCHEDULED' as const,
            advantageTeamId: (selectionMode === 'clasificacion' && homeId) ? homeId : null,
            createdAt: new Date(),
            updatedAt: new Date(),
          }

          treeMatchesData.push(matchData)
          if (isIdaVuelta) {
            treeMatchesData.push({ 
              ...matchData, 
              homeTeamId: awayId || null, 
              awayTeamId: homeId || null, 
              advantageTeamId: null, 
              notes: 'Partido de vuelta' 
            })
          }
        }

        // 2. Generar rondas subsiguientes (vacías)
        let currentLevelMatches = numMatches
        for (let r = 1; r < roundsToCreate.length; r++) {
          const rName = roundsToCreate[r]
          const prevRoundName = roundsToCreate[r-1]
          currentLevelMatches = Math.floor(currentLevelMatches / 2)
          
          for (let i = 0; i < currentLevelMatches; i++) {
            treeMatchesData.push({
              tournamentId: params.id,
              categoryId: categoryId || phase?.categoryId || null,
              homeTeamId: null,
              awayTeamId: null,
              matchDate: roundDate,
              roundName: rName,
              groupName: `#${i + 1}`,
              homePlaceholder: `Ganador ${prevRoundName} #${i * 2 + 1}`,
              awayPlaceholder: `Ganador ${prevRoundName} #${i * 2 + 2}`,
              phaseName,
              phaseId: phase?.id || null,
              status: 'SCHEDULED' as const,
              createdAt: new Date(),
              updatedAt: new Date(),
            })
          }
        }

        const result = await prisma.match.createMany({
          data: treeMatchesData
        })

        return NextResponse.json({ message: 'Árbol eliminatorio generado con éxito', count: result.count }, { status: 201 })
      } catch (error) {
        console.error('Generate knockout tree error:', error)
        return NextResponse.json({ error: 'Error al generar el árbol' }, { status: 500 })
      }
    } else if (action === 'reorderRounds') {
      try {
        const { phaseName } = body
        if (!phaseName) return NextResponse.json({ error: 'phaseName requerido' }, { status: 400 })

        const matches = await prisma.match.findMany({
          where: { 
            tournamentId: params.id, 
            phaseName,
            ...(categoryId && { categoryId })
          },
          orderBy: { createdAt: 'asc' }
        })

        const roundNames = [...new Set(matches.map(m => m.roundName))]
        const numericRounds = roundNames.filter(r => !isNaN(Number(r))).sort((a, b) => Number(a) - Number(b))
        
        let updatedCount = 0
        for (let i = 0; i < numericRounds.length; i++) {
          const oldName = numericRounds[i]
          const newName = String(i + 1)
          if (oldName !== newName) {
            await prisma.match.updateMany({
              where: { 
                tournamentId: params.id, 
                phaseName, 
                roundName: oldName,
                ...(categoryId && { categoryId })
              },
              data: { roundName: newName }
            })
            updatedCount++
          }
        }

        return NextResponse.json({ message: 'Rondas reordenadas con éxito', updatedCount })
      } catch (error) {
        console.error('Reorder rounds error:', error)
        return NextResponse.json({ error: 'Error al reordenar rondas' }, { status: 500 })
      }
    } else if (action === 'reassignRounds') {
      try {
        const { phaseName, roundSequence } = body
        if (!phaseName || !roundSequence || !Array.isArray(roundSequence)) {
          return NextResponse.json({ error: 'phaseName y roundSequence requeridos' }, { status: 400 })
        }
        
        const summary = await prisma.$transaction(async (tx) => {
          const results = []
          for (let i = 0; i < roundSequence.length; i++) {
            const count = await tx.match.updateMany({
              where: { 
                tournamentId: params.id, 
                phaseName, 
                roundName: String(roundSequence[i]),
                ...(categoryId && { categoryId })
              },
              data: { roundOrder: i + 1 }
            })
            results.push({ round: roundSequence[i], order: i + 1, updated: count.count })
          }
          return results
        })

        const totalFound = summary.reduce((acc, r) => acc + r.updated, 0)
        console.log(`[API] Updated roundOrder for tournament ${params.id}, phase "${phaseName}". Total matches updated: ${totalFound}`)
        return NextResponse.json({ 
          message: totalFound > 0 ? 'Orden de rondas actualizado con éxito' : 'No se encontraron partidos para las rondas especificadas', 
          summary 
        })
      } catch (error) {
        console.error('Reassign rounds error:', error)
        return NextResponse.json({ error: 'Error al reasignar rondas' }, { status: 500 })
      }
    } else if (action === 'generateFinal') {
      try {
        const phaseName = body.phaseName || 'Fase Final'
        const phase = await prisma.phase.findFirst({
          where: {
            tournamentId: params.id,
            name: phaseName,
            ...(categoryId && { categoryId })
          }
        })

        const semiMatches = await prisma.match.findMany({
          where: { 
            tournamentId: params.id, 
            roundName: 'Semi Final', 
            phaseName,
            ...(categoryId && { categoryId })
          },
          orderBy: { createdAt: 'asc' }
        })

        if (semiMatches.length !== 2) {
          return NextResponse.json({ error: `Se encontraron ${semiMatches.length} partidos de Semifinales. Se necesitan exactamente 2.` }, { status: 400 })
        }

        const winners: string[] = []
        for (const m of semiMatches) {
          if (m.status !== 'COMPLETED') {
            return NextResponse.json({ error: 'Todos los partidos de Semifinales deben estar finalizados' }, { status: 400 })
          }
          if (m.homeScore === null || m.awayScore === null || !m.homeTeamId || !m.awayTeamId) {
             return NextResponse.json({ error: 'Faltan resultados o equipos en los partidos de Semifinales' }, { status: 400 })
          }

          if (m.homeScore > m.awayScore) {
            winners.push(m.homeTeamId)
          } else if (m.awayScore > m.homeScore) {
            winners.push(m.awayTeamId)
          } else {
            return NextResponse.json({ error: 'Hubo un empate en semifinales. A partir de esta etapa no hay ventaja deportiva. Debe definir un ganador editando el resultado (ej. sumando goles de penales).' }, { status: 400 })
          }
        }

        // Eliminar Final existente si la hubiera
        await prisma.match.deleteMany({
          where: { 
            tournamentId: params.id, 
            roundName: 'Final', 
            phaseName,
            ...(categoryId && { categoryId })
          }
        })

        const roundDate = new Date()
        
        await prisma.match.create({
          data: {
            tournamentId: params.id,
            categoryId: categoryId || phase?.categoryId || null,
            homeTeamId: winners[0],
            awayTeamId: winners[1],
            matchDate: roundDate,
            roundName: 'Final',
            phaseName,
            phaseId: phase?.id || null,
            status: 'SCHEDULED'
          }
        })

        return NextResponse.json({ message: 'Final generada con éxito' }, { status: 201 })
      } catch (error) {
        console.error('Generate final error:', error)
        return NextResponse.json({ error: 'Error al generar la final' }, { status: 500 })
      }
    }

    const validated = matchSchema.parse(body)
    const phase = await prisma.phase.findFirst({
      where: {
        tournamentId: params.id,
        name: validated.phaseName || '1° Fase',
        ...(categoryId && { categoryId })
      }
    })
    
    const match = await prisma.match.create({
      data: {
        tournamentId: params.id,
        categoryId: categoryId || phase?.categoryId || null,
        homeTeamId: validated.homeTeamId,
        awayTeamId: validated.awayTeamId,
        matchDate: validated.matchDate,
        roundName: validated.roundName || '1ª Fecha',
        phaseName: validated.phaseName || '1° Fase',
        phaseId: phase?.id || null,
        status: 'SCHEDULED',
        advantageTeamId: validated.advantageTeamId,
      },
      include: {
        homeTeam: { select: { id: true, name: true, logo: true, color: true } },
        awayTeam: { select: { id: true, name: true, logo: true, color: true } },
      },
    })

    return NextResponse.json(match, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create match error:', error)
    return NextResponse.json({ error: 'Error al crear partido' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || (tournament.organizerId !== payload.userId && payload.role !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'renameRound') {
      const body = await request.json()
      const { phaseName, oldRoundName, newRoundName, categoryId } = body

      if (!phaseName || !oldRoundName || !newRoundName) {
        return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
      }

      const updatedCount = await prisma.match.updateMany({
        where: {
          tournamentId: params.id,
          phaseName: phaseName,
          roundName: oldRoundName,
          ...(categoryId && { categoryId })
        },
        data: {
          roundName: newRoundName,
        },
      })

      return NextResponse.json({ message: 'Ronda renombrada con éxito', updatedCount: updatedCount.count })
    }

    return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
  } catch (error) {
    console.error('Update matches error:', error)
    return NextResponse.json({ error: 'Error al actualizar partidos' }, { status: 500 })
  }
}