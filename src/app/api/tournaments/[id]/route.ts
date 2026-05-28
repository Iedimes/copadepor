import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const payload = verifyToken(token)
  if (!payload) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 })
  }

  try {
    console.log('Getting tournament:', params.id)
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: {
        organizer: { select: { id: true, name: true } },
      },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
    }

    return NextResponse.json(tournament)
  } catch (error) {
    console.error('Get tournament error:', error)
    return NextResponse.json({ error: 'Error al obtener torneo: ' + (error as Error).message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
    })

    if (!tournament || tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    const body = await request.json()
    const updated = await prisma.tournament.update({
      where: { id: params.id },
      data: body,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Update tournament error:', error)
    return NextResponse.json({ error: 'Error al actualizar torneo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const token = getAuthToken(request)
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const payload = verifyToken(token)
  if (!payload) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  try {
    const tournament = await prisma.tournament.findUnique({
      where: { id: params.id },
      include: {
        _count: {
          select: {
            teams: true,
            matches: true,
            categories: true,
            phases: true,
            sponsors: true,
            news: true,
          },
        },
      },
    })

    if (!tournament) {
      return NextResponse.json({ error: 'Torneo no encontrado' }, { status: 404 })
    }

    if (tournament.organizerId !== payload.userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }

    // Check if tournament has any related data
    const { _count } = tournament
    const hasData = _count.teams > 0 || _count.matches > 0 || _count.categories > 0 || _count.phases > 0

    // If tournament has data and force is not set, return confirmation needed
    const { searchParams } = new URL(request.url)
    const force = searchParams.get('force') === 'true'

    if (hasData && !force) {
      return NextResponse.json({
        error: 'CONFIRM_DELETE',
        message: 'Este torneo tiene datos asociados',
        details: {
          teams: _count.teams,
          matches: _count.matches,
          categories: _count.categories,
          phases: _count.phases,
          sponsors: _count.sponsors,
          news: _count.news,
        },
      }, { status: 409 })
    }

    // Nullify message references before deleting (Message doesn't have onDelete: Cascade)
    await prisma.message.updateMany({
      where: { tournamentId: params.id },
      data: { tournamentId: null },
    })

    // Delete the tournament (cascades will handle the rest)
    await prisma.tournament.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete tournament error:', error)
    return NextResponse.json({ error: 'Error al eliminar torneo: ' + (error as Error).message }, { status: 500 })
  }
}