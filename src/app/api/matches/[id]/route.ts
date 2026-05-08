import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const matchId = params.id

  try {
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        tournament: { select: { id: true, name: true } },
        events: true,
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    // Map database status to frontend strings
    const statusMap: Record<string, string> = {
      'SCHEDULED': 'NO_REALIZADO',
      'IN_PROGRESS': 'EN_VIVO',
      'COMPLETED': 'FINALIZADO'
    }
    const responseData = {
      ...match,
      status: statusMap[match.status] || match.status
    }

    return NextResponse.json(responseData)
  } catch (error) {
    console.error('Get match error:', error)
    return NextResponse.json({ error: 'Error al obtener partido' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const matchId = params.id

  try {
    const body = await request.json()
    const { homeScore, awayScore, homePenaltyScore, awayPenaltyScore, advancingTeamId, location, referee, matchDate, status, events } = body

    // Map frontend status to database enum
    const statusMap: Record<string, string> = {
      'NO_REALIZADO': 'SCHEDULED',
      'EN_VIVO': 'IN_PROGRESS',
      'FINALIZADO': 'COMPLETED'
    }
    const dbStatus = statusMap[status] || status

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        ...(homeScore !== undefined && { homeScore: homeScore === null ? null : homeScore }),
        ...(awayScore !== undefined && { awayScore: awayScore === null ? null : awayScore }),
        ...(homePenaltyScore !== undefined && { homePenaltyScore: homePenaltyScore === null ? null : homePenaltyScore }),
        ...(awayPenaltyScore !== undefined && { awayPenaltyScore: awayPenaltyScore === null ? null : awayPenaltyScore }),
        ...(location !== undefined && { location }),
        ...(referee !== undefined && { referee }),
        ...(matchDate !== undefined && { matchDate: new Date(matchDate) }),
        ...(status !== undefined && { status: dbStatus }),
      },
    })

    if (dbStatus === 'COMPLETED' && advancingTeamId) {
      const matchLabel = `${match.roundName} ${match.groupName}`
      
      const nextMatchHome = await prisma.match.findFirst({
         where: { tournamentId: match.tournamentId, phaseName: match.phaseName, homePlaceholder: matchLabel }
      })
      if (nextMatchHome) {
         await prisma.match.update({ where: { id: nextMatchHome.id }, data: { homeTeamId: advancingTeamId } })
      }
      
      const nextMatchAway = await prisma.match.findFirst({
         where: { tournamentId: match.tournamentId, phaseName: match.phaseName, awayPlaceholder: matchLabel }
      })
      if (nextMatchAway) {
         await prisma.match.update({ where: { id: nextMatchAway.id }, data: { awayTeamId: advancingTeamId } })
      }
    }

    if (events && Array.isArray(events)) {
      await prisma.matchEvent.deleteMany({
        where: { matchId }
      })
      await prisma.goal.deleteMany({
        where: { matchId }
      })
      await prisma.matchReport.deleteMany({
        where: { matchId }
      })

      if (events.length > 0) {
        await prisma.matchEvent.createMany({
          data: events.map((e: any) => {
            // Handle minutes correctly even if it's 0
            const eventMinute = e.minute !== undefined ? e.minute : (e.minutes !== undefined ? e.minutes : null);
            const eventSecond = e.second !== undefined ? e.second : (e.seconds !== undefined ? e.seconds : null);
            
            return {
              matchId,
              teamId: e.teamId,
              playerId: (e.playerId || e.scorerId) ? (e.playerId || e.scorerId) : null,
              assistId: e.assistId ? e.assistId : null,
              type: e.type,
              timeType: e.timeType || null,
              minute: eventMinute !== null ? Number(eventMinute) : null,
              second: eventSecond !== null ? Number(eventSecond) : null,
              detail: e.detail || null,
            };
          })
        })
      }
    }

    return NextResponse.json(match)
  } catch (error) {
    console.error('Update match error:', error)
    return NextResponse.json({ error: 'Error al actualizar partido' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || null
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const matchId = params.id

  try {
    await prisma.match.delete({
      where: { id: matchId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete match error:', error)
    return NextResponse.json({ error: 'Error al eliminar partido' }, { status: 500 })
  }
}
