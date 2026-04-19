import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const simplePlayerSchema = z.object({
  name: z.string().min(2),
})

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const players = await prisma.playerProfile.findMany({
    select: {
      id: true,
      user: { select: { name: true } },
    },
  })

  return NextResponse.json(players.map(p => ({ id: p.id, name: p.user.name })))
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
    const validated = simplePlayerSchema.parse(body)

    const randomId = crypto.randomUUID()
    console.log('Creating player with name:', validated.name)
    
    const user = await prisma.user.create({
      data: {
        email: `player_${randomId}@copadepor.local`,
        password: 'placeholder',
        name: validated.name,
        role: 'PLAYER',
      },
    }).catch((e) => {
      console.error('User create error:', e.message)
      throw e
    })
    console.log('User created:', user.id)

    const playerProfile = await prisma.playerProfile.create({
      data: {
        userId: user.id,
        dni: `DNI_${randomId}`,
        dateOfBirth: new Date('2000-01-01'),
      },
    }).catch((e) => {
      console.error('PlayerProfile create error:', e.message)
      throw e
    })
    console.log('PlayerProfile created:', playerProfile.id)

    return NextResponse.json({ id: playerProfile.id, name: validated.name }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Create player error:', error)
    const message = error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json({ error: 'Error al crear jugador: ' + message }, { status: 500 })
  }
}