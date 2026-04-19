import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const matchSchema = z.object({
  tournamentId: z.string(),
  categoryId: z.string().optional(),
  roundId: z.string().optional(),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  matchDate: z.string().transform((s) => new Date(s)),
  location: z.string().optional(),
  referee: z.string().optional(),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tournamentId = searchParams.get('tournamentId')
  const categoryId = searchParams.get('categoryId')
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (tournamentId) where.tournamentId = tournamentId
  if (categoryId) where.categoryId = categoryId
  if (status) where.status = status

  const matches = await prisma.match.findMany({
    where,
    include: {
      homeTeam: { select: { id: true, name: true, logo: true } },
      awayTeam: { select: { id: true, name: true, logo: true } },
      tournament: { select: { id: true, name: true, sportType: true } },
      category: { select: { id: true, name: true } },
    },
    orderBy: { matchDate: 'asc' },
  })

  return NextResponse.json(matches)
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
    const validated = matchSchema.parse(body)

    const match = await prisma.match.create({
      data: validated,
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