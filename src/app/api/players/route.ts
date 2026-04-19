import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const playerSchema = z.object({
  userId: z.string(),
  dni: z.string().min(6),
  dateOfBirth: z.string().transform((s) => new Date(s)),
  nationality: z.string().optional(),
  position: z.string().optional(),
  photo: z.string().optional(),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const teamId = searchParams.get('teamId')
  const dni = searchParams.get('dni')

  const where: Record<string, unknown> = {}
  if (teamId) where.teamPlayers = { some: { teamId } }
  if (dni) where.dni = dni

  const players = await prisma.playerProfile.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      teamPlayers: { include: { team: true } },
    },
  })

  return NextResponse.json(players)
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
    const validated = playerSchema.parse(body)

    const existingDni = await prisma.playerProfile.findUnique({
      where: { dni: validated.dni },
    })

    if (existingDni) {
      return NextResponse.json({ error: 'DNI ya registrado' }, { status: 400 })
    }

    const player = await prisma.playerProfile.create({
      data: validated,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json(player, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create player error:', error)
    return NextResponse.json({ error: 'Error al crear jugador' }, { status: 500 })
  }
}