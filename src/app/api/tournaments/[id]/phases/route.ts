import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  try {
    const phases = await prisma.phase.findMany({
      where: { tournamentId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    // If there are no phases, let's auto-create "Primera Fase" so it matches old behavior
    if (phases.length === 0) {
      const defaultPhase = await prisma.phase.create({
        data: {
          tournamentId: params.id,
          name: 'Primera Fase',
          type: 'LIGA',
          isClassification: true,
        }
      })
      return NextResponse.json([defaultPhase])
    }

    return NextResponse.json(phases)
  } catch (error) {
    console.error('Get phases error:', error)
    return NextResponse.json({ error: 'Error al obtener fases' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    
    const phase = await prisma.phase.create({
      data: {
        tournamentId: params.id,
        name: body.name,
        type: body.type || 'LIGA',
        isClassification: body.isClassification !== undefined ? body.isClassification : true,
        continueFromId: body.continueFromId || null,
        teams: body.teams ? JSON.stringify(body.teams) : null,
      }
    })

    return NextResponse.json(phase, { status: 201 })
  } catch (error) {
    console.error('Create phase error:', error)
    return NextResponse.json({ error: 'Error al crear fase' }, { status: 500 })
  }
}
