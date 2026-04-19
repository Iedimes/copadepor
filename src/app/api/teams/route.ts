import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const teamSchema = z.object({
  name: z.string().min(2),
  logo: z.string().optional(),
  color: z.string().optional(),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const managerId = searchParams.get('managerId')
  const tournamentId = searchParams.get('tournamentId')

  const where: Record<string, unknown> = {}
  if (managerId) where.managerId = managerId
  if (tournamentId) {
    where.tournaments = { some: { tournamentId } }
  }

  const teams = await prisma.team.findMany({
    where,
    include: {
      manager: { select: { id: true, name: true } },
      players: { include: { player: true } },
    },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(teams)
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
    const validated = teamSchema.parse(body)

    const team = await prisma.team.create({
      data: {
        ...validated,
        managerId: payload.userId,
      },
      include: {
        manager: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(team, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create team error:', error)
    return NextResponse.json({ error: 'Error al crear equipo' }, { status: 500 })
  }
}