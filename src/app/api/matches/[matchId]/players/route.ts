import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(
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
    // Verificar que el partido existe
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        tournament: { select: { id: true } },
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } }
      }
    })

    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    // Obtener jugadores de ambos equipos
    const homePlayers = await prisma.teamPlayer.findMany({
      where: { teamId: match.homeTeamId },
      include: { player: { include: { user: { select: { id: true, name: true } } } } }
    })

    const awayPlayers = await prisma.teamPlayer.findMany({
      where: { teamId: match.awayTeamId },
      include: { player: { include: { user: { select: { id: true, name: true } } } } }
    })

    const players = [
      ...homePlayers.map(p => ({ ...p, teamSide: 'home' })),
      ...awayPlayers.map(p => ({ ...p, teamSide: 'away' }))
    ]

    return NextResponse.json(players)
  } catch (error) {
    console.error('Get players error:', error)
    return NextResponse.json({ error: 'Error al obtener jugadores' }, { status: 500 })
  }
}