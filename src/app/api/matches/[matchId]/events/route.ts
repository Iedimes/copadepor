import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params
  const token = getAuthToken(request)
  
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { eventType, playerId, teamSide, minute, description } = body

    // Verificar que el partido existe
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        homeTeam: { select: { id: true, managerId: true } },
        awayTeam: { select: { id: true, managerId: true } },
        tournament: { select: { id: true } }
      }
    })

    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    // Verificar que el usuario sea manager de algún equipo del partido
    const isHomeManager = match.homeTeam.managerId === payload.userId
    const isAwayManager = match.awayTeam.managerId === payload.userId
    
    if (!isHomeManager && !isAwayManager) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Determinar el teamId según el lado del campo
    const teamId = teamSide === 'home' ? match.homeTeamId : match.awayTeamId

    // Crear el evento del partido
    const matchEvent = await prisma.matchEvent.create({
      data: {
        matchId,
        teamId,
        playerId: playerId || null,
        eventType,
        minute: minute ? parseInt(minute) : null,
        description: description || null
      },
      include: {
        player: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    })

    // Actualizar el marcador si es gol
    if (eventType === 'goal') {
      if (teamSide === 'home') {
        await prisma.match.update({
          where: { id: matchId },
          data: { homeScore: { increment: 1 } }
        })
      } else {
        await prisma.match.update({
          where: { id: matchId },
          data: { awayScore: { increment: 1 } }
        })
      }
    }

    return NextResponse.json(matchEvent, { status: 201 })
  } catch (error) {
    console.error('Create match event error:', error)
    return NextResponse.json({ error: 'Error al registrar evento' }, { status: 500 })
  }
}