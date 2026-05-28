import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function PUT(request: NextRequest) {
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
    const { memberId, name, role, number, phone, isActive } = body

    if (!memberId || !name) {
      return NextResponse.json({ error: 'memberId y name requeridos' }, { status: 400 })
    }

    const memberExists = await prisma.teamMember.findUnique({
      where: { id: memberId },
    })

    if (memberExists) {
      const member = await prisma.teamMember.update({
        where: { id: memberId },
        data: {
          name,
          role: role || 'PLAYER',
          number: number || null,
          phone: phone || null,
          isActive: isActive !== undefined ? isActive : true,
        },
      })
      return NextResponse.json(member)
    } else {
      // Es una relación global TeamPlayer
      const teamPlayer = await prisma.teamPlayer.update({
        where: { id: memberId },
        data: {
          number: number || null,
          isActive: isActive !== undefined ? isActive : true,
        },
        include: {
          player: {
            include: { user: true },
          },
        },
      })

      // Actualizar el nombre global del usuario
      await prisma.user.update({
        where: { id: teamPlayer.player.userId },
        data: { name },
      })

      const formatted = {
        id: teamPlayer.id,
        teamId: teamPlayer.teamId,
        name: name,
        role: 'PLAYER',
        number: teamPlayer.number || null,
        phone: teamPlayer.player.user.phone || null,
        isActive: teamPlayer.isActive,
        isGlobal: true,
      }

      return NextResponse.json(formatted)
    }
  } catch (error) {
    console.error('Update member error:', error)
    return NextResponse.json({ error: 'Error al actualizar miembro' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get('memberId')

  if (!memberId) {
    return NextResponse.json({ error: 'memberId requerido' }, { status: 400 })
  }

  try {
    const memberExists = await prisma.teamMember.findUnique({
      where: { id: memberId },
    })

    if (memberExists) {
      await prisma.teamMember.delete({
        where: { id: memberId },
      })
    } else {
      // Elimina el enlace TeamPlayer (remueve el jugador global de este plantel de equipo)
      await prisma.teamPlayer.delete({
        where: { id: memberId },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete member error:', error)
    return NextResponse.json({ error: 'Error al eliminar miembro' }, { status: 500 })
  }
}