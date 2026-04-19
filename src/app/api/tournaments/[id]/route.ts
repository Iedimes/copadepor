import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updateTournamentSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  sportType: z.enum([
    'FUTBOL_11', 'FUTSAL', 'FUTBOL_7', 'FUTBOL_SALA',
    'BALONMANO', 'BALONCESTO', 'VOLEY', 'VOLEY_PLAYA',
    'TENIS_MESA', 'TENIS', 'BEACH_TENNIS', 'AJEDREZ',
    'ATLETISMO', 'DEPORTE_GENERICO', 'DISPAROS',
    'BATTLE_ROYALE', 'MOBA_LOL', 'MOBA_DOTA'
  ]).optional(),
  format: z.string().optional(),
  startDate: z.string().transform((s) => new Date(s)).optional(),
  endDate: z.string().transform((s) => new Date(s)).optional(),
  registrationEnd: z.string().transform((s) => new Date(s)).optional(),
  maxTeams: z.number().optional(),
  minPlayers: z.number().optional(),
  maxPlayersPerTeam: z.number().optional(),
  status: z.enum(['DRAFT', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    const existingTournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!existingTournament || existingTournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'Torneo no encontrado o no tienes permisos' }, { status: 404 })
    }

    const body = await request.json()
    const validated = updateTournamentSchema.parse(body)

    const tournament = await prisma.tournament.update({
      where: { id: params.id },
      data: validated,
      include: {
        organizer: { select: { id: true, name: true } },
        categories: true,
      },
    })

    return NextResponse.json(tournament)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update tournament error:', error)
    return NextResponse.json({ error: 'Error al actualizar torneo' }, { status: 500 })
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
    const existingTournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!existingTournament || existingTournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'Torneo no encontrado o no tienes permisos' }, { status: 404 })
    }

    await prisma.tournament.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete tournament error:', error)
    return NextResponse.json({ error: 'Error al eliminar torneo' }, { status: 500 })
  }
}