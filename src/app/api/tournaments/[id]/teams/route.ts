import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const teamSchema = z.object({
  teamId: z.string(),
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
    const teams = await prisma.tournamentTeam.findMany({
      where: { tournamentId: params.id },
      include: {
        team: true,
      },
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Get tournament teams error:', error)
    return NextResponse.json({ error: 'Error al obtener equipos' }, { status: 500 })
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
    const validated = teamSchema.parse(body)

    const existing = await prisma.tournamentTeam.findFirst({
      where: { tournamentId: params.id, teamId: validated.teamId },
    })

    if (existing) {
      return NextResponse.json({ error: 'El equipo ya está registrado' }, { status: 400 })
    }

    const tournamentTeam = await prisma.tournamentTeam.create({
      data: {
        tournamentId: params.id,
        teamId: validated.teamId,
      },
      include: {
        team: true,
      },
    })

    return NextResponse.json(tournamentTeam, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Add team error:', error)
    return NextResponse.json({ error: 'Error al agregar equipo' }, { status: 500 })
  }
}