import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const token = getAuthToken(request)
  
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    // Verificar que el equipo existe y pertenece al usuario
    const team = await prisma.team.findUnique({
      where: { id },
      include: {
        manager: { select: { id: true } },
        members: {
          include: {
            player: {
              include: {
                user: { select: { id: true, name: true, avatar: true, phone: true } }
              }
            }
          }
        }
      }
    })

    if (!team) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    if (team.managerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    return NextResponse.json(team.members)
  } catch (error) {
    console.error('Get team members error:', error)
    return NextResponse.json({ error: 'Error al obtener miembros' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    const { playerId } = body

    // Verificar que el equipo existe y pertenece al usuario
    const team = await prisma.team.findUnique({
      where: { id }
    })

    if (!team) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    if (team.managerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Agregar jugador al equipo
    const member = await prisma.teamMember.create({
      data: {
        teamId: id,
        playerId,
        role: 'PLAYER'
      },
      include: {
        player: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    console.error('Add team member error:', error)
    return NextResponse.json({ error: 'Error al agregar miembro' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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
    const { memberId } = body

    // Verificar que el equipo existe
    const team = await prisma.team.findUnique({
      where: { id }
    })

    if (!team) {
      return NextResponse.json({ error: 'Equipo no encontrado' }, { status: 404 })
    }

    // Eliminar miembro
    await prisma.teamMember.delete({
      where: { id: memberId }
    })

    return NextResponse.json({ message: 'Miembro eliminado' })
  } catch (error) {
    console.error('Delete team member error:', error)
    return NextResponse.json({ error: 'Error al eliminar miembro' }, { status: 500 })
  }
}