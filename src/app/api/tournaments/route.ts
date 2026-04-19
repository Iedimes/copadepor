import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const tournamentSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  sportType: z.enum([
    'FUTBOL_11', 'FUTSAL', 'FUTBOL_7', 'FUTBOL_SALA',
    'BALONMANO', 'BALONCESTO', 'VOLEY', 'VOLEY_PLAYA',
    'TENIS_MESA', 'TENIS', 'BEACH_TENNIS', 'AJEDREZ',
    'ATLETISMO', 'DEPORTE_GENERICO', 'DISPAROS',
    'BATTLE_ROYALE', 'MOBA_LOL', 'MOBA_DOTA'
  ]).default('FUTBOL_11'),
  format: z.string().default('todos_contra_todos'),
  startDate: z.string().transform((s) => new Date(s)),
  endDate: z.string().transform((s) => new Date(s)),
  registrationEnd: z.string().transform((s) => new Date(s)).optional(),
  maxTeams: z.number().default(16),
  minPlayers: z.number().default(7),
  maxPlayersPerTeam: z.number().default(22),
  categories: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
  })).optional(),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const sportType = searchParams.get('sportType')
  const organizerId = searchParams.get('organizerId')

  const where: Record<string, unknown> = {}
  if (status) where.status = status
  if (sportType) where.sportType = sportType
  if (organizerId) where.organizerId = organizerId

  const tournaments = await prisma.tournament.findMany({
    where,
    include: {
      organizer: { select: { id: true, name: true } },
      categories: true,
      _count: { select: { teams: true, matches: true } },
    },
    orderBy: { startDate: 'desc' },
  })

  return NextResponse.json(tournaments)
}

export async function POST(request: NextRequest) {
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
    const validated = tournamentSchema.parse(body)
    
    const { categories, ...tournamentData } = validated

    const tournament = await prisma.tournament.create({
      data: {
        ...tournamentData,
        organizerId: payload.userId,
        categories: categories ? {
          create: categories
        } : undefined,
      },
      include: {
        organizer: { select: { id: true, name: true } },
        categories: true,
      },
    })

    return NextResponse.json(tournament, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create tournament error:', error)
    return NextResponse.json({ error: 'Error al crear torneo' }, { status: 500 })
  }
}