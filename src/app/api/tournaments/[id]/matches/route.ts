import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const matches = await prisma.match.findMany({
      where: { tournamentId: params.id },
      include: {
        homeTeam: { 
          select: { 
            id: true, 
            name: true,
            _count: { select: { teamMembers: true } }
          } 
        },
        awayTeam: { 
          select: { 
            id: true, 
            name: true,
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
    const mappedMatches = matches.map(m => ({
      ...m,
      status: statusMap[m.status] || m.status
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

    if (!tournament || tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'deleteAll') {
      await prisma.match.deleteMany({
        where: { tournamentId: params.id },
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
        },
      })
      return NextResponse.json({ message: `Partidos de la fase ${phaseName} eliminados` })
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

    if (!tournament || tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const url = new URL(request.url)
    const action = url.searchParams.get('action')

    if (action === 'generate') {
      const roundDateStr = body.roundDate || new Date().toISOString()
      const roundDate = new Date(roundDateStr)
      if (isNaN(roundDate.getTime())) {
        return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 })
      }
      
      const teams = await prisma.tournamentTeam.findMany({
        where: { tournamentId: params.id },
      })

      if (teams.length < 2) {
        return NextResponse.json({ error: 'Se necesitan al menos 2 equipos' }, { status: 400 })
      }

      // Mezclar equipos aleatoriamente (Shuffle)
      const teamIds = teams.map(t => t.teamId).sort(() => Math.random() - 0.5)
      const matches: { homeTeamId: string; awayTeamId: string; roundName: string }[] = []
      
      const n = teamIds.length
      const numRounds = n % 2 === 0 ? n - 1 : n
      const matchType = body.matchType || 'ida'
      
      let rotatingTeams = [...teamIds]
      if (n % 2 === 0) {
        rotatingTeams = [teamIds[0], ...teamIds.slice(1)]
      }
      
      for (let round = 1; round <= numRounds; round++) {
        const roundName = `${round}`
        
        if (n % 2 === 0) {
          for (let i = 0; i < n / 2; i++) {
            const home = rotatingTeams[i]
            const away = rotatingTeams[n - 1 - i]
            if (home && away) {
              matches.push({ homeTeamId: home, awayTeamId: away, roundName })
            }
          }
          
          rotatingTeams = [rotatingTeams[0], rotatingTeams[n - 1], ...rotatingTeams.slice(1, n - 1)]
        } else {
          for (let i = 0; i < (n - 1) / 2; i++) {
            const home = rotatingTeams[i]
            const away = rotatingTeams[n - 2 - i]
            if (home && away) {
              matches.push({ homeTeamId: home, awayTeamId: away, roundName })
            }
          }
          
          rotatingTeams = [rotatingTeams[0], rotatingTeams[n - 1], ...rotatingTeams.slice(1, n - 1)]
        }
      }
      
      if (matchType === 'idayvuelta') {
        rotatingTeams = [...teamIds]
        if (n % 2 === 0) {
          rotatingTeams = [teamIds[0], ...teamIds.slice(1)]
        }
        
        for (let round = 1; round <= numRounds; round++) {
          const roundName = `${round + numRounds}`
          
          if (n % 2 === 0) {
            for (let i = 0; i < n / 2; i++) {
              const home = rotatingTeams[n - 1 - i]
              const away = rotatingTeams[i]
              if (home && away) {
                matches.push({ homeTeamId: home, awayTeamId: away, roundName })
              }
            }
            
            rotatingTeams = [rotatingTeams[0], rotatingTeams[n - 1], ...rotatingTeams.slice(1, n - 1)]
          } else {
            for (let i = 0; i < (n - 1) / 2; i++) {
              const home = rotatingTeams[n - 2 - i]
              const away = rotatingTeams[i]
              if (home && away) {
                matches.push({ homeTeamId: home, awayTeamId: away, roundName })
              }
            }
            
            rotatingTeams = [rotatingTeams[0], rotatingTeams[n - 1], ...rotatingTeams.slice(1, n - 1)]
          }
        }
      }

      try {
        let count = 0
        for (const m of matches) {
          await prisma.match.create({
            data: {
              tournamentId: params.id,
              homeTeamId: m.homeTeamId,
              awayTeamId: m.awayTeamId,
              matchDate: roundDate,
              roundName: String(m.roundName),
              phaseName: body.phaseName || 'Primera Fase',
              status: 'SCHEDULED',
            },
          })
          count++
        }

        return NextResponse.json({ count }, { status: 201 })
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
        
        let createdCount = 0
        for (let i = 0; i < numMatches; i++) {
          await prisma.match.create({
            data: {
              tournamentId: params.id,
              homeTeamId: '', // Placeholder or empty
              awayTeamId: '', // Placeholder or empty
              matchDate: roundDate,
              roundName: stageName,
              phaseName: phaseName || 'Fase Final',
              status: 'SCHEDULED',
            },
          })
          createdCount++
        }
        return NextResponse.json({ count: createdCount }, { status: 201 })
      } catch (error) {
        console.error('Generate playoff error:', error)
        return NextResponse.json({ error: 'Error al generar eliminatoria' }, { status: 500 })
      }
    } else if (action === 'generateAdvantagePlayoff') {
      try {
        const matches = await prisma.match.findMany({
          where: { tournamentId: params.id, status: 'COMPLETED' },
        })

        const tournamentTeams = await prisma.tournamentTeam.findMany({
          where: { tournamentId: params.id },
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
              homeTeamId: top4[i].teamId,
              awayTeamId: shuffledNext4[i].teamId,
              matchDate: roundDate,
              roundName: 'Cuartos',
              phaseName: body.phaseName || 'Fase Final',
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
        const cuartosMatches = await prisma.match.findMany({
          where: { tournamentId: params.id, roundName: 'Cuartos', phaseName },
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
            // Empate
            if (m.advantageTeamId) {
              winners.push(m.advantageTeamId)
            } else {
              return NextResponse.json({ error: 'Hubo un empate sin ventaja deportiva asignada. Debe definir un ganador editando el resultado.' }, { status: 400 })
            }
          }
        }

        // Eliminar Semifinales existentes si las hubiera
        await prisma.match.deleteMany({
          where: { tournamentId: params.id, roundName: 'Semi Final', phaseName }
        })

        const roundDate = new Date()
        
        // Crear 2 partidos de semifinales
        await prisma.match.create({
          data: {
            tournamentId: params.id,
            homeTeamId: winners[0],
            awayTeamId: winners[1],
            matchDate: roundDate,
            roundName: 'Semi Final',
            phaseName,
            status: 'SCHEDULED'
          }
        })
        await prisma.match.create({
          data: {
            tournamentId: params.id,
            homeTeamId: winners[2],
            awayTeamId: winners[3],
            matchDate: roundDate,
            roundName: 'Semi Final',
            phaseName,
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
        const { teamIds, phaseName, matchType, selectionMode, generationMode } = body
        const count = teamIds ? teamIds.length : 0
        
        // Determinar ronda inicial
        let startRound = ''
        let roundsToCreate: string[] = []
        if (count <= 2) { startRound = 'Final'; roundsToCreate = ['Final'] }
        else if (count <= 4) { startRound = 'Semifinal'; roundsToCreate = ['Semifinal', 'Final'] }
        else if (count <= 8) { startRound = 'Cuartos de final'; roundsToCreate = ['Cuartos de final', 'Semifinal', 'Final'] }
        else if (count <= 16) { startRound = 'Octavos de final'; roundsToCreate = ['Octavos de final', 'Cuartos de final', 'Semifinal', 'Final'] }
        else { startRound = 'Eliminatoria'; roundsToCreate = ['Eliminatoria', 'Octavos de final', 'Cuartos de final', 'Semifinal', 'Final'] }

        // Limpiar partidos existentes en esta fase
        await prisma.match.deleteMany({
          where: { tournamentId: params.id, phaseName }
        })

        const roundDate = new Date()
        const isIdaVuelta = matchType === 'idayvuelta'

        // 1. Generar Primera Ronda (con equipos o vacía)
        const numMatches = Math.floor(count / 2)
        for (let i = 0; i < numMatches; i++) {
          const homeId = teamIds ? teamIds[i * 2] : null
          const awayId = teamIds ? teamIds[i * 2 + 1] : null
          
          const matchData = {
            tournamentId: params.id,
            homeTeamId: homeId,
            awayTeamId: awayId,
            matchDate: roundDate,
            roundName: startRound,
            groupName: `#${i + 1}`,
            phaseName,
            status: 'SCHEDULED',
            advantageTeamId: (selectionMode === 'clasificacion' && homeId) ? homeId : null,
          }

          await prisma.match.create({ data: matchData })
          if (isIdaVuelta) {
            await prisma.match.create({ 
              data: { ...matchData, homeTeamId: awayId, awayTeamId: homeId, advantageTeamId: null, notes: 'Partido de vuelta' } 
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
            await prisma.match.create({
              data: {
                tournamentId: params.id,
                homeTeamId: null,
                awayTeamId: null,
                matchDate: roundDate,
                roundName: rName,
                groupName: `#${i + 1}`,
                homePlaceholder: `Ganador ${prevRoundName} #${i * 2 + 1}`,
                awayPlaceholder: `Ganador ${prevRoundName} #${i * 2 + 2}`,
                phaseName,
                status: 'SCHEDULED'
              }
            })
          }
        }

        return NextResponse.json({ message: 'Árbol eliminatorio generado con éxito' }, { status: 201 })
      } catch (error) {
        console.error('Generate knockout tree error:', error)
        return NextResponse.json({ error: 'Error al generar el árbol' }, { status: 500 })
      }
    } else if (action === 'generateFinal') {
      try {
        const phaseName = body.phaseName || 'Fase Final'
        const semiMatches = await prisma.match.findMany({
          where: { tournamentId: params.id, roundName: 'Semi Final', phaseName },
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
          where: { tournamentId: params.id, roundName: 'Final', phaseName }
        })

        const roundDate = new Date()
        
        await prisma.match.create({
          data: {
            tournamentId: params.id,
            homeTeamId: winners[0],
            awayTeamId: winners[1],
            matchDate: roundDate,
            roundName: 'Final',
            phaseName,
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
    
    const match = await prisma.match.create({
      data: {
        tournamentId: params.id,
        homeTeamId: validated.homeTeamId,
        awayTeamId: validated.awayTeamId,
        matchDate: validated.matchDate,
        roundName: validated.roundName || '1ª Fecha',
        phaseName: validated.phaseName || 'Primera Fase',
        status: 'SCHEDULED',
        advantageTeamId: validated.advantageTeamId,
      },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
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