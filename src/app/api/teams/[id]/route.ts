import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import { z } from 'zod'

const updateTeamSchema = z.object({
  name: z.string().min(2),
  logo: z.string().optional(),
  color: z.string().optional(),
})

function getAuthToken(request: NextRequest): string | null {
  return request.headers.get('authorization')?.replace('Bearer ', '') || null
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
    const validated = updateTeamSchema.parse(body)

    const existingTeam = await prisma.team.findUnique({
      where: { id: params.id },
    })

    if (!existingTeam || existingTeam.managerId !== payload.userId) {
      return NextResponse.json({ error: 'Equipo no encontrado o no tienes permisos' }, { status: 404 })
    }

    const team = await prisma.team.update({
      where: { id: params.id },
      data: validated,
    })

    return NextResponse.json(team)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 })
    }
    console.error('Update team error:', error)
    return NextResponse.json({ error: 'Error al actualizar equipo' }, { status: 500 })
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
    const existingTeam = await prisma.team.findUnique({
      where: { id: params.id },
    })

    if (!existingTeam || existingTeam.managerId !== payload.userId) {
      return NextResponse.json({ error: 'Equipo no encontrado o no tienes permisos' }, { status: 404 })
    }

    await prisma.team.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete team error:', error)
    return NextResponse.json({ error: 'Error al eliminar equipo' }, { status: 500 })
  }
}