import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updatePlayerSchema = z.object({
  name: z.string().min(2),
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
    const body = await request.json()
    const validated = updatePlayerSchema.parse(body)

    const player = await prisma.playerProfile.findUnique({
      where: { id: params.id },
    })

    if (!player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }

    await prisma.user.update({
      where: { id: player.userId },
      data: { name: validated.name },
    })

    return NextResponse.json({ id: params.id, name: validated.name })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update player error:', error)
    return NextResponse.json({ error: 'Error al actualizar jugador' }, { status: 500 })
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
    const player = await prisma.playerProfile.findUnique({
      where: { id: params.id },
    })

    if (!player) {
      return NextResponse.json({ error: 'Jugador no encontrado' }, { status: 404 })
    }

    await prisma.playerProfile.delete({
      where: { id: params.id },
    })

    await prisma.user.delete({
      where: { id: player.userId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete player error:', error)
    return NextResponse.json({ error: 'Error al eliminar jugador' }, { status: 500 })
  }
}