import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

function getAuthToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization')
  return authHeader?.replace('Bearer ', '') || null
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string, phaseId: string } }) {
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

    const phase = await prisma.phase.findUnique({
      where: { id: params.phaseId }
    })

    if (!phase) {
      return NextResponse.json({ error: 'Fase no encontrada' }, { status: 404 })
    }

    // Delete matches of this phase first
    await prisma.match.deleteMany({
      where: { tournamentId: params.id, phaseName: phase.name }
    })

    // Delete the phase
    await prisma.phase.delete({
      where: { id: params.phaseId }
    })

    return NextResponse.json({ message: 'Fase eliminada con éxito' })
  } catch (error) {
    console.error('Delete phase error:', error)
    return NextResponse.json({ error: 'Error al eliminar fase' }, { status: 500 })
  }
}
