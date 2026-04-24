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
      },
    })

    if (!match) {
      return NextResponse.json({ error: 'Partido no encontrado' }, { status: 404 })
    }

    return NextResponse.json(match)
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
    const { homeScore, awayScore, location, referee, matchDate, status } = body

    const match = await prisma.match.update({
      where: { id: matchId },
      data: {
        ...(homeScore !== undefined && { homeScore: homeScore === null ? null : homeScore }),
        ...(awayScore !== undefined && { awayScore: awayScore === null ? null : awayScore }),
        ...(location !== undefined && { location }),
        ...(referee !== undefined && { referee }),
        ...(matchDate !== undefined && { matchDate: new Date(matchDate) }),
        ...(status !== undefined && { status }),
      },
    })

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
